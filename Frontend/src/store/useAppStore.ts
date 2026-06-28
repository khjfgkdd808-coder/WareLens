import { create } from 'zustand'
import type {
  Gender, ImagePreview, UserInfo, UserInfoErrors,
  AnalysisStatus, AnalysisErrorCode,
  BodyAnalysisResult, AIExplanationResult,
  Product, CategoryFilter, SortKey, Season,
  Toast, ToastType, AsyncStatus,
  BodyPhotoChecklist, PhotoValidationStatus, PhotoValidationResult,
  SelectedClothing, TryOnStatus,
  Recommendation, ApiErrorCode,
} from '@/types'
import { ANALYSIS_STEPS } from '@/utils/constants'

const INIT_USER_INFO: UserInfo = { height: 0, weight: 0, gender: 'female' }
const INIT_CHECKLIST: BodyPhotoChecklist = {
  isFrontFull: false, isFullBody: false, isBodyVisible: false,
}

// PC 기본 8개, 모바일 대응은 컴포넌트에서 처리
const PAGE_SIZE_PC     = 8
const PAGE_SIZE_MOBILE = 6

interface AppStore {
  // ── Upload ─────────────────────────────────────────────────
  clothingPreviews:    ImagePreview[]
  fullBodyPreview:     ImagePreview | null
  bodyPhotoChecklist:  BodyPhotoChecklist
  userInfo:            UserInfo
  userInfoErrors:      UserInfoErrors
  addClothingImage:    (file: File) => void
  removeClothingImage: (id: string) => void
  setFullBodyImage:    (file: File) => void
  removeFullBodyImage: () => void
  setBodyPhotoCheck:   (key: keyof BodyPhotoChecklist, val: boolean) => void
  setUserInfo:         (patch: Partial<UserInfo>) => void
  setUserInfoError:    (field: keyof UserInfoErrors, msg: string) => void
  clearUserInfoErrors: () => void
  resetUpload:         () => void
  isUploadReady:       () => boolean
  isChecklistDone:     () => boolean

  // ── Photo Validation (AI 자동 검증) ───────────────────────
  photoValidationStatus:  PhotoValidationStatus
  photoValidationMessage: string
  photoValidationChecks:  PhotoValidationResult['checks'] | null
  setPhotoValidation:     (result: PhotoValidationResult) => void
  setPhotoValidating:     () => void
  resetPhotoValidation:   () => void

  // ── Analysis ───────────────────────────────────────────────
  taskId:             string | null
  analysisStatus:     AnalysisStatus
  analysisErrorCode:  AnalysisErrorCode | null
  progress:           number
  bodyAnalysis:       BodyAnalysisResult | null
  aiExplanation:      AIExplanationResult | null
  analysisError:      string | null
  setTaskId:          (id: string) => void
  setAnalysisStatus:  (s: AnalysisStatus) => void
  setAnalysisResult:  (r: { bodyAnalysis?: BodyAnalysisResult; aiExplanation?: AIExplanationResult }) => void
  setAnalysisError:   (msg: string, code?: AnalysisErrorCode) => void
  resetAnalysis:      () => void

  // ── Recommend ──────────────────────────────────────────────
  products:           Product[]
  totalCount:         number
  hasMore:            boolean
  activeCategory:     CategoryFilter
  activeSeason:       Season
  sortKey:            SortKey
  wishlistIds:        Set<string>
  selectedProductId:  string | null
  recommendStatus:    AsyncStatus
  visibleCount:       number
  pageSizePC:         number
  pageSizeMobile:     number
  setProducts:        (p: Product[], total: number, hasMore: boolean) => void
  appendProducts:     (p: Product[]) => void
  setActiveCategory:  (cat: CategoryFilter) => void
  setActiveSeason:    (season: Season) => void
  setSortKey:         (key: SortKey) => void
  toggleWishlist:     (id: string) => void
  selectProduct:      (id: string | null) => void
  setRecommendStatus: (s: AsyncStatus) => void
  loadMore:           () => void
  resetVisible:       () => void
  getFilteredProducts: () => Product[]
  getVisibleProducts:  () => Product[]

  // ── Try-On (가상 피팅) ─────────────────────────────────────
  tryOnSelectedClothing: SelectedClothing | null
  tryOnStatus:           TryOnStatus
  tryOnResultImageUrl:   string | null
  tryOnError:            string | null
  setTryOnClothing:      (clothing: SelectedClothing | null) => void
  setTryOnStatus:        (status: TryOnStatus) => void
  setTryOnResult:        (url: string) => void
  setTryOnError:         (msg: string) => void
  resetTryOn:            () => void

  // ── 의류 선택 (Recommendation 원본 보존) ──────────────────
  /**
   * 사용자가 선택한 추천 의류의 원본 Recommendation 데이터
   * Try-On API 요청 시 item_id, image_url, sub_category 등을 그대로 전달하기 위해 보존
   */
  selectedRecommendation: Recommendation | null
  setSelectedRecommendation: (rec: Recommendation | null) => void

  // ── 추천 로딩/에러 상태 ────────────────────────────────────
  isRecommendLoading: boolean
  recommendError:     string | null
  setRecommendLoading: (loading: boolean) => void
  setRecommendApiError: (msg: string | null) => void

  // ── UI ─────────────────────────────────────────────────────
  isGlobalLoading:      boolean
  globalLoadingMessage: string
  toasts:               Toast[]
  /** ErrorModal 표시용 에러코드 (null이면 모달 닫힘) */
  errorModalCode:       ApiErrorCode | null
  errorModalRetry:      (() => void) | null
  showGlobalLoading:    (msg?: string) => void
  hideGlobalLoading:    () => void
  addToast:             (type: ToastType, message: string, duration?: number) => string
  removeToast:          (id: string) => void
  openErrorModal:       (code: ApiErrorCode, onRetry?: () => void) => void
  closeErrorModal:      () => void
}

export const useAppStore = create<AppStore>((set, get) => ({

  // ══ Upload ══════════════════════════════════════════════════
  clothingPreviews:   [],
  fullBodyPreview:    null,
  bodyPhotoChecklist: INIT_CHECKLIST,
  userInfo:           INIT_USER_INFO,
  userInfoErrors:     {},

  addClothingImage: (file) => {
    if (get().clothingPreviews.length >= 5) return
    set((s) => ({ clothingPreviews: [...s.clothingPreviews, {
      id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file),
    }]}))
  },
  removeClothingImage: (id) => {
    const t = get().clothingPreviews.find((p) => p.id === id)
    if (t) URL.revokeObjectURL(t.previewUrl)
    set((s) => ({ clothingPreviews: s.clothingPreviews.filter((p) => p.id !== id) }))
  },
  setFullBodyImage: (file) => {
    const prev = get().fullBodyPreview
    if (prev) URL.revokeObjectURL(prev.previewUrl)
    set({ fullBodyPreview: { id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) } })
  },
  removeFullBodyImage: () => {
    const prev = get().fullBodyPreview
    if (prev) URL.revokeObjectURL(prev.previewUrl)
    set({ fullBodyPreview: null, bodyPhotoChecklist: INIT_CHECKLIST })
  },
  setBodyPhotoCheck: (key, val) =>
    set((s) => ({ bodyPhotoChecklist: { ...s.bodyPhotoChecklist, [key]: val } })),
  setUserInfo: (patch) =>
    set((s) => ({ userInfo: { ...s.userInfo, ...patch } })),
  setUserInfoError: (field, msg) =>
    set((s) => ({ userInfoErrors: msg
      ? { ...s.userInfoErrors, [field]: msg }
      : Object.fromEntries(Object.entries(s.userInfoErrors).filter(([k]) => k !== field))
    })),
  clearUserInfoErrors: () => set({ userInfoErrors: {} }),
  resetUpload: () => {
    get().clothingPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    const fb = get().fullBodyPreview
    if (fb) URL.revokeObjectURL(fb.previewUrl)
    set({ clothingPreviews: [], fullBodyPreview: null,
          userInfo: INIT_USER_INFO, userInfoErrors: {},
          bodyPhotoChecklist: INIT_CHECKLIST })
  },
  isUploadReady: () => {
    const { clothingPreviews, fullBodyPreview, userInfo, photoValidationStatus } = get()
    // 체크리스트 대신 AI 자동 검증 통과 여부로 ready 판단
    return clothingPreviews.length > 0
      && fullBodyPreview !== null
      && photoValidationStatus === 'success'
      && userInfo.height > 0
      && userInfo.weight > 0
  },
  isChecklistDone: () => get().photoValidationStatus === 'success',

  // ══ Photo Validation ════════════════════════════════════════
  photoValidationStatus:  'idle',
  photoValidationMessage: '',
  photoValidationChecks:  null,

  setPhotoValidating: () => set({
    photoValidationStatus:  'validating',
    photoValidationMessage: 'AI 자동 확인 중...',
    photoValidationChecks:  null,
  }),
  setPhotoValidation: (result) => set({
    photoValidationStatus:  result.status,
    photoValidationMessage: result.message,
    photoValidationChecks:  result.checks,
  }),
  resetPhotoValidation: () => set({
    photoValidationStatus:  'idle',
    photoValidationMessage: '',
    photoValidationChecks:  null,
  }),

  // ══ Analysis ════════════════════════════════════════════════
  taskId: null, analysisStatus: 'PENDING', analysisErrorCode: null,
  progress: 0, bodyAnalysis: null, aiExplanation: null, analysisError: null,

  setTaskId: (id) => set({ taskId: id }),
  setAnalysisStatus: (status) =>
    set({ analysisStatus: status, progress: ANALYSIS_STEPS[status].progress }),
  setAnalysisResult: ({ bodyAnalysis, aiExplanation }) =>
    set({ bodyAnalysis: bodyAnalysis ?? null, aiExplanation: aiExplanation ?? null }),
  setAnalysisError: (msg, code = 'UNKNOWN') =>
    set({ analysisStatus: 'ERROR', analysisError: msg, analysisErrorCode: code }),
  resetAnalysis: () =>
    set({ taskId: null, analysisStatus: 'PENDING', progress: 0,
          bodyAnalysis: null, aiExplanation: null,
          analysisError: null, analysisErrorCode: null }),

  // ══ Recommend ═══════════════════════════════════════════════
  products: [], totalCount: 0, hasMore: false,
  activeCategory: '전체', activeSeason: 'all', sortKey: 'similarity',
  wishlistIds: new Set(), selectedProductId: null,
  recommendStatus: 'idle',
  visibleCount: PAGE_SIZE_PC,
  pageSizePC: PAGE_SIZE_PC,
  pageSizeMobile: PAGE_SIZE_MOBILE,

  setProducts: (products, totalCount, hasMore) =>
    set({ products, totalCount, hasMore, visibleCount: PAGE_SIZE_PC }),
  appendProducts: (newProducts) =>
    set((s) => ({ products: [...s.products, ...newProducts] })),
  setActiveCategory: (cat) => set({ activeCategory: cat, visibleCount: PAGE_SIZE_PC }),
  setActiveSeason:   (season) => set({ activeSeason: season, visibleCount: PAGE_SIZE_PC }),
  setSortKey:        (key) => set({ sortKey: key }),
  toggleWishlist: (id) => set((s) => {
    const next = new Set(s.wishlistIds)
    next.has(id) ? next.delete(id) : next.add(id)
    return { wishlistIds: next }
  }),
  selectProduct:      (id) => set({ selectedProductId: id }),
  setRecommendStatus: (s) => set({ recommendStatus: s }),
  loadMore: () => set((s) => ({ visibleCount: s.visibleCount + s.pageSizePC })),
  resetVisible: () => set({ visibleCount: PAGE_SIZE_PC }),

  getFilteredProducts: () => {
    const { products, activeCategory, activeSeason, sortKey, wishlistIds } = get()
    let list = (activeCategory === '전체' || activeCategory === '전체 상의')
      ? products
      : products.filter((p) => p.category === activeCategory)
    // 계절 필터 — spring/fall 동일 처리
    if (activeSeason !== 'all') {
      const target = activeSeason === 'spring' ? ['spring', 'fall'] : [activeSeason]
      list = list.filter((p) => !p.season || target.includes(p.season))
    }
    list = [...list].sort((a, b) =>
      sortKey === 'price_asc'  ? a.price - b.price :
      sortKey === 'price_desc' ? b.price - a.price :
      b.similarityScore - a.similarityScore)
    return list.map((p) => ({ ...p, isWishlisted: wishlistIds.has(p.id) }))
  },
  getVisibleProducts: () => {
    const { visibleCount } = get()
    return get().getFilteredProducts().slice(0, visibleCount)
  },

  // ══ Try-On ══════════════════════════════════════════════════
  tryOnSelectedClothing: null,
  tryOnStatus:           'idle',
  tryOnResultImageUrl:   null,
  tryOnError:            null,

  setTryOnClothing: (clothing) => set({
    tryOnSelectedClothing: clothing,
    tryOnStatus:           'idle',
    tryOnResultImageUrl:   null,
    tryOnError:            null,
  }),
  setTryOnStatus:  (status) => set({ tryOnStatus: status }),
  setTryOnResult:  (url)    => set({ tryOnStatus: 'success', tryOnResultImageUrl: url, tryOnError: null }),
  setTryOnError:   (msg)    => set({ tryOnStatus: 'error',   tryOnError: msg }),
  resetTryOn: () => set({
    tryOnSelectedClothing: null,
    tryOnStatus:           'idle',
    tryOnResultImageUrl:   null,
    tryOnError:            null,
  }),

  // ══ 의류 선택 (Recommendation 원본 보존) ═════════════════════
  selectedRecommendation: null,
  setSelectedRecommendation: (rec) => set({ selectedRecommendation: rec }),

  // ══ 추천 로딩/에러 ══════════════════════════════════════════
  isRecommendLoading:   false,
  recommendError:       null,
  setRecommendLoading:  (loading) => set({ isRecommendLoading: loading }),
  setRecommendApiError: (msg)     => set({ recommendError: msg }),

  // ══ UI ══════════════════════════════════════════════════════
  isGlobalLoading: false, globalLoadingMessage: '', toasts: [],
  errorModalCode: null, errorModalRetry: null,
  showGlobalLoading: (msg = '처리 중...') =>
    set({ isGlobalLoading: true, globalLoadingMessage: msg }),
  hideGlobalLoading: () => set({ isGlobalLoading: false, globalLoadingMessage: '' }),
  addToast: (type, message, duration = 3500) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) setTimeout(() => get().removeToast(id), duration)
    return id
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openErrorModal:  (code, onRetry) => set({ errorModalCode: code, errorModalRetry: onRetry ?? null }),
  closeErrorModal: () => set({ errorModalCode: null, errorModalRetry: null }),
}))
