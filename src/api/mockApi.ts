import type {
  AnalysisResultResponse, Product,
  PhotoValidationResult,
} from '@/types'
import { MOCK_BODY_ANALYSIS, MOCK_AI_EXPLANATION, MOCK_PRODUCTS } from '@/utils/mockData'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export const uploadImages = async (_fd: FormData): Promise<{ taskId: string }> => {
  await delay(1200)
  return { taskId: `task-${Date.now()}` }
}

export const getAnalysisResult = async (taskId: string): Promise<AnalysisResultResponse> => {
  await delay(600)
  return {
    taskId, status: 'DONE',
    bodyAnalysis:    MOCK_BODY_ANALYSIS,
    recommendations: MOCK_PRODUCTS,
    aiExplanation:   MOCK_AI_EXPLANATION,
  }
}

export const fetchRecommendations = async (params: {
  taskId: string; category?: string; sort?: string
}): Promise<{ products: Product[]; totalCount: number; hasMore: boolean }> => {
  await delay(300)
  let result = [...MOCK_PRODUCTS]
  if (params.category && params.category !== '전체' && params.category !== '전체 상의') {
    result = result.filter((p) => p.category === params.category)
  }
  if (params.sort === 'price_asc')  result.sort((a, b) => a.price - b.price)
  if (params.sort === 'price_desc') result.sort((a, b) => b.price - a.price)
  return { products: result, totalCount: result.length, hasMore: false }
}

export const toggleWishlistApi = async (_id: string): Promise<void> => {
  await delay(150)
}

/**
 * validateBodyPhoto — 전신사진 AI 자동 검증 Mock
 * 백엔드(MediaPipe) 연동 전 Mock 응답:
 *   - 70% 확률로 성공
 *   - 20% 확률로 BODY_NOT_DETECTED 에러
 *   - 10% 확률로 LOW_VISIBILITY 에러
 * 실제 연동 시 이 함수만 axios 호출로 교체하면 됩니다.
 */
export const validateBodyPhoto = async (
  _file: File,
): Promise<PhotoValidationResult> => {
  await delay(1800) // 검증 시뮬레이션 딜레이

  const rand = Math.random()

  if (rand < 0.70) {
    return {
      status:  'success',
      message: '✓ 전신이 잘 보이는 사진입니다. 분석을 진행할 수 있어요.',
    }
  }
  if (rand < 0.90) {
    return {
      status:  'error',
      message: '사진에서 인물을 찾지 못했어요. 전신이 모두 보이는 사진으로 다시 올려주세요.',
      code:    'BODY_NOT_DETECTED',
    }
  }
  return {
    status:  'error',
    message: '관절 위치가 잘 보이지 않아요. 밝은 장소에서 다시 촬영해 주세요.',
    code:    'LOW_VISIBILITY',
  }
}
