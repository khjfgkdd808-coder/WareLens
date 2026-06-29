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

// ── CLIP API 추천 결과 원본 타입 ──────────────────────────────
/**
 * CLIP API (POST /internal/clip/recommend) 응답의 단일 추천 항목
 * 필드명은 CLIP 팀 API 명세를 그대로 유지합니다.
 */
export interface Recommendation {
  rank:         number   // 추천 순위
  item_id:      number   // 상품 고유 ID
  image_url:    string   // 의류 이미지 URL
  score:        number   // CLIP 유사도 점수 (0~1)
  category:     string   // 상위 카테고리 (예: "TOP")
  sub_category: string   // 세부 카테고리 (예: "셔츠/블라우스")
  color:        string   // 색상
  pattern:      string   // 패턴 (예: "무지", "스트라이프")
  season?:      Season   // [Draft] 계절 필터용 (Backend 협의 후 확정)
}

// ── Backend 통합 추천 API 타입 ────────────────────────────────
/**
 * POST /api/v1/recommend 요청 (multipart/form-data)
 */
export interface RecommendRequest {
  gender:       Gender
  height_cm:    number
  weight_kg:    number
  body_image:   File
  style_images: File[]
}

/**
 * POST /api/v1/recommend 응답
 * Backend가 MediaPipe + CLIP 결과를 통합하여 반환
 */
export interface RecommendResponse {
  status: 'SUCCESS' | 'FAIL'
  data: {
    body_result:       BodyAnalysisResult
    size_recommendation: {
      recommended_size: string
      ks_label:         string
      reasons:          string[]
    }
    style_analysis: {
      top_categories: string[]
      top_colors:     string[]
    }
    recommendations: Recommendation[]
  }
}

// ── 가상 피팅 (Try-On) ───────────────────────────────────────
export type TryOnStatus = 'idle' | 'loading' | 'success' | 'error'

/** Try-On 요청에 필요한 선택 의류 정보 */
export interface SelectedClothing {
  id:       string
  name:     string
  imageUrl: string
  category: ProductCategory
}

/** POST /api/tryon 요청 */
export interface TryOnRequest {
  personImage:   File | string   // 사용자 전신사진 (File 또는 URL)
  clothingImage: string           // 의류 이미지 URL
}

/** POST /api/tryon 응답 */
export interface TryOnResponse {
  resultImageUrl: string
}

/** Try-On 전체 상태 */
export interface TryOnState {
  selectedClothing: SelectedClothing | null
  status:           TryOnStatus
  resultImageUrl:   string | null
  error:            string | null
}

// 계절 필터
export type Season = 'all' | 'spring' | 'summer' | 'fall' | 'winter'
export const SEASON_LABELS: Record<Season, string> = {
  all:    '전체',
  spring: '봄/가을',
  summer: '여름',
  fall:   '봄/가을',
  winter: '겨울',
}

// 전신사진 AI 자동 검증 상태
export type PhotoValidationStatus = 'idle' | 'validating' | 'success' | 'error'
export interface PhotoValidationResult {
  status: PhotoValidationStatus
  message: string
  checks: {
    isFrontFull:   boolean
    isFullBody:    boolean
    isBodyVisible: boolean
  }
}

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

/**
 * Backend/AI API가 반환하는 에러 코드
 * 실제 연동 시 이 목록을 기준으로 메시지를 매핑합니다.
 *
 * 사용 기준:
 * - MODAL  : 사용자가 반드시 확인해야 하는 오류 (재업로드 필요)
 * - TOAST  : 가벼운 알림 (포맷, 용량 등)
 * - INLINE : 현재 화면에서 즉시 수정 가능한 오류
 */
export type ApiErrorCode =
  // ── 전신 사진 관련 (MODAL) ──────────────────────────────
  | 'NOT_FULL_BODY'        // 전신이 모두 보이지 않음
  | 'MULTIPLE_PERSON'      // 여러 명 포함
  | 'POSE_DETECTION_FAIL'  // 신체 인식 실패
  // ── 의류 이미지 관련 (MODAL) ────────────────────────────
  | 'NOT_CLOTHING_IMAGE'   // 의류가 없는 이미지
  // ── AI 분석 관련 (MODAL) ────────────────────────────────
  | 'ANALYSIS_FAILED'      // AI 분석 실패
  | 'RECOMMENDATION_FAILED'// 추천 결과 생성 실패
  // ── 서버/네트워크 관련 (MODAL) ──────────────────────────
  | 'SERVER_ERROR'         // 서버 오류
  | 'TIMEOUT'              // 응답 시간 초과
  // ── 파일 업로드 관련 (TOAST) ────────────────────────────
  | 'INVALID_FILE_TYPE'    // 지원하지 않는 파일 형식
  | 'FILE_TOO_LARGE'       // 파일 크기 초과
  // ── 레거시 / 기타 ───────────────────────────────────────
  | 'BODY_NOT_DETECTED'
  | 'LOW_VISIBILITY'
  | 'UPLOAD_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

/** Backend API 에러 응답 표준 구조 */
export interface ApiErrorResponse {
  success:   false
  errorCode: ApiErrorCode
  message:   string        // 서버 원본 메시지 (로깅용)
}

/** ErrorModal에 전달하는 props */
export interface ErrorModalProps {
  isOpen:    boolean
  errorCode: ApiErrorCode | null
  onClose:   () => void
  onRetry?:  () => void    // 재시도 버튼 (선택)
}

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
  season?: Season           // 계절 필터용
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

// ── 인증 (Auth) ───────────────────────────────────────────────
export interface SignupRequest {
  email:    string
  password: string
  nickname: string
}

export interface SignupResponse {
  success: boolean
  message: string
  data?: {
    userId:   string
    email:    string
    nickname: string
  }
}

export interface LoginRequest {
  email:    string
  password: string
}

export interface LoginResponse {
  success:     boolean
  accessToken: string
  user: {
    userId:   string
    email:    string
    nickname: string
  }
}

// ── 사용자 프로필 ──────────────────────────────────────────────
export interface UserProfile {
  userId:    string
  email:     string
  nickname:  string
  avatarUrl?: string
  createdAt: string
  bodyInfo?: {
    height: number
    weight: number
    gender: Gender
  }
}

// ── 마이페이지 데이터 ─────────────────────────────────────────
export interface MyRecommendation {
  id:          string
  productId:   string
  name:        string
  imageUrl:    string
  category:    string
  score:       number
  reason:      string
  recommendedAt: string
}

export interface MyFavorite {
  id:          string
  productId:   string
  name:        string
  imageUrl:    string
  category:    string
  savedAt:     string
}

export interface MyFitting {
  id:           string
  clothingName: string
  clothingImage: string
  resultImage:  string
  fittedAt:     string
}

export interface MyPageData {
  profile:         UserProfile
  recommendations: MyRecommendation[]
  favorites:       MyFavorite[]
  fittings:        MyFitting[]
}
