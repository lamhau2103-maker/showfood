import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://filpclplomjgxiebleml.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ZNjn_Amnklo0L4w3WdM4WA_qwXagNDb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        cache: 'no-store',
      });
    },
  },
});

export interface SiteConfigPayload {
  brandLogo: string;
  looks: any[];
}

/**
 * Converts a data:image/... base64 string into a binary Blob and detects file extension.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const base64Data = parts[1] || '';
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

  let ext = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('svg')) ext = 'svg';
  else if (mimeType.includes('gif')) ext = 'gif';

  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return { blob: new Blob([uint8Array], { type: mimeType }), ext };
}

/**
 * Uploads a base64 image Blob to Supabase Storage bucket 'product-images'
 * with a unique filename and cache-control of 1 year (31536000s),
 * then returns its public CDN URL.
 */
export async function uploadDataUrlToSupabase(dataUrl: string): Promise<string> {
  const { blob, ext } = dataUrlToBlob(dataUrl);
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const fileName = `product_${Date.now()}_${randomSuffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Lỗi tải ảnh lên Supabase Storage: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Không thể lấy public URL từ Supabase Storage');
  }

  return urlData.publicUrl;
}

/**
 * Recursively traverses any data structure (objects, arrays, strings)
 * and replaces any string starting with "data:image" with its uploaded Supabase public URL.
 */
export async function processAndUploadDataUrls<T>(target: T): Promise<T> {
  if (typeof target === 'string') {
    if (target.startsWith('data:image')) {
      const publicUrl = await uploadDataUrlToSupabase(target);
      return publicUrl as unknown as T;
    }
    return target;
  }

  if (Array.isArray(target)) {
    const results = [];
    for (const item of target) {
      results.push(await processAndUploadDataUrls(item));
    }
    return results as unknown as T;
  }

  if (target !== null && typeof target === 'object') {
    const resultObj: Record<string, any> = {};
    for (const key of Object.keys(target as Record<string, any>)) {
      resultObj[key] = await processAndUploadDataUrls((target as Record<string, any>)[key]);
    }
    return resultObj as unknown as T;
  }

  return target;
}

/**
 * Reads site_config (id=1) from Supabase with cache: no-store.
 */
export async function fetchSiteConfigFromSupabase(): Promise<SiteConfigPayload | null> {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('id, data, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Lỗi đọc bảng site_config từ Supabase:', error);
      return null;
    }

    if (data && data.data && typeof data.data === 'object' && Array.isArray(data.data.looks)) {
      return data.data as SiteConfigPayload;
    }

    return null;
  } catch (err) {
    console.warn('Ngoại lệ khi đọc bảng site_config từ Supabase:', err);
    return null;
  }
}

/**
 * Processes all base64 images into public Storage URLs, then upserts the configuration to site_config (id=1).
 */
export async function saveSiteConfigToSupabase(
  payload: SiteConfigPayload
): Promise<SiteConfigPayload> {
  // 1. Upload any base64 images and replace them with public URLs
  const sanitizedPayload = await processAndUploadDataUrls(payload);

  // 2. Upsert into site_config (id=1)
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('site_config')
    .upsert(
      {
        id: 1,
        data: sanitizedPayload,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(`Lỗi cập nhật bảng site_config: ${error.message}`);
  }

  return sanitizedPayload;
}
