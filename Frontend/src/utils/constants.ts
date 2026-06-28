import type { AnalysisStatus, CategoryFilter, SortKey, AnalysisErrorCode, ApiErrorCode } from '@/types'

export const MAX_CLOTHING_IMAGES  = 5
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024   // 10 MB
export const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ALLOWED_EXTENSIONS   = ['.jpg', '.jpeg', '.png', '.webp'] as const

// 분석 단계 정의
export const ANALYSIS_STEPS: Record<
  AnalysisStatus,
  { label: string; description: string; progress: number }
> = {
  PENDING:         { label: '준비 중',               description: '분석 요청을 준비하고 있습니다.',             progress: 0   },
  UPLOADING:       { label: '사진 업로드 완료',        description: '이미지가 서버에 전달됐습니다.',              progress: 20  },
  BODY_ANALYZING:  { label: '체형 분석 중',           description: 'AI가 이미지를 분석 중입니다...',            progress: 45  },
  STYLE_ANALYZING: { label: 'MediaPipe 좌표 계산 중', description: 'MediaPipe 신체 좌표를 계산하는 중...',       progress: 70  },
  GENERATING:      { label: '추천 의류 탐색 중',       description: '추천 의류를 찾는 중...',                   progress: 88  },
  DONE:            { label: '분석 완료!',             description: '결과가 준비됐습니다.',                      progress: 100 },
  ERROR:           { label: '분석 실패',              description: '오류가 발생했습니다.',                      progress: 0   },
}

// 레거시 에러코드 메시지 (LoadingPage 호환)
export const ANALYSIS_ERROR_MESSAGES: Record<AnalysisErrorCode, { title: string; desc: string; action: string }> = {
  BODY_NOT_DETECTED: {
    title:  '사진에서 인물을 찾지 못했어요.',
    desc:   '전신이 모두 보이는 사진으로 다시 업로드해 주세요.',
    action: '다시 업로드',
  },
  LOW_VISIBILITY: {
    title:  '관절 위치가 잘 보이지 않아요.',
    desc:   '밝은 장소에서 배경이 단순한 환경으로 다시 촬영해 주세요.',
    action: '다시 촬영',
  },
  UPLOAD_FAILED: {
    title:  '업로드에 실패했어요.',
    desc:   '네트워크 상태를 확인하고 다시 시도해 주세요.',
    action: '다시 시도',
  },
  NETWORK_ERROR: {
    title:  '서버와 연결이 끊겼어요.',
    desc:   '잠시 후 다시 시도해 주세요.',
    action: '다시 시도',
  },
  UNKNOWN: {
    title:  '알 수 없는 오류가 발생했어요.',
    desc:   '잠시 후 다시 시도해 주세요.',
    action: '다시 시도',
  },
}

/**
 * Backend/AI API errorCode → 사용자 표시 메시지 매핑
 *
 * displayType 기준:
 *  'modal' — 반드시 확인이 필요한 오류 (재업로드 필요)
 *  'toast' — 가벼운 알림 (포맷, 용량 오류 등)
 *
 * Backend errorCode 연결 방법:
 *  API 응답의 errorCode 값을 key로 사용합니다.
 *  예: handleApiError(response.errorCode)
 *
 * 새 errorCode 추가 시:
 *  1. types/index.ts의 ApiErrorCode 유니언에 추가
 *  2. 이 맵에 항목 추가
 */
export const API_ERROR_CONFIG: Record<ApiErrorCode, {
  title:       string
  message:     string
  action:      string
  displayType: 'modal' | 'toast'
}> = {
  // ── 전신 사진 관련 (MODAL) ─────────────────────────────
  NOT_FULL_BODY: {
    title:       '전신 사진이 필요합니다',
    message:     '얼굴부터 발끝까지 전신이 모두 보이는 사진을 업로드해주세요.',
    action:      '사진 다시 업로드',
    displayType: 'modal',
  },
  MULTIPLE_PERSON: {
    title:       '한 명의 사진만 업로드해주세요',
    message:     '사진에 여러 명이 포함되어 있습니다. 혼자 촬영한 전신 사진을 업로드해주세요.',
    action:      '사진 다시 업로드',
    displayType: 'modal',
  },
  POSE_DETECTION_FAIL: {
    title:       '신체 정보를 확인할 수 없습니다',
    message:     '신체 관절을 인식하지 못했습니다. 몸 형태가 잘 보이는 옷을 착용하고 밝은 배경에서 다시 촬영해주세요.',
    action:      '다시 업로드',
    displayType: 'modal',
  },
  // ── 의류 이미지 관련 (MODAL) ───────────────────────────
  NOT_CLOTHING_IMAGE: {
    title:       '의류 이미지를 업로드해주세요',
    message:     '의류가 잘 보이는 이미지를 업로드해주세요. 인물 착용 사진 또는 의류 단독 이미지를 권장합니다.',
    action:      '이미지 다시 선택',
    displayType: 'modal',
  },
  // ── AI 분석 관련 (MODAL) ───────────────────────────────
  ANALYSIS_FAILED: {
    title:       'AI 분석에 실패했습니다',
    message:     '이미지 분석 중 오류가 발생했습니다. 사진을 교체하거나 잠시 후 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  RECOMMENDATION_FAILED: {
    title:       '추천 결과 생성에 실패했습니다',
    message:     '의류 추천 결과를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  // ── 서버/네트워크 관련 (MODAL) ─────────────────────────
  SERVER_ERROR: {
    title:       '서버 오류가 발생했습니다',
    message:     '일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  TIMEOUT: {
    title:       '요청 시간이 초과됐습니다',
    message:     '서버 응답이 지연되고 있습니다. 네트워크 상태를 확인하고 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  // ── 파일 업로드 관련 (TOAST) ───────────────────────────
  INVALID_FILE_TYPE: {
    title:       '지원하지 않는 파일 형식',
    message:     'JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.',
    action:      '확인',
    displayType: 'toast',
  },
  FILE_TOO_LARGE: {
    title:       '파일 크기 초과',
    message:     '이미지 크기는 10MB 이하여야 합니다.',
    action:      '확인',
    displayType: 'toast',
  },
  // ── 레거시 (하위 호환) ─────────────────────────────────
  BODY_NOT_DETECTED: {
    title:       '사진에서 인물을 찾지 못했어요',
    message:     '전신이 모두 보이는 사진으로 다시 업로드해주세요.',
    action:      '다시 업로드',
    displayType: 'modal',
  },
  LOW_VISIBILITY: {
    title:       '관절 위치가 잘 보이지 않아요',
    message:     '밝은 장소에서 배경이 단순한 환경으로 다시 촬영해주세요.',
    action:      '다시 촬영',
    displayType: 'modal',
  },
  UPLOAD_FAILED: {
    title:       '업로드에 실패했어요',
    message:     '네트워크 상태를 확인하고 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  NETWORK_ERROR: {
    title:       '서버와 연결이 끊겼어요',
    message:     '잠시 후 다시 시도해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
  UNKNOWN: {
    title:       '알 수 없는 오류가 발생했어요',
    message:     '잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터에 문의해주세요.',
    action:      '다시 시도',
    displayType: 'modal',
  },
}

// 상의 세분화 카테고리 (활성)
export const TOP_CATEGORIES: CategoryFilter[] = [
  '전체', '전체 상의', '반팔 티셔츠', '긴팔 티셔츠', '셔츠/블라우스', '니트/스웨터',
]

// 준비중 카테고리
export const COMING_SOON_CATEGORIES = ['하의', '원피스', '아우터'] as const

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'similarity',  label: '추천 순'     },
  { key: 'price_asc',   label: '가격 낮은 순' },
  { key: 'price_desc',  label: '가격 높은 순' },
]

export const NOTICE_MESSAGES = [
  '본 서비스는 KS 표준 사이즈 기준 참고용 추천 기능입니다.',
  '브랜드별 실측 차이 및 특성이 반영되지 않습니다.',
  '실제 구매 시 브랜드 사이즈표 확인을 권장합니다.',
  '현재 버전은 상의 추천 및 가상 피팅만 지원합니다.',
]
