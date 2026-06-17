// ── 열거형 타입 ──────────────────────────────────────────────
export type Gender          = 'male' | 'female'
export type BodyType        = '마른 체형' | '보통 체형' | '근육형' | '통통한 체형'
export type SizeLabel       = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type ProductCategory = '상의' | '하의' | '원피스' | '아우터' | '니트'
export type CategoryFilter  = '전체' | ProductCategory
export type SortKey         = 'similarity' | 'price_asc' | 'price_desc'
export type RecommendBadge  = '색상 유사' | '스타일 유사' | '체형 적합'
export type AnalysisStatus  =
  | 'PENDING' | 'UPLOADING' | 'BODY_ANALYZING'
  | 'STYLE_ANALYZING' | 'GENERATING' | 'DONE' | 'ERROR'
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
export type ToastType   = 'success' | 'error' | 'warning' | 'info'

// ── 공통 ─────────────────────────────────────────────────────
export interface AppError    { message: string; code?: string }
export interface Toast       { id: string; type: ToastType; message: string; duration: number }
export interface ImagePreview { id: string; file: File; previewUrl: string }
export interface UserInfoErrors { height?: string; weight?: string }

// ── 사용자 입력 ──────────────────────────────────────────────
export interface UserInfo { height: number; weight: number; gender: Gender }

// ── 상품 ─────────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  category: ProductCategory
  imageUrl: string
  price: number
  colors: string[]
  similarityScore: number
  recommendBadges: RecommendBadge[]
  isWishlisted?: boolean
}

// ── 분석 결과 ────────────────────────────────────────────────
export interface RecommendedSize {
  top: SizeLabel
  topNumeric: string
  bottom: string
}
export interface BodyMeasurements {
  shoulderWidth: number
  chestCircumference: number
  waistCircumference: number
  hipCircumference: number
  legLength: number
}
export interface BodyAnalysisResult {
  bmi: number
  bodyType: BodyType
  recommendedSize: RecommendedSize
  bodyMeasurements: BodyMeasurements
  reasons: string[]
}
export interface CategoryPreference {
  category: ProductCategory
  percentage: number
}
export interface AIExplanationResult {
  analyzedImageCount: number
  preferredCategories: CategoryPreference[]
  recommendedSize: SizeLabel
  confidenceScore: number
  reasons: string[]
}
export interface AnalysisResultResponse {
  taskId: string
  status: AnalysisStatus
  bodyAnalysis?: BodyAnalysisResult
  recommendations?: Product[]
  aiExplanation?: AIExplanationResult
}
