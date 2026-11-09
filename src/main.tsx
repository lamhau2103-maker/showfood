/**
 * Feed the Herd. — 3D Runway Product Showcase & Admin CMS
 * Pure Vanilla JS/TS Custom Element (<runway-section>) with 3D Ring Physics,
 * Alpha-Channel Foot Probe, FLIP Lightbox, Interactive Specification Rows & Live Admin CMS.
 *
 * Integrated with Supabase (site_config table & product-images storage bucket)
 */

import {
  supabase,
  fetchSiteConfigFromSupabase,
  saveSiteConfigToSupabase,
  isLegacyTemplateImageUrl,
  SiteConfigPayload,
} from './supabase';

export interface SpecOption {
  label: string;
  variantId: number;
}

export interface BagSpecItem {
  catalogId: string;
  type: string;
  title: string;
  specNote: string;
  tag: string;
  thumb: string;
  thumbW: number;
  thumbH: number;
  legend: string;
  options: SpecOption[];
  link: string;
  pinLeft: number;
  pinTop: number;
}

export interface FeedBagLook {
  index: number;
  key: string;
  code: string;
  name: string;
  img640: string;
  img1080: string;
  offsetY?: number;
  scale?: number;
  pieces: string;
  qualityStd: string;
  specs: [BagSpecItem, BagSpecItem, BagSpecItem];
}

const CMS_STORAGE_KEY = 'runway-feed-cms-v1';
const BRAND_LOGO_KEY = 'runway-brand-logo-v1';
const DEFAULT_BRAND_LOGO = '/assets/brand/thai-viet-logo.png';

export const EMPTY_BAG_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 1138" width="640" height="1138"><rect x="110" y="130" width="420" height="880" rx="28" fill="rgba(255,255,255,0.55)" stroke="rgba(21,20,19,0.18)" stroke-width="3" stroke-dasharray="12 8"/><circle cx="320" cy="510" r="38" fill="rgba(21,20,19,0.05)" stroke="rgba(21,20,19,0.2)" stroke-width="2"/><path d="M320 492v36M302 510h36" stroke="rgba(21,20,19,0.35)" stroke-width="2.5" stroke-linecap="round"/><text x="320" y="585" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="600" fill="rgba(21,20,19,0.48)" letter-spacing="1.5">CHỜ CẬP NHẬT HÌNH ẢNH</text><text x="320" y="614" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="400" fill="rgba(21,20,19,0.35)">Tải ảnh bao bì trong Quản trị</text></svg>`
  );

const CATALOG_TEMPLATES: Record<string, Omit<BagSpecItem, 'tag' | 'pinLeft' | 'pinTop'>> = {
  'spec-target-grower': {
    catalogId: 'spec-target-grower',
    type: 'ĐỐI TƯỢNG VẬT NUÔI | MÃ 414',
    title: 'Đối tượng: Heo choai (15–30 kg)',
    specNote: 'Phát triển khung xương & hoàn thiện hệ tiêu hóa',
    thumb: '',
    thumbW: 400,
    thumbH: 400,
    legend: 'Đường kính viên cám (mm)',
    options: [
      { label: '2.5mm', variantId: 57015167025457 },
      { label: '3.0mm', variantId: 57015167058225 },
      { label: '3.2mm', variantId: 57015167090993 },
      { label: '3.5mm', variantId: 57015167123761 },
      { label: '4.0mm', variantId: 57015167156529 },
      { label: '4.5mm', variantId: 57015167189297 },
      { label: '5.0mm', variantId: 57015167222065 },
    ],
    link: '#',
  },
  'spec-target-finisher': {
    catalogId: 'spec-target-finisher',
    type: 'ĐỐI TƯỢNG VẬT NUÔI | MÃ 415 / 418',
    title: 'Đối tượng: Heo thịt phát triển (30–60 kg)',
    specNote: 'Tỷ lệ nạc cao, thớ thịt săn chắc & mỡ mỏng',
    thumb: '',
    thumbW: 400,
    thumbH: 400,
    legend: 'Đường kính viên cám (mm)',
    options: [
      { label: '2.5mm', variantId: 57015166730545 },
      { label: '3.0mm', variantId: 57015166763313 },
      { label: '3.2mm', variantId: 57015166796081 },
      { label: '3.5mm', variantId: 57015166828849 },
      { label: '4.0mm', variantId: 57015166861617 },
      { label: '4.5mm', variantId: 57015166894385 },
      { label: '5.0mm', variantId: 57015166927153 },
    ],
    link: '#',
  },
  'spec-target-breeder': {
    catalogId: 'spec-target-breeder',
    type: 'ĐỐI TƯỢNG VẬT NUÔI | DÒNG SINH SẢN',
    title: 'Đối tượng: Heo nái sinh sản & Heo con',
    specNote: 'Tăng cường miễn dịch & thể trạng sinh sản tối ưu',
    thumb: '',
    thumbW: 400,
    thumbH: 400,
    legend: 'Đường kính viên cám (mm)',
    options: [
      { label: '2.5mm', variantId: 57015176364337 },
      { label: '3.0mm', variantId: 57015176397105 },
      { label: '3.2mm', variantId: 57015176429873 },
      { label: '3.5mm', variantId: 57015176462641 },
      { label: '4.0mm', variantId: 57015176495409 },
      { label: '4.5mm', variantId: 57015176528177 },
      { label: '5.0mm', variantId: 57015176560945 },
    ],
    link: '#',
  },
  'spec-age-grower': {
    catalogId: 'spec-age-grower',
    type: 'ĐỘ TUỔI & TRỌNG LƯỢNG PHÙ HỢP',
    title: 'Độ tuổi: 45–70 Ngày (Giai đoạn 15–30 kg)',
    specNote: 'FCR mục tiêu: 1.55 – 1.65 · Cho ăn tự do',
    thumb: '',
    thumbW: 400,
    thumbH: 563,
    legend: 'Quy cách đóng bao',
    options: [
      { label: 'Bao PP 25kg', variantId: 56835911582001 },
      { label: 'Bao PP 40kg', variantId: 56835911614769 },
      { label: 'Bao PP 50kg', variantId: 56835911647537 },
      { label: 'Bao Jumbo 1T', variantId: 56835911680305 },
    ],
    link: '#',
  },
  'spec-age-finisher': {
    catalogId: 'spec-age-finisher',
    type: 'ĐỘ TUỔI & TRỌNG LƯỢNG PHÙ HỢP',
    title: 'Độ tuổi: 70–110 Ngày (Giai đoạn 30–60 kg)',
    specNote: 'FCR mục tiêu: 2.05 – 2.15 · Khẩu phần 2.2–2.8 kg/ngày',
    thumb: '',
    thumbW: 400,
    thumbH: 581,
    legend: 'Quy cách đóng bao',
    options: [
      { label: 'Bao PP 25kg', variantId: 56835806396721 },
      { label: 'Bao PP 40kg', variantId: 56835806429489 },
      { label: 'Bao PP 50kg', variantId: 56835806462257 },
      { label: 'Bao Jumbo 1T', variantId: 56835806495025 },
    ],
    link: '#',
  },
  'spec-age-market': {
    catalogId: 'spec-age-market',
    type: 'ĐỘ TUỔI & TRỌNG LƯỢNG PHÙ HỢP',
    title: 'Độ tuổi: Trên 110 Ngày (60kg đến xuất chuồng)',
    specNote: 'FCR mục tiêu: 2.35 – 2.50 · Vỗ béo xuất bán',
    thumb: '',
    thumbW: 400,
    thumbH: 610,
    legend: 'Quy cách đóng bao',
    options: [
      { label: 'Bao PP 25kg', variantId: 56836143743281 },
      { label: 'Bao PP 40kg', variantId: 56836143776049 },
      { label: 'Bao PP 50kg', variantId: 56836143808817 },
      { label: 'Bao Jumbo 1T', variantId: 56836143841585 },
    ],
    link: '#',
  },
  'spec-nutri-high': {
    catalogId: 'spec-nutri-high',
    type: 'CHỈ TIÊU DINH DƯỠNG ĐẢM BẢO',
    title: 'Dinh dưỡng: 17.5%–19.0% Đạm thô · 3.250 kcal ME',
    specNote: 'Lysine ≥ 1.15% · Độ ẩm ≤ 14% · Xơ thô ≤ 5%',
    thumb: '',
    thumbW: 400,
    thumbH: 555,
    legend: 'Công thức Premix vi lượng',
    options: [
      { label: 'Tiêu chuẩn nhà máy', variantId: 56836002185521 },
      { label: 'Bổ sung Axit hữu cơ', variantId: 56836002218289 },
      { label: 'Bổ sung Enzyme tiêu hóa', variantId: 56836002251057 },
      { label: 'Đạt chuẩn xuất khẩu', variantId: 56836002283825 },
    ],
    link: '#',
  },
  'spec-nutri-std': {
    catalogId: 'spec-nutri-std',
    type: 'CHỈ TIÊU DINH DƯỠNG ĐẢM BẢO',
    title: 'Dinh dưỡng: 15.0%–16.5% Đạm thô · 3.150 kcal ME',
    specNote: 'Lysine ≥ 0.95% · Độ ẩm ≤ 14% · Xơ thô ≤ 6%',
    thumb: '',
    thumbW: 400,
    thumbH: 536,
    legend: 'Công thức Premix vi lượng',
    options: [
      { label: 'Tiêu chuẩn nhà máy', variantId: 56836251681073 },
      { label: 'Bổ sung Axit hữu cơ', variantId: 56836251713841 },
      { label: 'Bổ sung Enzyme tiêu hóa', variantId: 56836251746609 },
      { label: 'Đạt chuẩn xuất khẩu', variantId: 56836251779377 },
    ],
    link: '#',
  },
};

function makeSpec(
  id: string,
  pinLeft: number,
  pinTop: number,
  tag = ''
): BagSpecItem {
  const base = CATALOG_TEMPLATES[id] || CATALOG_TEMPLATES['spec-target-grower'];
  return {
    ...base,
    thumb: '',
    options: base.options.map((o) => ({ ...o })),
    tag,
    pinLeft,
    pinTop,
  };
}

/**
 * Checks all products and their 3 specification items ('Chi Tiết Sản Phẩm').
 * Any spec item or product image still referencing the old template domain or shoe/shirt/hoodie sample images
 * is automatically reset to an empty string "".
 */
export function sanitizeLoadedLooks(looks: FeedBagLook[]): FeedBagLook[] {
  if (!Array.isArray(looks)) return [];
  return looks.map((look, idx) => {
    const cleanImg640 = isLegacyTemplateImageUrl(look?.img640) ? '' : String(look.img640 || '').trim();
    const cleanImg1080 = isLegacyTemplateImageUrl(look?.img1080) ? '' : String(look.img1080 || '').trim();
    const rawSpecs = Array.isArray(look?.specs) ? look.specs : [];
    const cleanedSpecs = [0, 1, 2].map((sIdx) => {
      const sp = rawSpecs[sIdx];
      if (!sp || typeof sp !== 'object') {
        const defaultIds = ['spec-target-grower', 'spec-age-grower', 'spec-nutri-high'];
        return makeSpec(defaultIds[sIdx], 48, 28 + sIdx * 30, '');
      }
      const cleanThumb = isLegacyTemplateImageUrl(sp.thumb) ? '' : String(sp.thumb || '').trim();
      return {
        ...sp,
        thumb: cleanThumb,
      };
    }) as [BagSpecItem, BagSpecItem, BagSpecItem];

    return {
      ...look,
      index: typeof look?.index === 'number' ? look.index : idx,
      img640: cleanImg640,
      img1080: cleanImg1080 || cleanImg640,
      specs: cleanedSpecs,
    };
  });
}

export function getDefaultLooks(): FeedBagLook[] {
  return [
    {
      index: 0,
      key: 'bndthK',
      code: '414',
      name: 'Cám 414 — Heo Choai (15–30kg)',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-grower', 47, 27, ''),
        makeSpec('spec-age-grower', 48, 58, ''),
        makeSpec('spec-nutri-high', 45, 96, ''),
      ],
    },
    {
      index: 1,
      key: 'XckgG6',
      code: '415',
      name: 'Cám 415 — Heo Thịt Phát Triển (30–60kg)',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-finisher', 50, 28, ''),
        makeSpec('spec-age-finisher', 48, 58, ''),
        makeSpec('spec-nutri-std', 45, 88, ''),
      ],
    },
    {
      index: 2,
      key: 'rLfAhC',
      code: '418',
      name: 'Cám 418 — Heo Xuất Chuồng (60kg–Bán)',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-finisher', 50, 28, ''),
        makeSpec('spec-age-market', 48, 58, ''),
        makeSpec('spec-nutri-std', 45, 88, ''),
      ],
    },
    {
      index: 3,
      key: 'FKg67q',
      code: '412',
      name: 'Cám 412 — Heo Con Tập Ăn (7–15kg)',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-breeder', 50, 28, ''),
        makeSpec('spec-age-grower', 48, 58, ''),
        makeSpec('spec-nutri-high', 45, 88, ''),
      ],
    },
    {
      index: 4,
      key: '8KREEE',
      code: '416',
      name: 'Cám 416 — Heo Nái Mang Thai',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-breeder', 50, 28, ''),
        makeSpec('spec-age-market', 48, 58, ''),
        makeSpec('spec-nutri-std', 45, 88, ''),
      ],
    },
    {
      index: 5,
      key: 'N3bfm9',
      code: '420',
      name: 'Cám 420 — Heo Nái Nuôi Con & Tiết Sữa',
      img640: '',
      img1080: '',
      offsetY: 0,
      scale: 1,
      pieces: '3 chỉ tiêu',
      qualityStd: 'Đạt Chuẩn ISO 22000',
      specs: [
        makeSpec('spec-target-breeder', 50, 28, ''),
        makeSpec('spec-age-finisher', 48, 58, ''),
        makeSpec('spec-nutri-high', 45, 88, ''),
      ],
    },
  ];
}

export function getInitialFallbackConfig(): { brandLogo: string; looks: FeedBagLook[] } {
  try {
    const raw = localStorage.getItem(CMS_STORAGE_KEY);
    const storedLogo = localStorage.getItem(BRAND_LOGO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return {
          brandLogo: storedLogo || DEFAULT_BRAND_LOGO,
          looks: sanitizeLoadedLooks(parsed),
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    brandLogo: DEFAULT_BRAND_LOGO,
    looks: sanitizeLoadedLooks(getDefaultLooks()),
  };
}

// In-memory active configuration — DO NOT populate with fallback data before Supabase fetch completes!
let activeLooks: FeedBagLook[] = [];
let activeBrandLogo: string = DEFAULT_BRAND_LOGO;
let initialLoadPromise: Promise<{ brandLogo: string; looks: FeedBagLook[] }> | null = null;

export function loadCmsData(): FeedBagLook[] {
  return activeLooks;
}

export function getBrandLogo(): string {
  return activeBrandLogo;
}

export function setBrandLogo(url: string): void {
  activeBrandLogo = url || DEFAULT_BRAND_LOGO;
  const logoEl = document.getElementById('brand-logo-img') as HTMLImageElement | null;
  if (logoEl) logoEl.src = activeBrandLogo;
}

/**
 * Reads site_config (id=1) from Supabase with cache: no-store and applies it to the active UI.
 * Never renders fallback/localStorage data before the server fetch finishes.
 */
export function initAndSyncSupabaseConfig(): Promise<{ brandLogo: string; looks: FeedBagLook[] }> {
  if (initialLoadPromise) return initialLoadPromise;

  initialLoadPromise = (async () => {
    try {
      const remote = await fetchSiteConfigFromSupabase();
      if (remote && Array.isArray(remote.looks) && remote.looks.length > 0) {
        activeBrandLogo = remote.brandLogo || DEFAULT_BRAND_LOGO;
        activeLooks = sanitizeLoadedLooks(remote.looks);
      } else {
        // Only if server table site_config is empty after fetch completes, use migration fallback
        const fallback = getInitialFallbackConfig();
        activeBrandLogo = fallback.brandLogo;
        activeLooks = sanitizeLoadedLooks(fallback.looks);
      }
    } catch (err) {
      console.warn('Không thể nạp cấu hình từ Supabase:', err);
      const fallback = getInitialFallbackConfig();
      activeBrandLogo = fallback.brandLogo;
      activeLooks = sanitizeLoadedLooks(fallback.looks);
    } finally {
      setBrandLogo(activeBrandLogo);
      const rw = document.querySelector('runway-section') as RunwaySection | null;
      rw?.setLoadedData(activeLooks);
    }
    return { brandLogo: activeBrandLogo, looks: activeLooks };
  })();

  return initialLoadPromise;
}

/* Toast Notification Helper */
let toastTimer: number | null = null;
export function showToast(msg: string): void {
  const el = document.getElementById('bag-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2600);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function wrapSym(d: number, period: number): number {
  const r = ((d % period) + period) % period;
  return r > period / 2 ? r - period : r;
}

/* Custom Element <runway-section> */
export class RunwaySection extends HTMLElement {
  public isLoading = true;
  private looks: FeedBagLook[] = [];
  private actorsWrap!: HTMLElement;
  private heroesWrap!: HTMLElement;
  private stageEl!: HTMLElement;
  private stickyEl!: HTMLElement;
  private panelsWrap!: HTMLElement;
  private piecesLabelEl!: HTMLElement | null;
  private liveRegion!: HTMLElement | null;
  private cursorEl!: HTMLElement | null;
  private lbEl!: HTMLElement | null;
  private lbStageEl!: HTMLElement | null;
  private lbKickerEl!: HTMLElement | null;
  private lbTitleEl!: HTMLElement | null;
  private walkLineEl!: HTMLElement | null;

  private bodies: HTMLElement[] = []; // N bodies + N clones
  private heroes: HTMLElement[] = []; // N heroes
  private ticks: HTMLElement[] = []; // N tick buttons
  private panels: HTMLElement[] = []; // N look panels

  private N = 6;
  private M = 12;
  private readonly K = 95;
  private readonly C = 2 * Math.sqrt(95);
  private readonly lag = 0.04;

  private springs: { p: number; v: number }[] = [];
  private targetPos = 0;
  private activeIndex = 0;

  private stageW = 900;
  private stageH = 620;
  private isPhone = false;

  // Autoplay state
  private autoplayEnabled = true;
  private speedMs = 5000;
  private isPausedByUser = false;
  private isHoveredPanel = false;
  private isEngaged = false;
  private isLightboxOpen = false;
  private autoProgress = 0;

  // Pointer drag state
  private isDragging = false;
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragLastX = 0;
  private dragLastT = 0;
  private dragVelX = 0;
  private dragStartTarget = 0;
  private dragMoved = false;

  // Wheel accumulator
  private wheelAcc = 0;
  private wheelResetTimer: number | null = null;

  // Custom cursor lerp state
  private curX = 0;
  private curY = 0;
  private curTx = 0;
  private curTy = 0;
  private curVisible = false;

  // Lightbox FLIP state
  private activeLbHero: HTMLElement | null = null;
  private activeLbFigure: HTMLElement | null = null;

  // RAF loop
  private rafId: number | null = null;
  private lastFrameTime = performance.now();

  connectedCallback(): void {
    this.isLoading = true;
    this.classList.add('is-loading');

    this.speedMs = Number(this.dataset.speed) || 5000;
    this.autoplayEnabled = this.dataset.autoplay !== 'false';

    this.stickyEl = this.querySelector('[data-rw-sticky]') as HTMLElement;
    this.stageEl = this.querySelector('[data-rw-stage]') as HTMLElement;
    this.actorsWrap = this.querySelector('[data-rw-actors]') as HTMLElement;
    this.heroesWrap = this.querySelector('[data-rw-heroes]') as HTMLElement;
    this.panelsWrap = this.querySelector('[data-rw-panels]') as HTMLElement;
    this.piecesLabelEl = this.querySelector('[data-rw-pieces]');
    this.liveRegion = this.querySelector('[data-rw-live]');
    this.cursorEl = this.querySelector('[data-rw-cursor]');
    this.lbEl = this.querySelector('[data-rw-lb]');
    this.lbStageEl = this.querySelector('[data-rw-lb-stage]');
    this.lbKickerEl = this.querySelector('[data-rw-lb-kicker]');
    this.lbTitleEl = this.querySelector('[data-rw-lb-title]');
    this.walkLineEl = this.querySelector('.rw__walk-line');

    // Measure & observe while Skeleton Loading is displayed
    this.measure();
    window.addEventListener('resize', () => this.measure());

    // IntersectionObserver reveal
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(this);

    this.bindInteractions();

    // Fetch latest data from Supabase (cache: no-store) before rendering any product images
    initAndSyncSupabaseConfig().catch((err) => {
      console.warn('Lỗi đồng bộ site_config Supabase:', err);
    });

    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const dt = clamp((now - this.lastFrameTime) / 1000, 0.001, 0.06);
      this.lastFrameTime = now;
      this.stepPhysics(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  disconnectedCallback(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  /**
   * Called once Supabase fetch finishes to exit Skeleton Loading and render products
   */
  public setLoadedData(newLooks: FeedBagLook[]): void {
    this.isLoading = false;
    this.classList.remove('is-loading');
    this.applyCmsChanges(newLooks);
    this.measure();
  }

  /**
   * Public method called by Admin CMS on live save or reset
   */
  public applyCmsChanges(newLooks?: FeedBagLook[]): void {
    this.looks = newLooks ? newLooks : loadCmsData();
    if (this.looks.length === 0) return;
    this.isLoading = false;
    this.classList.remove('is-loading');
    this.N = Math.max(1, this.looks.length);
    this.M = this.N * 2;
    this.activeIndex = clamp(this.activeIndex, 0, this.N - 1);
    this.targetPos = this.activeIndex;
    this.syncStageAndPanelsFromCms();
    this.setIndex(this.activeIndex, false);
  }

  private syncStageAndPanelsFromCms(): void {
    if (this.looks.length === 0) return;
    this.N = Math.max(1, this.looks.length);
    this.M = this.N * 2;

    // 1. Rebuild actors (originals 0..N-1 and clones N..2N-1)
    if (this.actorsWrap) {
      this.actorsWrap.innerHTML = '';
      this.looks.forEach((look, i) => {
        const isFront = i === this.activeIndex;
        const imgSrc640 = look.img640 || EMPTY_BAG_PLACEHOLDER;
        const imgSrc1080 = look.img1080 || look.img640 || EMPTY_BAG_PLACEHOLDER;
        const model = document.createElement('div');
        model.className = `rw__model${isFront ? ' is-front' : ''}`;
        model.dataset.rwModel = '';
        model.dataset.index = String(i);
        model.dataset.lookKey = look.key || `look_${i}`;
        model.style.setProperty('--rw-ar', '0.5625');
        model.style.setProperty('--rw-offset-y', `${look.offsetY ?? 0}%`);
        model.style.setProperty('--rw-scale', `${look.scale ?? 1}`);
        model.innerHTML = `
          <div class="rw__model-inner">
            <span class="rw__ground" aria-hidden="true"></span>
            <img src="${escapeAttr(imgSrc640)}" srcset="${escapeAttr(imgSrc640)} 640w, ${escapeAttr(imgSrc1080)} 1080w" sizes="(min-width: 1800px) 540px, (min-width: 750px) 420px, 320px" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" width="1100" height="1956" draggable="false" data-model-image alt="${escapeAttr(look.name)}">
          </div>
        `;
        this.actorsWrap.appendChild(model);
        const img = model.querySelector('img');
        if (img) this.decodeImage(img);
      });

      this.looks.forEach((look, i) => {
        const imgSrc640 = look.img640 || EMPTY_BAG_PLACEHOLDER;
        const imgSrc1080 = look.img1080 || look.img640 || EMPTY_BAG_PLACEHOLDER;
        const clone = document.createElement('div');
        clone.className = 'rw__model';
        clone.dataset.rwModel = '';
        clone.setAttribute('data-rw-clone', 'true');
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.index = String(i);
        clone.dataset.lookKey = `${look.key || 'look'}_clone`;
        clone.style.setProperty('--rw-ar', '0.5625');
        clone.style.setProperty('--rw-offset-y', `${look.offsetY ?? 0}%`);
        clone.style.setProperty('--rw-scale', `${look.scale ?? 1}`);
        clone.innerHTML = `
          <div class="rw__model-inner">
            <span class="rw__ground" aria-hidden="true"></span>
            <img src="${escapeAttr(imgSrc640)}" srcset="${escapeAttr(imgSrc640)} 640w, ${escapeAttr(imgSrc1080)} 1080w" sizes="(min-width: 1800px) 540px, (min-width: 750px) 420px, 320px" loading="lazy" decoding="async" width="1100" height="1956" draggable="false" data-model-image alt="${escapeAttr(look.name)}">
          </div>
        `;
        this.actorsWrap.appendChild(clone);
        const img = clone.querySelector('img');
        if (img) this.decodeImage(img);
      });

      this.bodies = Array.from(this.actorsWrap.querySelectorAll<HTMLElement>('.rw__model'));
    }

    // 2. Rebuild heroes (0..N-1) with 3 specification pins
    if (this.heroesWrap) {
      this.heroesWrap.innerHTML = '';
      this.looks.forEach((look, i) => {
        const imgSrc640 = look.img640 || EMPTY_BAG_PLACEHOLDER;
        const imgSrc1080 = look.img1080 || look.img640 || EMPTY_BAG_PLACEHOLDER;
        const hero = document.createElement('div');
        hero.className = `rw__hero${i === this.activeIndex ? ' is-active' : ''}`;
        hero.dataset.rwHero = '';
        hero.dataset.index = String(i);
        hero.dataset.name = look.name;
        hero.dataset.probe = look.img640 || '';
        hero.style.setProperty('--rw-ar', '0.5625');
        hero.style.setProperty('--rw-offset-y', `${look.offsetY ?? 0}%`);
        hero.style.setProperty('--rw-scale', `${look.scale ?? 1}`);

        const pinsHtml = look.specs
          .map((sp, pIdx) => {
            const pNum = pIdx + 1;
            return `<button type="button" class="rw__pin" data-rw-pin="${pNum}" data-tip="${escapeAttr(sp.title)}" style="left:${sp.pinLeft}%;top:${sp.pinTop}%;--pin-x:${sp.pinLeft};--pin-y:${sp.pinTop};--pin-i:${pIdx}" aria-label="Chỉ tiêu ${pNum}: ${escapeAttr(sp.title)}"><span class="rw__pin-ring" aria-hidden="true"></span><span class="rw__pin-dot">${pNum}</span></button>`;
          })
          .join('');

        hero.innerHTML = `
          <figure class="rw__figure" data-rw-figure style="--rw-offset-y:${look.offsetY ?? 0}%;--rw-scale:${look.scale ?? 1}">
            <span class="rw__ground" aria-hidden="true"></span>
            <img src="${escapeAttr(imgSrc640)}" srcset="${escapeAttr(imgSrc640)} 640w, ${escapeAttr(imgSrc1080)} 1080w" sizes="(min-width: 1800px) 540px, (min-width: 750px) 420px, 320px" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" width="1100" height="1956" draggable="false" data-model-image alt="${escapeAttr(look.name)}">
            ${pinsHtml}
          </figure>
        `;
        this.heroesWrap.appendChild(hero);
        const img = hero.querySelector('img');
        if (img) this.decodeImage(img);

        // Probe foot
        this.probeFoot(i, look.img640);
      });

      this.heroes = Array.from(this.heroesWrap.querySelectorAll<HTMLElement>('.rw__hero'));
    }

    // 3. Rebuild .rw__ticks buttons
    const ticksWrap = this.querySelector('.rw__ticks') as HTMLElement | null;
    if (ticksWrap) {
      ticksWrap.innerHTML = '';
      this.looks.forEach((look, i) => {
        const isAct = i === this.activeIndex;
        const tick = document.createElement('button');
        tick.type = 'button';
        tick.className = `rw__tick${isAct ? ' is-active' : ''}`;
        tick.setAttribute('role', 'tab');
        tick.dataset.rwTick = String(i);
        tick.setAttribute('aria-selected', isAct ? 'true' : 'false');
        tick.innerHTML = `
          <span class="rw__tick-num" data-rw-tick-label="${i}">${escapeHtml(look.name)}</span>
          <span class="rw__tick-bar"><span class="rw__tick-fill"></span></span>
        `;
        tick.addEventListener('click', () => {
          this.engage();
          this.goToSlot(i);
        });
        ticksWrap.appendChild(tick);
      });
      this.ticks = Array.from(ticksWrap.querySelectorAll<HTMLElement>('[data-rw-tick]'));
    }

    // 4. Bind hero pins & lightbox pins
    this.bindPinEvents();

    // 5. Render specification panels
    this.renderPanels();

    // 6. Reset springs to match this.M
    this.springs = Array.from({ length: this.M }, () => ({
      p: 1.15,
      v: 0,
    }));
  }

  public bindPinEvents(): void {
    this.querySelectorAll<HTMLElement>('[data-rw-pin]').forEach((pin) => {
      const pinNum = Number(pin.dataset.rwPin);
      pin.onpointerenter = () => this.hot(pinNum, false);
      pin.onpointerleave = () => this.hot(0, false);
      pin.onclick = (e) => {
        e.stopPropagation();
        this.hot(pinNum, true);
      };
    });
  }

  private decodeImage(img: HTMLImageElement): void {
    const markDecoded = () => img.classList.add('is-decoded');
    if (img.complete && img.naturalWidth > 0) {
      markDecoded();
    } else if (typeof img.decode === 'function') {
      img.decode().then(markDecoded).catch(markDecoded);
    } else {
      img.addEventListener('load', markDecoded, { once: true });
      img.addEventListener('error', markDecoded, { once: true });
    }
  }

  /**
   * Section 14: Canvas Alpha-Channel Bottom-Edge ("Feet/Base") Probe
   */
  private probeFoot(index: number, url: string): void {
    const origBody = this.bodies[index];
    const cloneBody = this.bodies[index + this.N];
    const hero = this.heroes[index];
    const offY = `${this.looks[index]?.offsetY ?? 0}%`;
    const scaleVal = `${this.looks[index]?.scale ?? 1}`;

    if (!url) {
      [origBody, cloneBody, hero].forEach((el) => {
        el?.style.setProperty('--rw-foot', '0%');
        el?.style.setProperty('--rw-offset-y', offY);
        el?.style.setProperty('--rw-scale', scaleVal);
      });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 48;
        const h = Math.max(48, Math.round((img.naturalHeight / Math.max(1, img.naturalWidth)) * w));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let bottomRow = h - 1;
        outer: for (let y = h - 1; y >= 0; y--) {
          for (let x = 0; x < w; x++) {
            const alpha = data[(y * w + x) * 4 + 3];
            if (alpha > 40) {
              bottomRow = y;
              break outer;
            }
          }
        }
        const emptyFraction = clamp((h - 1 - bottomRow) / h, 0, 0.25);
        const footPct = `${(emptyFraction * 100).toFixed(2)}%`;
        [origBody, cloneBody, hero].forEach((el) => {
          el?.style.setProperty('--rw-foot', footPct);
          el?.style.setProperty('--rw-offset-y', offY);
          el?.style.setProperty('--rw-scale', scaleVal);
        });
      } catch {
        // Fallback if canvas is tainted
      }
    };
    img.src = url;
  }

  /**
   * Specification Rows: 2-column layout (.rw__thumb & .rw__info),
   * without + buttons or pickers. Clicking highlights corresponding pin.
   */
  private renderPanels(): void {
    this.panelsWrap.innerHTML = '';
    this.panels = [];

    this.looks.forEach((look, lookIdx) => {
      const panel = document.createElement('div');
      panel.className = `rw__look-panel${lookIdx === this.activeIndex ? ' is-active' : ''}`;
      panel.dataset.rwPanel = String(lookIdx);

      const itemsHtml = look.specs
        .map((spec, sIdx) => {
          const cardNum = sIdx + 1;
          const cleanThumb = !isLegacyTemplateImageUrl(spec.thumb) ? String(spec.thumb || '').trim() : '';
          const hasThumb = cleanThumb.length > 0;

          return `
            <li class="rw__item" data-rw-card="${cardNum}" style="--i:${cardNum}" data-title="${escapeAttr(spec.title)}" data-catalog-id="${escapeAttr(spec.catalogId)}">
              <div class="rw__thumb${hasThumb ? '' : ' is-empty'}">
                ${hasThumb ? `<img src="${escapeAttr(cleanThumb)}" alt="${escapeAttr(spec.title)}" width="${spec.thumbW}" height="${spec.thumbH}" loading="lazy">` : ''}
              </div>
              <div class="rw__info">
                <span class="rw__type">${escapeHtml(spec.type)}</span>
                <span class="rw__name">${escapeHtml(spec.title)}</span>
                <span class="rw__price">${escapeHtml(spec.specNote)}</span>
              </div>
            </li>
          `;
        })
        .join('');

      panel.innerHTML = `
        <div class="rw__mhead">
          <span class="rw__mhead-title" data-rw-mtitle>${escapeHtml(look.name)}</span>
        </div>
        <ul class="rw__items" role="list">${itemsHtml}</ul>
        <div class="rw__bundle has-rule">
          <div class="rw__bundle-row">
            <div class="rw__bundle-copy">
              <span class="rw__bundle-title">Cam Kết Đạt Chuẩn Công Thức Thái Lan</span>
              <span class="rw__bundle-note">Chứng nhận tiêu chuẩn nhà máy xuất xưởng · Bao PP dệt 25kg</span>
            </div>
            <span class="rw__bundle-price"><strong>${escapeHtml(look.qualityStd)}</strong></span>
          </div>
        </div>
        <template data-rw-pieces-text>${escapeHtml(look.pieces)}</template>
      `;

      // Bind card hover & click -> pin hot (and isolate pin in lightbox if needed)
      const cards = panel.querySelectorAll<HTMLElement>('[data-rw-card]');
      cards.forEach((card) => {
        const cardNum = Number(card.dataset.rwCard);
        card.addEventListener('pointerenter', () => this.hot(cardNum, false));
        card.addEventListener('pointerleave', () => this.hot(0, false));
        card.addEventListener('click', () => {
          this.engage();
          this.hot(cardNum, true);
        });
      });

      this.panelsWrap.appendChild(panel);
      this.panels.push(panel);
    });
  }

  /**
   * Section 8: Measure viewport & stage geometry
   */
  public measure(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.isPhone = vw <= 749;

    const headerEl = document.querySelector<HTMLElement>('.shopify-section-group-header-group');
    const headerH = headerEl ? headerEl.getBoundingClientRect().height : 88;

    let frameH = vh - headerH;
    if (this.isPhone && this.dataset.mheightMode === 'custom') {
      const mvh = Number(this.dataset.mheightVh) || 109;
      frameH = Math.round((vh * mvh) / 100);
    } else if (this.dataset.fit === 'true') {
      frameH = Math.max(380, vh - headerH);
    }

    this.style.setProperty('--rw-frame-h', `${frameH}px`);

    const rect = this.stageEl.getBoundingClientRect();
    this.stageW = Math.max(300, rect.width);
    this.stageH = Math.max(260, rect.height);

    const modelH = this.isPhone
      ? clamp(Math.round(this.stageH * 0.74), 240, 460)
      : clamp(Math.round(this.stageH * 0.72), 340, 680);
    this.style.setProperty('--rw-model-h', `${modelH}px`);
  }

  private engage(): void {
    this.isEngaged = true;
  }

  /**
   * Section 8: Set Active Feed Bag Index (0..5)
   */
  public setIndex(newIdx: number, triggerSweep = true): void {
    const wrapped = ((newIdx % this.N) + this.N) % this.N;
    const prevIdx = this.activeIndex;
    this.activeIndex = wrapped;
    this.autoProgress = 0;

    // Trigger soft light sweep when changing look
    if (triggerSweep && prevIdx !== wrapped) {
      this.classList.remove('is-sweeping');
      void this.offsetWidth;
      this.classList.add('is-sweeping');
    }

    // Update heroes
    this.heroes.forEach((h, i) => {
      h.classList.toggle('is-active', i === wrapped);
    });

    // Update ticks
    this.ticks.forEach((t, i) => {
      const isAct = i === wrapped;
      t.classList.toggle('is-active', isAct);
      t.classList.toggle('is-past', i < wrapped);
      t.setAttribute('aria-selected', isAct ? 'true' : 'false');
      t.style.setProperty('--rw-tick-p', isAct ? '0' : i < wrapped ? '1' : '0');
    });

    // Update phone walk line
    const walkP = (wrapped + 1) / this.N;
    this.walkLineEl?.style.setProperty('--rw-walk-p', walkP.toFixed(3));

    // Update look panels & pieces count
    this.panels.forEach((p, i) => {
      p.classList.toggle('is-active', i === wrapped);
    });

    const activeLook = this.looks[wrapped];
    if (activeLook) {
      if (this.piecesLabelEl) {
        this.piecesLabelEl.textContent = '';
      }
      if (this.liveRegion) {
        this.liveRegion.textContent = activeLook.name;
      }
      if (this.lbKickerEl) {
        this.lbKickerEl.textContent = 'Công thức';
      }
      if (this.lbTitleEl) {
        this.lbTitleEl.textContent = activeLook.name;
      }
    }
  }

  public stepBy(delta: number): void {
    this.targetPos = Math.round(this.targetPos) + delta;
    this.setIndex(Math.round(this.targetPos), true);
  }

  public goToSlot(slotIdx: number): void {
    const currentRound = Math.round(this.targetPos);
    const currentMod = ((currentRound % this.N) + this.N) % this.N;
    const diff = wrapSym(slotIdx - currentMod, this.N);
    this.targetPos = currentRound + diff;
    this.setIndex(slotIdx, true);
  }

  /**
   * Section 9: Highlight Pin & Specification Card (hot(n, scroll))
   */
  public hot(n: number, scroll: boolean): void {
    // Toggle .is-hot on pins (both inside hero and inside lightbox if open)
    this.querySelectorAll<HTMLElement>('[data-rw-pin]').forEach((pin) => {
      const pNum = Number(pin.dataset.rwPin);
      pin.classList.toggle('is-hot', n > 0 && pNum === n);
    });

    const activePanel = this.panels[this.activeIndex];
    if (!activePanel) return;
    const cards = activePanel.querySelectorAll<HTMLElement>('[data-rw-card]');
    cards.forEach((card) => {
      const cNum = Number(card.dataset.rwCard);
      const match = n > 0 && cNum === n;
      card.classList.toggle('is-hot', match);
      if (match && scroll) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  /**
   * Section 11: FLIP Lightbox ("View bag" Popup with Numbered Specification Pins)
   */
  public openLightbox(): void {
    if (this.isLoading || this.isLightboxOpen || !this.lbEl || !this.lbStageEl) return;
    const hero = this.heroes[this.activeIndex];
    const fig = hero?.querySelector<HTMLElement>('[data-rw-figure]');
    if (!hero || !fig) return;

    this.engage();
    this.isLightboxOpen = true;

    const firstRect = fig.getBoundingClientRect();

    this.activeLbHero = hero;
    this.activeLbFigure = fig;

    if (this.lbKickerEl) {
      this.lbKickerEl.textContent = 'Công thức';
    }
    if (this.lbTitleEl) {
      this.lbTitleEl.textContent = this.looks[this.activeIndex]?.name || '';
    }

    this.lbEl.hidden = false;
    this.lbStageEl.appendChild(fig);

    const lastRect = fig.getBoundingClientRect();
    const dx = firstRect.left + firstRect.width / 2 - (lastRect.left + lastRect.width / 2);
    const dy = firstRect.top + firstRect.height / 2 - (lastRect.top + lastRect.height / 2);
    const s = firstRect.height / Math.max(1, lastRect.height);

    fig.style.transition = 'none';
    fig.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s})`;
    void fig.offsetWidth;

    fig.style.transition = `transform var(--rw-morph, 900ms) var(--rw-ease)`;
    fig.style.transform = 'translate3d(0, 0, 0) scale(1)';

    requestAnimationFrame(() => {
      this.lbEl?.classList.add('is-open');
    });
  }

  public closeLightbox(): void {
    if (!this.isLightboxOpen || !this.lbEl || !this.activeLbHero || !this.activeLbFigure) return;
    const fig = this.activeLbFigure;
    const hero = this.activeLbHero;

    this.lbEl.classList.remove('is-open');
    this.hot(0, false);

    window.setTimeout(() => {
      fig.style.transition = '';
      fig.style.transform = '';
      hero.appendChild(fig);
      if (this.lbEl) this.lbEl.hidden = true;
      this.isLightboxOpen = false;
      this.activeLbHero = null;
      this.activeLbFigure = null;
    }, 320);
  }

  /**
   * Section 7: 3D Ring & Classic Queue Physics Loop
   */
  private stepPhysics(dt: number): void {
    // Custom cursor lerp (0.18)
    if (this.cursorEl && this.curVisible) {
      this.curX += (this.curTx - this.curX) * 0.18;
      this.curY += (this.curTy - this.curY) * 0.18;
      this.cursorEl.style.transform = `translate3d(${this.curX.toFixed(1)}px, ${this.curY.toFixed(1)}px, 0)`;
    }

    if (this.isLoading || this.looks.length === 0) return;

    // 1. Autoplay progress
    const canAuto =
      this.autoplayEnabled &&
      !this.isPausedByUser &&
      !this.isHoveredPanel &&
      !this.isEngaged &&
      !this.isDragging &&
      !this.isLightboxOpen;

    if (canAuto) {
      this.autoProgress += (dt * 1000) / this.speedMs;
      if (this.autoProgress >= 1) {
        this.autoProgress = 0;
        this.stepBy(1);
      }
      const activeTick = this.ticks[this.activeIndex];
      activeTick?.style.setProperty('--rw-tick-p', clamp(this.autoProgress, 0, 1).toFixed(3));
    }

    // 3. Spring integration for each of the 12 bodies
    const W = this.stageW;
    const H = this.stageH;
    const useRing = !this.isPhone && (this.dataset.style || 'ring') === 'ring';
    const blurEnabled = this.dataset.blur === 'true';

    // Desktop 3D ring constants — expanded by +20% (RING_SPREAD = 1.2) to stretch spacing between adjacent products by 20%
    const RING_SPREAD = 1.2;
    const cx = 0.5 * W;
    const R = 0.62 * W * RING_SPREAD;
    const P = 1.65 * W * RING_SPREAD;
    const floor = H - 34;
    const horizon = 0.36 * H;
    const fs = 1.08;

    let frontSettled = false;
    let frontX = cx;
    let frontY = floor;
    let frontScale = fs;

    for (let k = 0; k < this.M; k++) {
      const body = this.bodies[k];
      if (!body) continue;

      if (useRing && k >= this.N) {
        body.style.opacity = '0';
        body.style.pointerEvents = 'none';
        continue;
      }

      const period = useRing ? this.N : this.M;
      const rawOffset = wrapSym(k - this.targetPos, period);
      const placeInLine = Math.abs(rawOffset);

      // Follow lag 0.04s per place in line
      const effK = this.K / (1 + placeInLine * this.lag * 12);
      const effC = 2 * Math.sqrt(effK);

      const sp = this.springs[k];
      const force = -effK * (sp.p - this.targetPos) - effC * sp.v;
      sp.v += force * dt;
      sp.p += sp.v * dt;

      const d = wrapSym(k - sp.p, period);
      const isFrontBody = k % this.N === this.activeIndex && Math.abs(d) < 0.45;
      body.classList.toggle('is-front', isFrontBody);

      if (useRing) {
        const theta = (d / this.N) * Math.PI * 2;
        const wx = Math.sin(theta) * R;
        const wz = (1 - Math.cos(theta)) * R;
        const persp = P / (P + wz);
        const scale = fs * persp;
        const x = cx + wx * persp;
        const y = horizon + (floor - horizon) * persp;
        const depthNorm = clamp(wz / (2 * R), 0, 1);
        const blurPx = blurEnabled ? (depthNorm * 8.5).toFixed(2) : '0';
        const opacity = clamp(1 - depthNorm * 0.52, 0.35, 1);
        const zIdx = Math.round(persp * 100);

        body.style.transform = `translate3d(calc(${x.toFixed(2)}px - 50%), calc(${y.toFixed(2)}px - 100%), 0) scale(${scale.toFixed(4)})`;
        body.style.filter = Number(blurPx) > 0.15 ? `blur(${blurPx}px)` : 'none';
        body.style.opacity = opacity.toFixed(3);
        body.style.zIndex = String(zIdx);

        if (k === this.activeIndex) {
          frontX = x;
          frontY = y;
          frontScale = scale;
          if (Math.abs(d) < 0.012 && Math.abs(sp.v) < 0.03 && !this.isDragging) {
            frontSettled = true;
          }
        }
      } else {
        // Phone classic diagonal line mode (+20% spacing between products)
        const ax = 0.38 * W;
        const ay = H - 22;
        const x = ax + d * (0.24 * RING_SPREAD) * W;
        const y = ay - d * 0.055 * H;
        const scale = d >= 0 ? Math.pow(0.86, d) : 1 - d * 0.08;
        const opacity = d < -0.15 ? clamp(1 + d * 1.4, 0, 1) : clamp(1 - d * 0.18, 0, 1);
        const blurPx = blurEnabled && Math.abs(d) > 0.25 ? Math.min(6, Math.abs(d) * 1.6).toFixed(2) : '0';
        const zIdx = Math.round(100 - d * 10);

        body.style.transform = `translate3d(calc(${x.toFixed(2)}px - 50%), calc(${y.toFixed(2)}px - 100%), 0) scale(${scale.toFixed(4)})`;
        body.style.filter = Number(blurPx) > 0.15 ? `blur(${blurPx}px)` : 'none';
        body.style.opacity = opacity.toFixed(3);
        body.style.zIndex = String(zIdx);

        if (k === this.activeIndex) {
          frontX = x;
          frontY = y;
          frontScale = scale;
          if (Math.abs(d) < 0.012 && Math.abs(sp.v) < 0.03 && !this.isDragging) {
            frontSettled = true;
          }
        }
      }
    }

    // Position active hero at exact front bag coordinates & toggle rw--still
    const activeHero = this.heroes[this.activeIndex];
    if (activeHero) {
      activeHero.style.transform = `translate3d(calc(${frontX.toFixed(2)}px - 50%), calc(${frontY.toFixed(2)}px - 100%), 0) scale(${frontScale.toFixed(4)})`;
    }
    this.style.setProperty('--rw-ax', `${((frontX / W) * 100).toFixed(2)}%`);
    this.classList.toggle('rw--still', frontSettled);
  }

  /**
   * Section 9: Pointer Drag, Wheel, Keyboard, Cursor, Pins & Controls
   */
  private bindInteractions(): void {
    // Prev / Next arrows
    this.querySelector('[data-rw-prev]')?.addEventListener('click', () => {
      this.engage();
      this.stepBy(-1);
    });
    this.querySelector('[data-rw-next]')?.addEventListener('click', () => {
      this.engage();
      this.stepBy(1);
    });

    // Autoplay pause/resume button
    const autoBtn = this.querySelector<HTMLButtonElement>('[data-rw-auto]');
    autoBtn?.addEventListener('click', () => {
      this.isPausedByUser = !this.isPausedByUser;
      this.classList.toggle('is-paused', this.isPausedByUser);
      autoBtn.setAttribute('aria-pressed', this.isPausedByUser ? 'true' : 'false');
      autoBtn.setAttribute('aria-label', this.isPausedByUser ? 'Bật tự động' : 'Tạm dừng tự động');
    });

    // Pause autoplay while hovering right-hand specification panel
    const panelWrap = this.querySelector('[data-rw-panel-wrap]');
    panelWrap?.addEventListener('pointerenter', () => {
      this.isHoveredPanel = true;
    });
    panelWrap?.addEventListener('pointerleave', () => {
      this.isHoveredPanel = false;
    });

    // Lightbox close buttons & Escape key
    this.querySelectorAll('[data-rw-lb-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeLightbox());
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isLightboxOpen) {
        this.closeLightbox();
      }
    });

    // Keyboard navigation on stage
    this.stageEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.engage();
        this.stepBy(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.engage();
        this.stepBy(-1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openLightbox();
      }
    });

    // Horizontal trackpad wheel (|acc| > 45)
    this.stageEl.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        this.wheelAcc += e.deltaX;
        if (Math.abs(this.wheelAcc) > 45) {
          this.engage();
          this.stepBy(this.wheelAcc > 0 ? 1 : -1);
          this.wheelAcc = 0;
        }
        if (this.wheelResetTimer) window.clearTimeout(this.wheelResetTimer);
        this.wheelResetTimer = window.setTimeout(() => {
          this.wheelAcc = 0;
        }, 180);
      },
      { passive: false }
    );

    // Custom cursor tracking & Pointer drag on stage
    this.stageEl.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      const rect = this.stageEl.getBoundingClientRect();
      this.curX = this.curTx = e.clientX - rect.left;
      this.curY = this.curTy = e.clientY - rect.top;
      this.curVisible = true;
      this.stageEl.classList.add('has-custom-cursor');
      this.cursorEl?.classList.add('is-visible');
    });

    this.stageEl.addEventListener('pointerleave', () => {
      this.curVisible = false;
      this.cursorEl?.classList.remove('is-visible', 'is-down', 'is-over-hero');
    });

    this.stageEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.engage();
      this.isDragging = true;
      this.dragMoved = false;
      this.dragPointerId = e.pointerId;
      this.dragStartX = this.dragLastX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragLastT = performance.now();
      this.dragVelX = 0;
      this.dragStartTarget = this.targetPos;
      this.cursorEl?.classList.add('is-down');
      try {
        this.stageEl.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    this.stageEl.addEventListener('pointermove', (e) => {
      const rect = this.stageEl.getBoundingClientRect();
      this.curTx = e.clientX - rect.left;
      this.curTy = e.clientY - rect.top;

      // Check if pointer is over the front bag center region to show "View" vs "Drag"
      const heroW = Math.min(280, this.stageW * 0.32);
      const isOverCenterBag =
        Math.abs(this.curTx - this.stageW * 0.5) < heroW * 0.55 &&
        this.curTy > this.stageH * 0.15 &&
        this.curTy < this.stageH * 0.94;
      this.cursorEl?.classList.toggle('is-over-hero', isOverCenterBag && !this.isDragging);

      if (!this.isDragging || e.pointerId !== this.dragPointerId) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        this.dragMoved = true;
      }

      const now = performance.now();
      const dt = Math.max(1, now - this.dragLastT);
      this.dragVelX = (e.clientX - this.dragLastX) / dt;
      this.dragLastX = e.clientX;
      this.dragLastT = now;

      const span = Math.max(220, this.stageW * 0.36);
      this.targetPos = this.dragStartTarget - dx / span;
    });

    const finishDrag = (e: PointerEvent) => {
      if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
      this.isDragging = false;
      this.dragPointerId = null;
      this.cursorEl?.classList.remove('is-down');

      if (!this.dragMoved) {
        // Clicked without dragging: check if over front bag -> open "View bag" FLIP popup
        const rect = this.stageEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const heroW = Math.min(320, this.stageW * 0.42);
        const centerTarget = this.isPhone ? this.stageW * 0.38 : this.stageW * 0.5;
        if (Math.abs(clickX - centerTarget) < heroW * 0.65) {
          this.targetPos = Math.round(this.targetPos);
          this.openLightbox();
          return;
        }
      }

      // Project velocity to snap to nearest feed bag slot
      const projected = this.targetPos - this.dragVelX * 0.28;
      const snapped = Math.round(projected);
      this.targetPos = snapped;
      this.setIndex(snapped, true);
    };

    this.stageEl.addEventListener('pointerup', finishDrag);
    this.stageEl.addEventListener('pointercancel', finishDrag);
  }
}

if (!customElements.get('runway-section')) {
  customElements.define('runway-section', RunwaySection);
}

/**
 * Section 15: Password-Protected Admin CMS Modal (ID: admin, Password: adminsale)
 */
class AdminCmsController {
  private dialog: HTMLDialogElement | null;
  private loginForm: HTMLFormElement | null;
  private editorView: HTMLElement | null;
  private editorFoot: HTMLElement | null;
  private loginErr: HTMLElement | null;
  private slotTabsEl: HTMLElement | null;
  private specsContainerEl: HTMLElement | null;

  private workingLooks: FeedBagLook[] = [];
  private selectedSlot = 0;
  private currentBrandLogo = getBrandLogo();

  constructor() {
    this.dialog = document.getElementById('admin-dialog') as HTMLDialogElement | null;
    this.loginForm = document.getElementById('admin-login-view') as HTMLFormElement | null;
    this.editorView = document.getElementById('admin-editor-view');
    this.editorFoot = document.getElementById('admin-editor-foot');
    this.loginErr = document.getElementById('admin-login-err');
    this.slotTabsEl = document.getElementById('admin-slot-tabs');
    this.specsContainerEl = document.getElementById('admin-specs-container');

    this.bindEvents();
  }

  private async openModal(): Promise<void> {
    if (activeLooks.length === 0) {
      await initAndSyncSupabaseConfig();
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out errors
    }
    this.workingLooks = JSON.parse(JSON.stringify(activeLooks));
    this.currentBrandLogo = activeBrandLogo;
    this.showLoginView();
    this.dialog?.showModal();
  }

  private showEditorView(): void {
    if (this.loginForm) this.loginForm.hidden = true;
    if (this.editorView) this.editorView.hidden = false;
    if (this.editorFoot) this.editorFoot.hidden = false;
    this.renderBrandLogoFields();
    this.renderSlotTabs();
    this.renderSelectedSlotEditor();
  }

  private showLoginView(): void {
    if (this.loginForm) this.loginForm.hidden = false;
    if (this.editorView) this.editorView.hidden = true;
    if (this.editorFoot) this.editorFoot.hidden = true;
    if (this.loginErr) this.loginErr.hidden = true;
    const passEl = document.getElementById('admin-pass') as HTMLInputElement | null;
    if (passEl) passEl.value = '';
  }

  private renderBrandLogoFields(): void {
    const logoUrlInput = document.getElementById('admin-brand-logo-url') as HTMLInputElement | null;
    const logoPreview = document.getElementById('admin-brand-logo-preview') as HTMLImageElement | null;
    if (logoUrlInput) logoUrlInput.value = this.currentBrandLogo;
    if (logoPreview) logoPreview.src = this.currentBrandLogo;
  }

  private renderSlotTabs(): void {
    if (!this.slotTabsEl) return;
    this.slotTabsEl.innerHTML = '';
    const countEl = document.getElementById('admin-product-count');
    if (countEl) countEl.textContent = String(this.workingLooks.length);

    this.selectedSlot = clamp(this.selectedSlot, 0, Math.max(0, this.workingLooks.length - 1));

    this.workingLooks.forEach((look, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `admin-tab${idx === this.selectedSlot ? ' is-active' : ''}`;
      btn.textContent = look.name;
      btn.addEventListener('click', () => {
        this.commitCurrentSlotInputs();
        this.selectedSlot = idx;
        this.renderSlotTabs();
        this.renderSelectedSlotEditor();
      });
      this.slotTabsEl?.appendChild(btn);
    });
  }

  private renderSelectedSlotEditor(): void {
    const look = this.workingLooks[this.selectedSlot];
    if (!look) return;

    const countEl = document.getElementById('admin-product-count');
    if (countEl) countEl.textContent = String(this.workingLooks.length);

    const deleteBtn = document.getElementById('admin-delete-product') as HTMLButtonElement | null;
    if (deleteBtn) {
      deleteBtn.disabled = this.workingLooks.length <= 1;
      deleteBtn.style.opacity = this.workingLooks.length <= 1 ? '0.45' : '1';
      deleteBtn.style.cursor = this.workingLooks.length <= 1 ? 'not-allowed' : 'pointer';
    }

    const nameInput = document.getElementById('admin-bag-name') as HTMLInputElement | null;
    const stdInput = document.getElementById('admin-bag-std') as HTMLInputElement | null;
    const img640Input = document.getElementById('admin-bag-img-640') as HTMLInputElement | null;
    const img1080Input = document.getElementById('admin-bag-img-1080') as HTMLInputElement | null;
    const previewImg = document.getElementById('admin-bag-preview-img') as HTMLImageElement | null;

    if (nameInput) nameInput.value = look.name;
    if (stdInput) stdInput.value = look.qualityStd;
    if (img640Input) img640Input.value = look.img640 || '';
    if (img1080Input) img1080Input.value = look.img1080 || '';

    const offsetY = look.offsetY ?? 0;
    const offsetSlider = document.getElementById('admin-offset-slider') as HTMLInputElement | null;
    const offsetBadge = document.getElementById('admin-offset-val-badge');
    if (offsetSlider) offsetSlider.value = String(offsetY);
    if (offsetBadge) {
      if (offsetY < 0) {
        offsetBadge.textContent = `${offsetY}% (Nâng lên ${Math.abs(offsetY)}%)`;
      } else if (offsetY > 0) {
        offsetBadge.textContent = `+${offsetY}% (Hạ xuống ${offsetY}%)`;
      } else {
        offsetBadge.textContent = '0% (Chuẩn)';
      }
    }

    const scale = look.scale ?? 1;
    const scaleSlider = document.getElementById('admin-scale-slider') as HTMLInputElement | null;
    const scaleBadge = document.getElementById('admin-scale-val-badge');
    const scalePct = Math.round(scale * 100);
    if (scaleSlider) scaleSlider.value = String(scalePct);
    if (scaleBadge) {
      if (scalePct > 100) {
        scaleBadge.textContent = `${scalePct}% (+${scalePct - 100}%)`;
      } else if (scalePct < 100) {
        scaleBadge.textContent = `${scalePct}% (-${100 - scalePct}%)`;
      } else {
        scaleBadge.textContent = '100% (Chuẩn)';
      }
    }

    if (previewImg) {
      previewImg.src = look.img640 || EMPTY_BAG_PLACEHOLDER;
      previewImg.style.setProperty('--admin-preview-offset-y', `${offsetY}%`);
      previewImg.style.setProperty('--admin-preview-scale', `${scale}`);
      previewImg.style.transform = `translateY(${offsetY}%) scale(${scale})`;
    }

    if (!this.specsContainerEl) return;
    this.specsContainerEl.innerHTML = '';

    const pillarHeadings = [
      'Chỉ tiêu 1 · Đối tượng chăn nuôi',
      'Chỉ tiêu 2 · Độ tuổi & Trọng lượng phù hợp',
      'Chỉ tiêu 3 · Thành phần dinh dưỡng đảm bảo',
    ];

    look.specs.forEach((spec, sIdx) => {
      const cleanThumb = !isLegacyTemplateImageUrl(spec.thumb)
        ? String(spec.thumb || '').trim()
        : '';
      spec.thumb = cleanThumb;
      const hasThumb = cleanThumb.length > 0;
      const card = document.createElement('div');
      card.className = 'admin-spec-card';
      card.innerHTML = `
        <h4>${pillarHeadings[sIdx]}</h4>
        <div class="admin-field">
          <label>Tiêu đề nhóm phân loại (.rw__type)</label>
          <input type="text" data-spec-field="type" data-spec-idx="${sIdx}" value="${escapeAttr(spec.type)}">
        </div>
        <div class="admin-field">
          <label>Tên chỉ tiêu kỹ thuật (.rw__name &amp; Tooltip Điểm Pin)</label>
          <input type="text" data-spec-field="title" data-spec-idx="${sIdx}" value="${escapeAttr(spec.title)}">
        </div>
        <div class="admin-field">
          <label>Dòng ghi chú kỹ thuật / Cam kết (.rw__price)</label>
          <input type="text" data-spec-field="specNote" data-spec-idx="${sIdx}" value="${escapeAttr(spec.specNote)}">
        </div>
        <div class="admin-field">
          <label>Đường dẫn ảnh thu nhỏ (URL / DataURL)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <div class="admin-thumb-box${hasThumb ? '' : ' is-empty'}" data-spec-thumb-box="${sIdx}">
              <img ${hasThumb ? `src="${escapeAttr(cleanThumb)}"` : 'hidden'} alt="Thu nhỏ" data-spec-thumb-preview="${sIdx}">
            </div>
            <input type="text" data-spec-field="thumb" data-spec-idx="${sIdx}" value="${escapeAttr(cleanThumb)}" placeholder="Chờ cập nhật hình ảnh..." style="flex:1;min-width:0;">
          </div>
          <label class="btn-outline" style="margin-top:4px;text-align:center;cursor:pointer;font-size:11px;padding:6px 12px;">
            Tải Lên Ảnh Thu Nhỏ
            <input type="file" accept="image/png,image/webp,image/jpeg" data-spec-file="${sIdx}" hidden>
          </label>
        </div>
        <div class="admin-pin-coords">
          <div class="admin-field">
            <label>Điểm Pin ${sIdx + 1} Trục Ngang (%)</label>
            <input type="number" min="0" max="100" step="1" data-spec-field="pinLeft" data-spec-idx="${sIdx}" value="${spec.pinLeft}">
          </div>
          <div class="admin-field">
            <label>Điểm Pin ${sIdx + 1} Trục Dọc (%)</label>
            <input type="number" min="0" max="100" step="1" data-spec-field="pinTop" data-spec-idx="${sIdx}" value="${spec.pinTop}">
          </div>
        </div>
      `;

      // Bind live input update on thumb URL field
      const thumbInputEl = card.querySelector<HTMLInputElement>(`[data-spec-field="thumb"][data-spec-idx="${sIdx}"]`);
      const thumbPrevEl = card.querySelector<HTMLImageElement>(`[data-spec-thumb-preview="${sIdx}"]`);
      const thumbBoxEl = card.querySelector<HTMLElement>(`[data-spec-thumb-box="${sIdx}"]`);
      thumbInputEl?.addEventListener('input', () => {
        const rawVal = thumbInputEl.value.trim();
        const val = !isLegacyTemplateImageUrl(rawVal) ? rawVal : '';
        if (val) {
          if (thumbPrevEl) {
            thumbPrevEl.src = val;
            thumbPrevEl.hidden = false;
          }
          thumbBoxEl?.classList.remove('is-empty');
        } else {
          if (thumbPrevEl) {
            thumbPrevEl.removeAttribute('src');
            thumbPrevEl.hidden = true;
          }
          thumbBoxEl?.classList.add('is-empty');
        }
        look.specs[sIdx].thumb = val;
      });

      // Bind thumbnail file upload
      const fileInput = card.querySelector<HTMLInputElement>(`[data-spec-file="${sIdx}"]`);
      fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        this.readImageFileAsDataUrl(file, 400, (dataUrl) => {
          if (thumbInputEl) thumbInputEl.value = dataUrl;
          if (thumbPrevEl) {
            thumbPrevEl.src = dataUrl;
            thumbPrevEl.hidden = false;
          }
          thumbBoxEl?.classList.remove('is-empty');
          look.specs[sIdx].thumb = dataUrl;
        });
      });

      this.specsContainerEl?.appendChild(card);
    });
  }

  private commitCurrentSlotInputs(): void {
    const logoUrlInput = document.getElementById('admin-brand-logo-url') as HTMLInputElement | null;
    if (logoUrlInput && logoUrlInput.value.trim()) {
      this.currentBrandLogo = logoUrlInput.value.trim();
    }

    const look = this.workingLooks[this.selectedSlot];
    if (!look) return;

    const nameInput = document.getElementById('admin-bag-name') as HTMLInputElement | null;
    const stdInput = document.getElementById('admin-bag-std') as HTMLInputElement | null;
    const img640Input = document.getElementById('admin-bag-img-640') as HTMLInputElement | null;
    const img1080Input = document.getElementById('admin-bag-img-1080') as HTMLInputElement | null;

    if (nameInput && nameInput.value.trim()) look.name = nameInput.value.trim();
    if (stdInput && stdInput.value.trim()) look.qualityStd = stdInput.value.trim();
    if (img640Input) look.img640 = img640Input.value.trim();
    if (img1080Input && img1080Input.value.trim()) {
      look.img1080 = img1080Input.value.trim();
    } else {
      look.img1080 = look.img640;
    }

    const offsetSlider = document.getElementById('admin-offset-slider') as HTMLInputElement | null;
    if (offsetSlider) {
      look.offsetY = parseFloat(offsetSlider.value) || 0;
    }

    const scaleSlider = document.getElementById('admin-scale-slider') as HTMLInputElement | null;
    if (scaleSlider) {
      const val = parseFloat(scaleSlider.value) || 100;
      look.scale = Math.round(clamp(val, 50, 150)) / 100;
    }

    if (!this.specsContainerEl) return;
    this.specsContainerEl.querySelectorAll<HTMLInputElement>('[data-spec-field]').forEach((inp) => {
      const sIdx = Number(inp.dataset.specIdx);
      const field = inp.dataset.specField;
      const spec = look.specs[sIdx];
      if (!spec || !field) return;

      if (field === 'pinLeft') {
        spec.pinLeft = clamp(Number(inp.value) || 0, 0, 100);
      } else if (field === 'pinTop') {
        spec.pinTop = clamp(Number(inp.value) || 0, 0, 100);
      } else if (field === 'type') {
        spec.type = inp.value;
      } else if (field === 'title') {
        spec.title = inp.value;
      } else if (field === 'specNote') {
        spec.specNote = inp.value;
      } else if (field === 'tag') {
        spec.tag = inp.value.trim();
      } else if (field === 'thumb') {
        spec.thumb = inp.value.trim();
      }
    });
  }

  private readImageFileAsDataUrl(file: File, maxDim: number, cb: (dataUrl: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cb(rawUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/webp', 0.88));
      };
      img.onerror = () => cb(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Transforms an uploaded bag packaging image into a 3D standing 25kg Woven PP Feed Bag cut-out.
   * Preserves 100% of all text, logos, nutritional tables and branding from the uploaded image,
   * while shaping it into a realistic bulging 25kg feed sack with cylindrical lighting highlights,
   * top stitched hem thread, bottom weight crease, subtle PP woven sheen and transparent background.
   */
  private generate3dWovenPpBagCutout(sourceImgSrc: string, cb: (dataUrl: string) => void): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const w = 640;
        const h = 1138;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cb(sourceImgSrc);
          return;
        }

        ctx.clearRect(0, 0, w, h);

        // 1. Standing 25kg Woven PP sack geometry
        const yTop = 115;
        const yBottom = 1060;
        const bagH = yBottom - yTop;
        const cx = w / 2; // 320

        const getHalfWidth = (v: number): number => {
          if (v < 0.05) {
            return 190 + v * 120;
          } else if (v < 0.18) {
            const t = (v - 0.05) / 0.13;
            return 196 + t * 24;
          } else if (v < 0.72) {
            const t = (v - 0.18) / 0.54;
            return 220 + Math.sin(t * Math.PI) * 18;
          } else {
            const t = (v - 0.72) / 0.28;
            return 220 - t * 14;
          }
        };

        const buildSackPath = (targetCtx: CanvasRenderingContext2D) => {
          targetCtx.beginPath();
          targetCtx.moveTo(cx - getHalfWidth(0), yTop + 6);
          targetCtx.quadraticCurveTo(cx, yTop - 4, cx + getHalfWidth(0), yTop + 6);

          const steps = 40;
          for (let i = 1; i <= steps; i++) {
            const v = i / steps;
            const y = yTop + v * bagH;
            const hw = getHalfWidth(v);
            targetCtx.lineTo(cx + hw, y);
          }

          targetCtx.quadraticCurveTo(cx, yBottom + 16, cx - getHalfWidth(1), yBottom);

          for (let i = steps - 1; i >= 0; i--) {
            const v = i / steps;
            const y = yTop + v * bagH;
            const hw = getHalfWidth(v);
            targetCtx.lineTo(cx - hw, y);
          }
          targetCtx.closePath();
        };

        // 2. Realistic ground contact shadow beneath the sack base
        ctx.save();
        const groundGrad = ctx.createRadialGradient(cx, yBottom + 12, 10, cx, yBottom + 14, 210);
        groundGrad.addColorStop(0, 'rgba(21, 20, 19, 0.32)');
        groundGrad.addColorStop(0.35, 'rgba(21, 20, 19, 0.18)');
        groundGrad.addColorStop(0.7, 'rgba(21, 20, 19, 0.06)');
        groundGrad.addColorStop(1, 'rgba(21, 20, 19, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.ellipse(cx, yBottom + 14, 210, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Render 3D Cylindrical-Warped Image of the Uploaded Packaging
        ctx.save();
        buildSackPath(ctx);
        ctx.clip(); // Restrict artwork strictly to the 25kg sack silhouette

        ctx.fillStyle = '#f8f7f4';
        ctx.fill();

        // Sliced mapping to follow the 3D sack silhouette curve
        const numSlices = 140;
        const sliceH = bagH / numSlices;
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        for (let i = 0; i < numSlices; i++) {
          const v = i / numSlices;
          const dy = yTop + v * bagH;
          const hw = getHalfWidth(v);
          const sliceWidth = hw * 2;
          const dx = cx - hw;

          const sy = (v * 0.96 + 0.02) * srcH;
          const sh = (sliceH / bagH) * srcH * 1.05;

          ctx.drawImage(img, 0, sy, srcW, sh, dx, dy, sliceWidth, sliceH + 0.8);
        }

        // 4. Layer 3D Volume & Studio Curvature Lighting (Chiaroscuro)
        const lightGrad = ctx.createLinearGradient(cx - 240, 0, cx + 240, 0);
        lightGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.46)'); // Receding left rim
        lightGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.18)');
        lightGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.05)');
        lightGrad.addColorStop(0.36, 'rgba(255, 255, 255, 0.38)'); // Main studio specular highlight band
        lightGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.14)');
        lightGrad.addColorStop(0.68, 'rgba(0, 0, 0, 0.04)');
        lightGrad.addColorStop(0.86, 'rgba(0, 0, 0, 0.28)'); // Receding right shoulder
        lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.52)'); // Deep right edge

        ctx.fillStyle = lightGrad;
        ctx.fillRect(cx - 250, yTop - 10, 500, bagH + 40);

        // Vertical weight shading (belly fullness & bottom gravity shadow)
        const vertGrad = ctx.createLinearGradient(0, yTop, 0, yBottom);
        vertGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.12)');
        vertGrad.addColorStop(0.08, 'rgba(255, 255, 255, 0.08)');
        vertGrad.addColorStop(0.60, 'rgba(255, 255, 255, 0.16)');
        vertGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.04)');
        vertGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.32)');

        ctx.fillStyle = vertGrad;
        ctx.fillRect(cx - 250, yTop - 10, 500, bagH + 40);

        // 5. Woven Polypropylene (PP) Tactile Sheen
        const weaveCanvas = document.createElement('canvas');
        weaveCanvas.width = 6;
        weaveCanvas.height = 6;
        const wCtx = weaveCanvas.getContext('2d');
        if (wCtx) {
          wCtx.fillStyle = 'rgba(255, 255, 255, 0.045)';
          wCtx.fillRect(0, 0, 3, 3);
          wCtx.fillRect(3, 3, 3, 3);
          wCtx.fillStyle = 'rgba(0, 0, 0, 0.035)';
          wCtx.fillRect(3, 0, 3, 3);
          wCtx.fillRect(0, 3, 3, 3);
          const pattern = ctx.createPattern(weaveCanvas, 'repeat');
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(cx - 250, yTop - 10, 500, bagH + 40);
          }
        }

        // 6. Realistic Stitched Top Seam (Đường may chỉ miệng bao 25kg)
        ctx.fillStyle = 'rgba(240, 238, 230, 0.88)';
        ctx.beginPath();
        const topHw = getHalfWidth(0);
        ctx.rect(cx - topHw - 2, yTop, (topHw + 2) * 2, 22);
        ctx.fill();

        const seamGrad = ctx.createLinearGradient(cx - topHw, 0, cx + topHw, 0);
        seamGrad.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
        seamGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.25)');
        seamGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.12)');
        seamGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
        ctx.fillStyle = seamGrad;
        ctx.fillRect(cx - topHw - 2, yTop, (topHw + 2) * 2, 22);

        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - topHw + 12, yTop + 11);
        ctx.lineTo(cx + topHw - 12, yTop + 11);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([7, 4]);
        ctx.lineDashOffset = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - topHw + 12, yTop + 13);
        ctx.lineTo(cx + topHw - 12, yTop + 13);
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - topHw, yTop + 22);
        ctx.lineTo(cx + topHw, yTop + 22);
        ctx.stroke();

        // 7. Realistic Bottom Crease & Gusset Tuck
        const btmHw = getHalfWidth(1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.moveTo(cx - btmHw, yBottom - 16);
        ctx.quadraticCurveTo(cx, yBottom, cx + btmHw, yBottom - 16);
        ctx.lineTo(cx + btmHw, yBottom + 12);
        ctx.quadraticCurveTo(cx, yBottom + 18, cx - btmHw, yBottom + 12);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - btmHw + 14, yBottom - 4);
        ctx.quadraticCurveTo(cx, yBottom + 8, cx + btmHw - 14, yBottom - 4);
        ctx.stroke();
        ctx.restore();

        // 8. 3D Bag Contour Outline
        ctx.restore();

        ctx.save();
        buildSackPath(ctx);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.stroke();
        ctx.restore();

        cb(canvas.toDataURL('image/webp', 0.92));
      } catch (err) {
        console.error('Lỗi tạo hình nổi 3D bao bì:', err);
        cb(sourceImgSrc);
      }
    };

    img.onerror = () => {
      cb(sourceImgSrc);
    };

    img.src = sourceImgSrc;
  }

  private bindEvents(): void {
    document.getElementById('open-admin')?.addEventListener('click', () => {
      this.openModal();
    });

    this.dialog?.querySelectorAll('[data-admin-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dialog?.close();
      });
    });

    this.dialog?.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.dialog?.close();
      }
    });

    this.dialog?.addEventListener('close', () => {
      supabase.auth.signOut().catch(() => {});
      this.showLoginView();
    });

    // Supabase Auth Login Submit (Email + Password)
    this.loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userEl = document.getElementById('admin-user') as HTMLInputElement | null;
      const passEl = document.getElementById('admin-pass') as HTMLInputElement | null;
      const email = userEl?.value.trim() || '';
      const password = passEl?.value || '';

      const submitBtn = document.getElementById('admin-login-btn') as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (this.loginErr) {
            this.loginErr.textContent = `Đăng nhập không thành công: ${error.message}`;
            this.loginErr.hidden = false;
          }
        } else if (data.session) {
          if (this.loginErr) this.loginErr.hidden = true;
          this.workingLooks = JSON.parse(JSON.stringify(activeLooks));
          this.currentBrandLogo = activeBrandLogo;
          this.showEditorView();
          showToast('Đăng nhập Quản trị thành công');
        }
      } catch (err: any) {
        if (this.loginErr) {
          this.loginErr.textContent = err?.message || 'Lỗi kết nối xác thực Supabase';
          this.loginErr.hidden = false;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng Nhập Quản Trị';
        }
      }
    });

    // Add new product button (+ Thêm Sản Phẩm Mới) -> Default to EMPTY image waiting for update
    document.getElementById('admin-add-product')?.addEventListener('click', () => {
      this.commitCurrentSlotInputs();
      const newIdx = this.workingLooks.length;
      const nextCode = String(420 + (newIdx - 5) * 2);
      const newLook: FeedBagLook = {
        index: newIdx,
        key: 'look_' + Math.random().toString(36).substring(2, 8),
        code: nextCode,
        name: `Cám ${nextCode} — Dòng Chăn Nuôi Mới`,
        img640: '',
        img1080: '',
        offsetY: 0,
        scale: 1,
        pieces: '3 chỉ tiêu',
        qualityStd: 'Đạt Chuẩn ISO 22000',
        specs: [
          makeSpec('spec-target-grower', 48, 28, ''),
          makeSpec('spec-age-grower', 48, 58, ''),
          makeSpec('spec-nutri-high', 45, 90, ''),
        ],
      };
      this.workingLooks.push(newLook);
      this.selectedSlot = this.workingLooks.length - 1;
      this.renderSlotTabs();
      this.renderSelectedSlotEditor();
      showToast(`Đã thêm sản phẩm #${newIdx + 1} (chờ cập nhật hình ảnh)`);
    });

    // Delete current product button (Xóa Sản Phẩm Này)
    document.getElementById('admin-delete-product')?.addEventListener('click', () => {
      if (this.workingLooks.length <= 1) {
        showToast('Hệ thống yêu cầu giữ lại ít nhất 1 sản phẩm');
        return;
      }
      const currentName = this.workingLooks[this.selectedSlot]?.name || 'Sản phẩm';
      this.workingLooks.splice(this.selectedSlot, 1);
      this.workingLooks.forEach((look, i) => {
        look.index = i;
      });
      this.selectedSlot = Math.min(this.selectedSlot, this.workingLooks.length - 1);
      this.renderSlotTabs();
      this.renderSelectedSlotEditor();
      showToast(`Đã xóa "${currentName}" — bấm LƯU để cập nhật`);
    });

    // Brand Logo URL preview update
    const brandLogoUrlInput = document.getElementById('admin-brand-logo-url') as HTMLInputElement | null;
    brandLogoUrlInput?.addEventListener('input', () => {
      const previewImg = document.getElementById('admin-brand-logo-preview') as HTMLImageElement | null;
      if (previewImg && brandLogoUrlInput.value.trim()) {
        previewImg.src = brandLogoUrlInput.value.trim();
        this.currentBrandLogo = brandLogoUrlInput.value.trim();
      }
    });

    // Brand Logo File Upload
    const brandLogoFileInput = document.getElementById('admin-brand-logo-file') as HTMLInputElement | null;
    brandLogoFileInput?.addEventListener('change', () => {
      const file = brandLogoFileInput.files?.[0];
      if (!file) return;
      this.readImageFileAsDataUrl(file, 240, (dataUrl) => {
        this.currentBrandLogo = dataUrl;
        const urlInput = document.getElementById('admin-brand-logo-url') as HTMLInputElement | null;
        const previewImg = document.getElementById('admin-brand-logo-preview') as HTMLImageElement | null;
        if (urlInput) urlInput.value = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        showToast('Đã tải ảnh logo — bấm "LƯU" để cập nhật');
      });
    });

    // Live Image URL preview update for Bag
    const img640Input = document.getElementById('admin-bag-img-640') as HTMLInputElement | null;
    img640Input?.addEventListener('input', () => {
      const previewImg = document.getElementById('admin-bag-preview-img') as HTMLImageElement | null;
      if (previewImg) {
        previewImg.src = img640Input.value.trim() || EMPTY_BAG_PLACEHOLDER;
      }
    });

    // Local File Upload for Feed Bag Packaging
    const bagFileInput = document.getElementById('admin-bag-file') as HTMLInputElement | null;
    bagFileInput?.addEventListener('change', () => {
      const file = bagFileInput.files?.[0];
      if (!file) return;
      this.readImageFileAsDataUrl(file, 960, (dataUrl) => {
        const i640 = document.getElementById('admin-bag-img-640') as HTMLInputElement | null;
        const i1080 = document.getElementById('admin-bag-img-1080') as HTMLInputElement | null;
        const previewImg = document.getElementById('admin-bag-preview-img') as HTMLImageElement | null;
        if (i640) i640.value = dataUrl;
        if (i1080) i1080.value = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        const look = this.workingLooks[this.selectedSlot];
        if (look) {
          look.img640 = dataUrl;
          look.img1080 = dataUrl;
        }
        showToast('Đã tải ảnh bao bì — bấm "LƯU" để cập nhật');
      });
    });

    // Real-time Vertical Offset Tuning (Lên / Xuống) & Scale Tuning (Phóng To / Nhỏ)
    const offsetSlider = document.getElementById('admin-offset-slider') as HTMLInputElement | null;
    const offsetBadge = document.getElementById('admin-offset-val-badge');
    const scaleSlider = document.getElementById('admin-scale-slider') as HTMLInputElement | null;
    const scaleBadge = document.getElementById('admin-scale-val-badge');

    const updatePreviewTransform = () => {
      const look = this.workingLooks[this.selectedSlot];
      const offsetY = look ? (look.offsetY ?? 0) : 0;
      const scale = look ? (look.scale ?? 1) : 1;
      const previewImg = document.getElementById('admin-bag-preview-img') as HTMLImageElement | null;
      if (previewImg) {
        previewImg.style.setProperty('--admin-preview-offset-y', `${offsetY}%`);
        previewImg.style.setProperty('--admin-preview-scale', `${scale}`);
        previewImg.style.transform = `translateY(${offsetY}%) scale(${scale})`;
      }
    };

    const applyOffsetVal = (val: number) => {
      const clamped = clamp(Math.round(val * 2) / 2, -30, 30);
      const look = this.workingLooks[this.selectedSlot];
      if (look) look.offsetY = clamped;
      if (offsetSlider) offsetSlider.value = String(clamped);
      if (offsetBadge) {
        if (clamped < 0) {
          offsetBadge.textContent = `${clamped}% (Nâng lên ${Math.abs(clamped)}%)`;
        } else if (clamped > 0) {
          offsetBadge.textContent = `+${clamped}% (Hạ xuống ${clamped}%)`;
        } else {
          offsetBadge.textContent = '0% (Chuẩn)';
        }
      }
      updatePreviewTransform();
    };

    const applyScaleVal = (val: number) => {
      const clampedPct = clamp(Math.round(val), 50, 150);
      const scale = clampedPct / 100;
      const look = this.workingLooks[this.selectedSlot];
      if (look) look.scale = scale;
      if (scaleSlider) scaleSlider.value = String(clampedPct);
      if (scaleBadge) {
        if (clampedPct > 100) {
          scaleBadge.textContent = `${clampedPct}% (+${clampedPct - 100}%)`;
        } else if (clampedPct < 100) {
          scaleBadge.textContent = `${clampedPct}% (-${100 - clampedPct}%)`;
        } else {
          scaleBadge.textContent = '100% (Chuẩn)';
        }
      }
      updatePreviewTransform();
    };

    offsetSlider?.addEventListener('input', () => {
      applyOffsetVal(parseFloat(offsetSlider.value) || 0);
    });

    document.getElementById('admin-offset-up')?.addEventListener('click', () => {
      const cur = parseFloat(offsetSlider?.value || '0') || 0;
      applyOffsetVal(cur - 1);
    });

    document.getElementById('admin-offset-down')?.addEventListener('click', () => {
      const cur = parseFloat(offsetSlider?.value || '0') || 0;
      applyOffsetVal(cur + 1);
    });

    document.getElementById('admin-offset-reset')?.addEventListener('click', () => {
      applyOffsetVal(0);
    });

    // Scale controls: Phóng to / Thu nhỏ (đồng nhất tỉ lệ ngang - dọc)
    scaleSlider?.addEventListener('input', () => {
      applyScaleVal(parseFloat(scaleSlider.value) || 100);
    });

    document.getElementById('admin-scale-up')?.addEventListener('click', () => {
      const cur = parseFloat(scaleSlider?.value || '100') || 100;
      applyScaleVal(cur + 5);
    });

    document.getElementById('admin-scale-down')?.addEventListener('click', () => {
      const cur = parseFloat(scaleSlider?.value || '100') || 100;
      applyScaleVal(cur - 5);
    });

    document.getElementById('admin-scale-reset')?.addEventListener('click', () => {
      applyScaleVal(100);
    });

    // Save (LƯU) -> Process base64 to Storage and upsert to site_config
    const saveBtn = document.getElementById('admin-save-apply') as HTMLButtonElement | null;
    saveBtn?.addEventListener('click', async () => {
      this.commitCurrentSlotInputs();

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'ĐANG LƯU...';
      }

      try {
        showToast('Đang tải ảnh và lưu cấu hình lên Supabase...');

        const payload: SiteConfigPayload = {
          brandLogo: this.currentBrandLogo,
          looks: this.workingLooks,
        };

        const saved = await saveSiteConfigToSupabase(payload);

        // Update in-memory state and active UI
        activeBrandLogo = saved.brandLogo;
        activeLooks = saved.looks;
        this.workingLooks = JSON.parse(JSON.stringify(saved.looks));
        this.currentBrandLogo = saved.brandLogo;

        setBrandLogo(this.currentBrandLogo);
        const rw = document.querySelector('runway-section') as RunwaySection | null;
        rw?.applyCmsChanges(this.workingLooks);

        this.renderBrandLogoFields();
        this.renderSlotTabs();
        this.renderSelectedSlotEditor();

        showToast(`Đã lưu ${this.workingLooks.length} sản phẩm lên Supabase thành công!`);
        this.dialog?.close();
      } catch (err: any) {
        console.error('Lỗi khi lưu Supabase:', err);
        showToast(err?.message || 'Lỗi lưu cấu hình lên Supabase. Vui lòng thử lại.');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'LƯU';
        }
      }
    });

    // Logout (Đăng Xuất)
    document.getElementById('admin-logout')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      this.showLoginView();
      this.dialog?.close();
      showToast('Đã đăng xuất khỏi Quản Trị');
    });
  }
}

new AdminCmsController();
