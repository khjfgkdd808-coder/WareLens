import { create } from 'zustand'
import type {
  Gender, ImagePreview, UserInfo, UserInfoErrors,
  AnalysisStatus, AnalysisErrorCode,
  BodyAnalysisResult, AIExplanationResult,
  Product, CategoryFilter, SortKey, Season,
  Toast, ToastType, AppError, AsyncStatus,
  PhotoValidationResult, MediaPipeLandmarks,
} from '@/types'
import { ANALYSIS_STEPS } from '@/utils/constants'

const INIT_USER_INFO: UserInfo = { height: 0, weight: 0, gender: 'female' }
const INIT_PHOTO_VALIDATION: PhotoValidationResult = { status: 'idle', message: '' }
const MAX_CLOTHING = 5

interface AppStore {
  // ── Upload ────────────────────────────────────────────────
  clothingPreviews:    ImagePreview[]
  fullBodyPreview:     ImagePreview | null
  photoValidation:     PhotoValidationResult
  userInfo:            UserInfo
  userInfoErrors:      UserInfoErrors
  addClothingImage:    (file: File) => void
  removeClothingImage: (id: string) => void
  setFullBodyImage:    (file: File) => void
  removeFullBodyImage: () => void
  setPhotoValidation:  (result: PhotoValidationResult) => void
  setUserInfo:         (patch: Partial<UserInfo>) => void
  setUserInfoError:    (field: keyof UserInfoErrors, msg: string) => void
  clearUserInfoErrors: () => void
  resetUpload:         () => void
  isUploadReady:       () => boolean

  // ── Analysis ──────────────────────────────────────────────
  taskId:            string | null
  analysisStatus:    AnalysisStatus
  analysisErrorCode: AnalysisErrorCode | null
  progress:          number
  bodyAnalysis:      BodyAnalysisResult | null
  aiExplanation:     AIExplanationResult | null
  analysisError:     string | null
  landmarks:         MediaPipeLandmarks | null
  setTaskId:         (id: string) => void
  setAnalysisStatus: (s: AnalysisStatus) => void
  setAnalysisResult: (r: { bodyAnalysis?: BodyAnalysisResult; aiExplanation?: AIExplanationResult; landmarks?: MediaPipeLandmarks }) => void
  setAnalysisError:  (msg: string, code?: AnalysisErrorCode) => void
  resetAnalysis:     () => void

  // ── Recommend ─────────────────────────────────────────────
  products:           Product[]
  totalCount:         number
  hasMore:            boolean
  activeCategory:     CategoryFilter
  activeSeason:       Season           // ← 계절 필터
  sortKey:            SortKey
  wishlistIds:        Set<string>
  selectedProductId:  string | null
  recommendStatus:    AsyncStatus
  recommendError:     AppError | null
  visibleCount:       number           // ← Load More 용
  setProducts:        (p: Product[], total: number, hasMore: boolean) => void
  setActiveCategory:  (cat: CategoryFilter) => void
  setActiveSeason:    (season: Season) => void
  setSortKey:         (key: SortKey) => void
  toggleWishlist:     (id: string) => void
  selectProduct:      (id: string | null) => void
  setRecommendStatus: (s: AsyncStatus) => void
  setRecommendError:  (e: AppError | null) => void
  loadMore:           () => void
  getFilteredProducts: () => Product[]

  // ── UI ────────────────────────────────────────────────────
  isGlobalLoading:      boolean
  globalLoadingMessage: string
  toasts:               Toast[]
  showGlobalLoading:    (msg?: string) => void
  hideGlobalLoading:    () => void
  addToast:             (type: ToastType, message: string, duration?: number) => string
  removeToast:          (id: string) => void
}

export const useAppStore = create<AppStore>((set, get) => ({

  // ══ Upload ═════════════════════════════════════════════════
  clothingPreviews: [],
  fullBodyPreview:  null,
  photoValidation:  INIT_PHOTO_VALIDATION,
  userInfo:         INIT_USER_INFO,
  userInfoErrors:   {},

  addClothingImage: (file) => {
    if (get().clothingPreviews.length >= MAX_CLOTHING) return
    set((s) => ({
      clothingPreviews: [...s.clothingPreviews, {
        id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file),
      }],
    }))
  },
  removeClothingImage: (id) => {
    const t = get().clothingPreviews.find((p) => p.id === id)
    if (t) URL.revokeObjectURL(t.previewUrl)
    set((s) => ({ clothingPreviews: s.clothingPreviews.filter((p) => p.id !== id) }))
  },
  setFullBodyImage: (file) => {
    const prev = get().fullBodyPreview
    if (prev) URL.revokeObjectURL(prev.previewUrl)
    set({
      fullBodyPreview: { id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) },
      photoValidation: INIT_PHOTO_VALIDATION,
    })
  },
  removeFullBodyImage: () => {
    const prev = get().fullBodyPreview
    if (prev) URL.revokeObjectURL(prev.previewUrl)
    set({ fullBodyPreview: null, photoValidation: INIT_PHOTO_VALIDATION })
  },
  setPhotoValidation: (result) => set({ photoValidation: result }),
  setUserInfo: (patch) => set((s) => ({ userInfo: { ...s.userInfo, ...patch } })),
  setUserInfoError: (field, msg) =>
    set((s) => ({
      userInfoErrors: msg
        ? { ...s.userInfoErrors, [field]: msg }
        : Object.fromEntries(Object.entries(s.userInfoErrors).filter(([k]) => k !== field)),
    })),
  clearUserInfoErrors: () => set({ userInfoErrors: {} }),
  resetUpload: () => {
    get().clothingPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    const fb = get().fullBodyPreview
    if (fb) URL.revokeObjectURL(fb.previewUrl)
    set({ clothingPreviews: [], fullBodyPreview: null, userInfo: INIT_USER_INFO, userInfoErrors: {}, photoValidation: INIT_PHOTO_VALIDATION })
  },
  isUploadReady: () => {
    const { clothingPreviews, fullBodyPreview, userInfo, photoValidation } = get()
    return (
      clothingPreviews.length > 0 &&
      fullBodyPreview !== null &&
      photoValidation.status === 'success' &&
      userInfo.height > 0 &&
      userInfo.weight > 0
    )
  },

  // ══ Analysis ═══════════════════════════════════════════════
  taskId: null, analysisStatus: 'PENDING', analysisErrorCode: null,
  progress: 0, bodyAnalysis: null, aiExplanation: null,
  analysisError: null, landmarks: null,

  setTaskId: (id) => set({ taskId: id }),
  setAnalysisStatus: (status) =>
    set({ analysisStatus: status, progress: ANALYSIS_STEPS[status].progress }),
  setAnalysisResult: ({ bodyAnalysis, aiExplanation, landmarks }) =>
    set({ bodyAnalysis: bodyAnalysis ?? null, aiExplanation: aiExplanation ?? null, landmarks: landmarks ?? null }),
  setAnalysisError: (msg, code = 'UNKNOWN') =>
    set({ analysisStatus: 'ERROR', analysisError: msg, analysisErrorCode: code }),
  resetAnalysis: () =>
    set({ taskId: null, analysisStatus: 'PENDING', progress: 0, bodyAnalysis: null, aiExplanation: null, analysisError: null, analysisErrorCode: null, landmarks: null }),

  // ══ Recommend ══════════════════════════════════════════════
  products: [], totalCount: 0, hasMore: false,
  activeCategory: '전체', activeSeason: '전체',
  sortKey: 'similarity',
  wishlistIds: new Set(), selectedProductId: null,
  recommendStatus: 'idle', recommendError: null,
  visibleCount: 8,

  setProducts: (products, totalCount, hasMore) => set({ products, totalCount, hasMore, visibleCount: 8 }),
  setActiveCategory: (cat) => set({ activeCategory: cat, visibleCount: 8 }),
  setActiveSeason: (season) => set({ activeSeason: season, visibleCount: 8 }),
  setSortKey: (key) => set({ sortKey: key }),
  toggleWishlist: (id) =>
    set((s) => {
      const next = new Set(s.wishlistIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { wishlistIds: next }
    }),
  selectProduct: (id) => set({ selectedProductId: id }),
  setRecommendStatus: (s) => set({ recommendStatus: s }),
  setRecommendError: (e) => set({ recommendError: e }),
  loadMore: () => set((s) => ({ visibleCount: s.visibleCount + 8 })),

  getFilteredProducts: () => {
    const { products, activeCategory, activeSeason, sortKey, wishlistIds, visibleCount } = get()

    let list = (activeCategory === '전체' || activeCategory === '전체 상의')
      ? products
      : products.filter((p) => p.category === activeCategory)

    if (activeSeason !== '전체') {
      list = list.filter((p) => p.season === activeSeason)
    }

    list = [...list].sort((a, b) =>
      sortKey === 'price_asc'  ? a.similarityScore - b.similarityScore :
      sortKey === 'price_desc' ? b.similarityScore - a.similarityScore :
      b.similarityScore - a.similarityScore
    )

    return list
      .slice(0, visibleCount)
      .map((p) => ({ ...p, isWishlisted: wishlistIds.has(p.id) }))
  },

  // ══ UI ═════════════════════════════════════════════════════
  isGlobalLoading: false, globalLoadingMessage: '', toasts: [],

  showGlobalLoading: (msg = '처리 중...') => set({ isGlobalLoading: true, globalLoadingMessage: msg }),
  hideGlobalLoading: () => set({ isGlobalLoading: false, globalLoadingMessage: '' }),
  addToast: (type, message, duration = 3500) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) setTimeout(() => get().removeToast(id), duration)
    return id
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
