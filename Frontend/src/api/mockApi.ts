import type { AnalysisResultResponse, Product, PhotoValidationResult } from '@/types'
import { MOCK_BODY_ANALYSIS, MOCK_AI_EXPLANATION, MOCK_PRODUCTS } from '@/utils/mockData'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/**
 * 전신사진 AI 자동 검증 API (Mock)
 * 실제 연동 시 이 함수만 교체하면 됩니다.
 * @param _file - 업로드된 전신사진 File 객체
 */
export const validateBodyPhoto = async (_file: File): Promise<PhotoValidationResult> => {
  await delay(1800) // MediaPipe 처리 시뮬레이션
  // Mock: 항상 성공 반환 (실제 API 연동 시 서버 응답으로 교체)
  return {
    status: 'success',
    message: '사진 확인 완료',
    checks: {
      isFrontFull:   true,
      isFullBody:    true,
      isBodyVisible: true,
    },
  }
}

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
  if (params.category && params.category !== '전체') {
    if (params.category === '전체 상의') {
      // 모든 상의 서브카테고리 포함
    } else {
      result = result.filter((p) => p.category === params.category)
    }
  }
  if (params.sort === 'price_asc')  result.sort((a, b) => a.price - b.price)
  if (params.sort === 'price_desc') result.sort((a, b) => b.price - a.price)
  return { products: result, totalCount: result.length, hasMore: false }
}

export const toggleWishlistApi = async (_id: string): Promise<void> => {
  await delay(150)
}
