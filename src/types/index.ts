export type Gender         = 'male' | 'female'
export type BodyType       = '마른 체형' | '보통 체형' | '근육형' | '통통한 체형'
export type SizeLabel      = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type AsyncStatus    = 'idle' | 'loading' | 'success' | 'error'
export type ToastType      = 'success' | 'error' | 'warning' | 'info'
export type RecommendBadge = '어깨 비율 보완' | '상체 밸런스 조절' | '체형 적합' | '스타일 유사' | '색상 유사'
export type Season         = '전체' | '봄/가을' | '여름' | '겨울'
export type TopSubCategory  = '반팔 티셔츠' | '긴팔 티셔츠' | '셔츠/블라우스' | '니트/스웨터'
export type ProductCategory = '전체 상의' | TopSubCategory | '하의' | '원피스' | '아우터'
export type CategoryFilter  = '전체' | ProductCategory
export type SortKey         = 'similarity' | 'price_asc' | 'price_desc'
export type AnalysisStatus  =
  | 'PENDING' | 'UPLOADING' | 'BODY_ANALYZING'
  | 'STYLE_ANALYZING' | 'GENERATING' | 'DONE' | 'ERROR'
export type AnalysisErrorCode =
  | 'BODY_NOT_DETECTED' | 'LOW_VISIBILITY'
  | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN'
export type PhotoValidationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PhotoValidationResult {
  status:   PhotoValidationStatus
  message:  string
  code?:    AnalysisErrorCode
}
export interface AppError     { message: string; code?: AnalysisErrorCode }
export interface Toast        { id: string; type: ToastType; message: string; duration: number }
export interface ImagePreview { id: string; file: File; previewUrl: string }
export interface UserInfoErrors { height?: string; weight?: string }
export interface UserInfo     { height: number; weight: number; gender: Gender }
export interface MediaPipeLandmarks {
  leftShoulder:  { x: number; y: number }
  rightShoulder: { x: number; y: number }
  leftHip:       { x: number; y: number }
  rightHip:      { x: number; y: number }
}
export interface Product {
  id:               string
  name:             string
  category:         ProductCategory
  season:           Season      // ← 계절 필터용
  imageUrl:         string
  overlayImageUrl?: string
  colors:           string[]
  similarityScore:  number
  recommendedSize?: string      // ← 사이즈 뱃지용 (예: "L / 100")
  recommendBadges:  RecommendBadge[]
  fitPosition?:     { top: string; left: string; width: string }
  isWishlisted?:    boolean
}
export interface RecommendedSize { top: SizeLabel; topNumeric: string; bottom: string }
export interface BodyMeasurements {
  shoulderWidth: number; chestCircumference: number
  waistCircumference: number; hipCircumference: number; legLength: number
}
export interface BodyAnalysisResult {
  bmi:              number
  bodyType:         BodyType
  recommendedSize:  RecommendedSize
  bodyMeasurements: BodyMeasurements
  reasons:          string[]
}
export interface AIExplanationResult {
  analyzedImageCount: number
  recommendedSize:    SizeLabel
  confidenceScore:    number
  reasons:            string[]
}
export interface AnalysisResultResponse {
  taskId:           string
  status:           AnalysisStatus
  bodyAnalysis?:    BodyAnalysisResult
  recommendations?: Product[]
  aiExplanation?:   AIExplanationResult
  landmarks?:       MediaPipeLandmarks
}
