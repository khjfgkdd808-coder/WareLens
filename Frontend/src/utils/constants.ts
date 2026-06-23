import type { AnalysisStatus, CategoryFilter, SortKey, AnalysisErrorCode } from '@/types'

export const MAX_CLOTHING_IMAGES  = 5
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

// 분석 단계 정의
export const ANALYSIS_STEPS: Record<
  AnalysisStatus,
  { label: string; description: string; progress: number }
> = {
  PENDING:         { label: '준비 중',               description: '분석 요청을 준비하고 있습니다.',             progress: 0   },
  UPLOADING:       { label: '사진 업로드 완료',        description: '이미지가 서버에 전달됐습니다.',              progress: 20  },
  BODY_ANALYZING:  { label: '체형 분석 중',           description: '사진에서 체형 정보를 분석하는 중...',         progress: 45  },
  STYLE_ANALYZING: { label: 'MediaPipe 좌표 계산 중', description: 'MediaPipe 신체 좌표를 계산하는 중...',       progress: 70  },
  GENERATING:      { label: '추천 의류 탐색 중',       description: '추천 의류를 찾는 중...',                   progress: 88  },
  DONE:            { label: '분석 완료!',             description: '결과가 준비됐습니다.',                      progress: 100 },
  ERROR:           { label: '분석 실패',              description: '오류가 발생했습니다.',                      progress: 0   },
}

// 에러 코드별 사용자 메시지
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
