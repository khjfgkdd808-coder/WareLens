import type { AnalysisResultResponse, Product, PhotoValidationResult } from '@/types'
import { MOCK_BODY_ANALYSIS, MOCK_AI_EXPLANATION, MOCK_PRODUCTS } from '@/utils/mockData'
import { axiosClient } from './axiosClient'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/**
 * 전신사진 AI 자동 검증 API (Mock)
 * 실제 연동 시 이 함수만 교체하면 됩니다.
 * @param _file - 업로드된 전신사진 File 객체
 */
export const validateBodyPhoto = async (file: File): Promise<PhotoValidationResult> => {
  const formData = new FormData()

  formData.append('image', file)

  const response = await axiosClient.post(
    '/api/recommendations/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

export const uploadImages = async (fd: FormData): Promise<{ taskId:string }> => {

  const response = await axiosClient.post(
    '/recommend',
    fd,
    {
      headers:{
        'Content-Type':'multipart/form-data',
      }
    }
  )

  return response.data
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
