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
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
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
  updatedAt?: number | string;
}

/**
 * Appends or updates `?v=${version}` on HTTP/HTTPS or relative asset URLs for cache-busting.
 * Leaves empty strings and data:/blob: URLs untouched.
 */
export function appendCacheVersion(url: string, version: string | number): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const cleanVer = encodeURIComponent(String(version));
  // Strip any existing v= query parameter
  const [basePart, queryPart] = trimmed.split('?');
  if (!queryPart) {
    return `${basePart}?v=${cleanVer}`;
  }
  const params = queryPart
    .split('&')
    .filter((p) => p && !p.startsWith('v='));
  params.push(`v=${cleanVer}`);
  return `${basePart}?${params.join('&')}`;
}

/**
 * Applies cache-busting `?v=${version}` to all image URLs in SiteConfigPayload.
 */
export function applyCacheBustingToPayload(
  payload: SiteConfigPayload,
  version: string | number
): SiteConfigPayload {
  const cloned: SiteConfigPayload = JSON.parse(JSON.stringify(payload));
  cloned.updatedAt = version;
  if (cloned.brandLogo) {
    cloned.brandLogo = appendCacheVersion(cloned.brandLogo, version);
  }
  if (Array.isArray(cloned.looks)) {
    cloned.looks.forEach((look) => {
      if (look && typeof look === 'object') {
        if (typeof look.img640 === 'string' && look.img640) {
          look.img640 = appendCacheVersion(look.img640, version);
        }
        if (typeof look.img1080 === 'string' && look.img1080) {
          look.img1080 = appendCacheVersion(look.img1080, version);
        }
        if (Array.isArray(look.specs)) {
          look.specs.forEach((sp: any) => {
            if (sp && typeof sp.thumb === 'string' && sp.thumb) {
              sp.thumb = appendCacheVersion(sp.thumb, version);
            }
          });
        }
      }
    });
  }
  return cloned;
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
 * Reads site_config (id=1) from Supabase with cache: no-store and applies cache-busting ?v=${updatedAt}.
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
      const rawPayload = data.data as SiteConfigPayload;
      const versionTs = data.updated_at
        ? new Date(data.updated_at).getTime() || Date.now()
        : rawPayload.updatedAt || Date.now();
      return applyCacheBustingToPayload(rawPayload, versionTs);
    }

    return null;
  } catch (err) {
    console.warn('Ngoại lệ khi đọc bảng site_config từ Supabase:', err);
    return null;
  }
}

/**
 * Processes all base64 images into public Storage URLs, attaches cache-busting ?v=${updatedAt},
 * and upserts the configuration to site_config (id=1).
 */
export async function saveSiteConfigToSupabase(
  payload: SiteConfigPayload
): Promise<SiteConfigPayload> {
  // 1. Upload any base64 images and replace them with public URLs
  const uploadedPayload = await processAndUploadDataUrls(payload);

  // 2. Apply cache-busting timestamp (?v=${updatedAt}) to all image URLs
  const nowIso = new Date().toISOString();
  const versionTs = new Date(nowIso).getTime();
  const versionedPayload = applyCacheBustingToPayload(uploadedPayload, versionTs);

  // 3. Upsert into site_config (id=1)
  const { error } = await supabase
    .from('site_config')
    .upsert(
      {
        id: 1,
        data: versionedPayload,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(`Lỗi cập nhật bảng site_config: ${error.message}`);
  }

  return versionedPayload;
}
