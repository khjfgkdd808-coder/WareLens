import type { AnalysisResultResponse, Product } from '@/types'
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
