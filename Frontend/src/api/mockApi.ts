import axiosClient from './axiosClient'
import type { AnalysisResultResponse, Product, PhotoValidationResult } from '@/types'
import { MOCK_BODY_ANALYSIS, MOCK_AI_EXPLANATION, MOCK_PRODUCTS } from '@/utils/mockData'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/**
 * 전신사진 AI 자동 검증 API (프리패스)
 */
export const validateBodyPhoto = async (_file: File): Promise<PhotoValidationResult> => {
  await delay(200)

  return {
    status: 'success',
    message: '사진 확인 완료',
    checks: {
      isFrontFull: true,
      isFullBody: true,
      isBodyVisible: true,
    },
  }
}

/**
 * 이미지 업로드
 * POST http://localhost:8080/api/recommendations/upload
 */
export const uploadImages = async (
  fd: FormData,
): Promise<{ taskId: string }> => {
  const response = await axiosClient.post(
    '/api/recommendations/upload',
    fd,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  console.log('=== [백엔드 응답 데이터] ===', response.data)

  const data = response.data

  if (!data.taskId) {
    data.taskId = 'task_warelens_local'
  }

  return data
}

/**
 * 분석 결과 조회 (현재 Mock)
 */
export const getAnalysisResult = async (
  taskId: string,
): Promise<AnalysisResultResponse> => {
  await delay(800)

  return {
    taskId,
    status: 'DONE',
    bodyAnalysis: MOCK_BODY_ANALYSIS,
    recommendations: MOCK_PRODUCTS,
    aiExplanation: MOCK_AI_EXPLANATION,
  }
}

/**
 * 추천 상품 조회 (현재 Mock)
 */
export const fetchRecommendations = async (params: {
  taskId: string
  category?: string
  sort?: string
}): Promise<{
  products: Product[]
  totalCount: number
  hasMore: boolean
}> => {
  await delay(300)

  let result = [...MOCK_PRODUCTS]

  if (params.category && params.category !== '전체') {
    if (params.category !== '전체 상의') {
      result = result.filter((p) => p.category === params.category)
    }
  }

  if (params.sort === 'price_asc') {
    result.sort((a, b) => a.price - b.price)
  }

  if (params.sort === 'price_desc') {
    result.sort((a, b) => b.price - a.price)
  }

  return {
    products: result,
    totalCount: result.length,
    hasMore: false,
  }
}

/**
 * 위시리스트 토글 (현재 Mock)
 */
export const toggleWishlistApi = async (_id: string): Promise<void> => {
  await delay(150)
}