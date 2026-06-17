import type { AnalysisStatus, CategoryFilter, SortKey } from '@/types'

export const MAX_CLOTHING_IMAGES  = 5
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export const ANALYSIS_STEPS: Record<
  AnalysisStatus,
  { label: string; description: string; progress: number }
> = {
  PENDING:         { label: '요청 준비 중',        description: '분석 요청을 준비하고 있습니다.',       progress: 5   },
  UPLOADING:       { label: '이미지 업로드 완료',   description: '이미지가 성공적으로 업로드됐습니다.',   progress: 25  },
  BODY_ANALYZING:  { label: '체형 분석 진행 중',   description: 'MediaPipe로 체형을 분석하고 있습니다.', progress: 50  },
  STYLE_ANALYZING: { label: '스타일 분석 진행 중', description: 'CLIP으로 스타일을 분석하고 있습니다.',  progress: 72  },
  GENERATING:      { label: '추천 결과 생성 중',   description: '최적의 의류를 추천하고 있습니다.',      progress: 90  },
  DONE:            { label: '분석 완료!',           description: '추천 결과가 준비됐습니다.',             progress: 100 },
  ERROR:           { label: '오류 발생',            description: '분석 중 문제가 발생했습니다.',           progress: 0   },
}

export const CATEGORY_FILTERS: CategoryFilter[] = [
  '전체', '상의', '하의', '원피스', '아우터', '니트',
]

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'similarity',  label: '유사도 높은 순' },
  { key: 'price_asc',   label: '가격 낮은 순'   },
  { key: 'price_desc',  label: '가격 높은 순'   },
]

export const NOTICE_MESSAGES = [
  '본 서비스는 KS 표준 사이즈 기준 참고용 추천 기능입니다.',
  '브랜드별 실측 차이 및 특성이 반영되지 않습니다.',
  '실제 구매 시 브랜드 사이즈표 확인을 권장합니다.',
]
