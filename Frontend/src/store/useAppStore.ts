import { create } from 'zustand'
import type {
  Gender, ImagePreview, UserInfo, UserInfoErrors,
  AnalysisStatus, BodyAnalysisResult, AIExplanationResult,
  Product, CategoryFilter, SortKey,
  Toast, ToastType, AppError, AsyncStatus,
} from '@/types'
import { MAX_CLOTHING_IMAGES, ANALYSIS_STEPS } from '@/utils/constants'

// ─── 초기값 ─────────────────────────────────────────────────
const INIT_USER_INFO: UserInfo = { height: 0, weight: 0, gender: 'female' }

// ─── Store 타입 ──────────────────────────────────────────────
interface AppStore {
  // Upload
  clothingPreviews:    ImagePreview[]
  fullBodyPreview:     ImagePreview | null
  userInfo:            UserInfo
  userInfoErrors:      UserInfoErrors
  addClothingImage:    (file: File) => void
  removeClothingImage: (id: string) => void
  setFullBodyImage:    (file: File) => void
  removeFullBodyImage: () => void
  setUserInfo:         (patch: Partial<UserInfo>) => void
  setUserInfoError:    (field: keyof UserInfoErrors, msg: string) => void
  clearUserInfoErrors: () => void
  resetUpload:         () => void
  isUploadReady:       () => boolean

  // Analysis
  taskId:          string | null
  analysisStatus:  AnalysisStatus
  progress:        number
  bodyAnalysis:    BodyAnalysisResult | null
  aiExplanation:   AIExplanationResult | null
  analysisError:   string | null
  setTaskId:       (id: string) => void
  setAnalysisStatus:(s: AnalysisStatus) => void
  setAnalysisResult:(r: { bodyAnalysis?: BodyAnalysisResult; aiExplanation?: AIExplanationResult }) => void
  setAnalysisError: (msg: string) => void
  resetAnalysis:    () => void

  // Recommend
  products:         Product[]
  totalCount:       number
  hasMore:          boolean
  activeCategory:   CategoryFilter
  sortKey:          SortKey
  wishlistIds:      Set<string>
  recommendStatus:  AsyncStatus
  recommendError:   AppError | null
  setProducts:      (products: Product[], total: number, hasMore: boolean) => void
  setActiveCategory:(cat: CategoryFilter) => void
  setSortKey:       (key: SortKey) => void
  toggleWishlist:   (id: string) => void
  setRecommendStatus:(s: AsyncStatus) => void
  setRecommendError: (e: AppError | null) => void
  getFilteredProducts: () => Product[]

  // UI
  isGlobalLoading:     boolean
  globalLoadingMessage:string
  toasts:              Toast[]
  showGlobalLoading:   (msg?: string) => void
  hideGlobalLoading:   () => void
  addToast:            (type: ToastType, message: string, duration?: number) => string
  removeToast:         (id: string) => void
}

// ─── Store 생성 ──────────────────────────────────────────────
export const useAppStore = create<AppStore>((set, get) => ({

  // ══ Upload ══════════════════════════════════════════════════
  clothingPreviews: [],
  fullBodyPreview:  null,
  userInfo:         INIT_USER_INFO,
  userInfoErrors:   {},

  addClothingImage: (file) => {
    if (get().clothingPreviews.length >= MAX_CLOTHING_IMAGES) return
    const preview: ImagePreview = {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }
    set((s) => ({ clothingPreviews: [...s.clothingPreviews, preview] }))
  },

  removeClothingImage: (id) => {
    const target = get().clothingPreviews.find((p) => p.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
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
    set({ fullBodyPreview: null })
  },

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
    set({ clothingPreviews: [], fullBodyPreview: null, userInfo: INIT_USER_INFO, userInfoErrors: {} })
  },

  isUploadReady: () => {
    const { clothingPreviews, fullBodyPreview, userInfo } = get()
    return clothingPreviews.length > 0 && fullBodyPreview !== null && userInfo.height > 0 && userInfo.weight > 0
  },

  // ══ Analysis ════════════════════════════════════════════════
  taskId:         null,
  analysisStatus: 'PENDING',
  progress:       0,
  bodyAnalysis:   null,
  aiExplanation:  null,
  analysisError:  null,

  setTaskId: (id) => set({ taskId: id }),

  setAnalysisStatus: (status) =>
    set({ analysisStatus: status, progress: ANALYSIS_STEPS[status].progress }),

  setAnalysisResult: ({ bodyAnalysis, aiExplanation }) =>
    set({ bodyAnalysis: bodyAnalysis ?? null, aiExplanation: aiExplanation ?? null }),

  setAnalysisError: (msg) => set({ analysisStatus: 'ERROR', analysisError: msg }),

  resetAnalysis: () =>
    set({ taskId: null, analysisStatus: 'PENDING', progress: 0, bodyAnalysis: null, aiExplanation: null, analysisError: null }),

  // ══ Recommend ═══════════════════════════════════════════════
  products:        [],
  totalCount:      0,
  hasMore:         false,
  activeCategory:  '전체',
  sortKey:         'similarity',
  wishlistIds:     new Set(),
  recommendStatus: 'idle',
  recommendError:  null,

  setProducts: (products, totalCount, hasMore) => set({ products, totalCount, hasMore }),

  setActiveCategory: (cat) => set({ activeCategory: cat }),

  setSortKey: (key) => set({ sortKey: key }),

  toggleWishlist: (id) =>
    set((s) => {
      const next = new Set(s.wishlistIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { wishlistIds: next }
    }),

  setRecommendStatus: (s) => set({ recommendStatus: s }),
  setRecommendError:  (e) => set({ recommendError: e }),

  getFilteredProducts: () => {
    const { products, activeCategory, sortKey, wishlistIds } = get()
    let list = activeCategory === '전체' ? products : products.filter((p) => p.category === activeCategory)
    list = [...list].sort((a, b) =>
      sortKey === 'price_asc'  ? a.price - b.price :
      sortKey === 'price_desc' ? b.price - a.price :
      b.similarityScore - a.similarityScore
    )
    return list.map((p) => ({ ...p, isWishlisted: wishlistIds.has(p.id) }))
  },

  // ══ UI ══════════════════════════════════════════════════════
  isGlobalLoading:      false,
  globalLoadingMessage: '',
  toasts:               [],

  showGlobalLoading: (msg = '처리 중...') => set({ isGlobalLoading: true, globalLoadingMessage: msg }),
  hideGlobalLoading: () => set({ isGlobalLoading: false, globalLoadingMessage: '' }),

  addToast: (type, message, duration = 3000) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) setTimeout(() => get().removeToast(id), duration)
    return id
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
