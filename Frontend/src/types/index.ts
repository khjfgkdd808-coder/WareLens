// ── 열거형 타입 ──────────────────────────────────────────────
export type Gender         = 'male' | 'female'
export type BodyType       = '마른 체형' | '보통 체형' | '근육형' | '통통한 체형'
export type SizeLabel      = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type AsyncStatus    = 'idle' | 'loading' | 'success' | 'error'
export type ToastType      = 'success' | 'error' | 'warning' | 'info'
export type RecommendBadge = '어깨 비율 보완' | '상체 밸런스 조절' | '체형 적합' | '스타일 유사' | '색상 유사'

// 카테고리: 상의 세분화 + 나머지 준비중
export type TopSubCategory = '반팔 티셔츠' | '긴팔 티셔츠' | '셔츠/블라우스' | '니트/스웨터'
export type ProductCategory = '전체 상의' | TopSubCategory | '하의' | '원피스' | '아우터'
export type CategoryFilter  = '전체' | ProductCategory

export type SortKey = 'similarity' | 'price_asc' | 'price_desc'

export type AnalysisStatus =
  | 'PENDING' | 'UPLOADING' | 'BODY_ANALYZING'
  | 'STYLE_ANALYZING' | 'GENERATING' | 'DONE' | 'ERROR'

// 에러 코드 (AI 분석 에러)
export type AnalysisErrorCode =
  | 'BODY_NOT_DETECTED'
  | 'LOW_VISIBILITY'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

// ── 공통 ─────────────────────────────────────────────────────
export interface AppError    { message: string; code?: AnalysisErrorCode }
export interface Toast       { id: string; type: ToastType; message: string; duration: number }
export interface ImagePreview { id: string; file: File; previewUrl: string }
export interface UserInfoErrors { height?: string; weight?: string }

// ── 사용자 입력 ──────────────────────────────────────────────
export interface UserInfo { height: number; weight: number; gender: Gender }

// ── 전신사진 체크리스트 ──────────────────────────────────────
export interface BodyPhotoChecklist {
  isFrontFull: boolean    // 정면 전신 사진
  isFullBody:  boolean    // 얼굴~발끝 모두 보임
  isBodyVisible: boolean  // 몸 형태 확인 가능한 옷
}

// ── 상품 ─────────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  category: ProductCategory
  imageUrl: string
  /** PNG 투명 배경 이미지 (가상 피팅 오버레이용) */
  overlayImageUrl?: string
  price: number
  colors: string[]
  similarityScore: number
  recommendBadges: RecommendBadge[]
  /** 어깨 좌표 기반 배치 정보 (Mock) */
  fitPosition?: { top: string; left: string; width: string }
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
export interface AIExplanationResult {
  analyzedImageCount: number
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
