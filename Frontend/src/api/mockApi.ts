import type { AnalysisResultResponse, Product, PhotoValidationResult } from '@/types'
import { MOCK_BODY_ANALYSIS, MOCK_AI_EXPLANATION, MOCK_PRODUCTS } from '@/utils/mockData'
import { axiosClient } from './axiosClient'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/**
 * ⭕ 전신사진 AI 자동 검증 API (프리패스 설정)
 */
export const validateBodyPhoto = async (file: File): Promise<any> => {
  await delay(200)
  return {
    status: 'success',
    checks: {
      isFrontFull: true,
      isFullBody: true,
      isBodyVisible: true
    }
  }
}

/**
 * ⭕ 백엔드 응답을 콘솔에 출력하는 업로드 함수
 */
export const uploadImages = async (fd: FormData): Promise<{ taskId: string }> => {
  // 자바 백엔드로 데이터 전송
  const response = await axiosClient.post('/api/recommendations/upload', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  // ⭕ [로그 추가] 백엔드에서 받은 전체 응답 데이터를 브라우저 콘솔에 출력
  console.log("=== [백엔드 응답 데이터] ===", response.data);

  const data = response.data

  // taskId가 없을 경우 로딩창 유지를 위한 안전장치
  if (!data.taskId) {
    data.taskId = "task_warelens_local"
  }
  
  return data
}

/**
 * ⭕ 결과 조회 함수
 */
export const getAnalysisResult = async (taskId: string): Promise<AnalysisResultResponse> => {
  await delay(800)
  return {
    taskId, 
    status: 'DONE',
    bodyAnalysis:     MOCK_BODY_ANALYSIS,
    recommendations: MOCK_PRODUCTS,
    aiExplanation:   MOCK_AI_EXPLANATION,
  }
}

/**
 * ⭕ 필터링 및 정렬 함수
 */
export const fetchRecommendations = async (params: {
  taskId: string; category?: string; sort?: string
}): Promise<{ products: Product[]; totalCount: number; hasMore: boolean }> => {
  await delay(300)
  let result = [...MOCK_PRODUCTS]
  if (params.category && params.category !== '전체') {
    if (params.category === '전체 상의') {
      // 모든 상의 포함
    } else {
      result = result.filter((p) => p.category === params.category)
    }
  }
  if (params.sort === 'price_asc')  result.sort((a, b) => a.price - b.price)
  if (params.sort === 'price_desc') result.sort((a, b) => b.price - a.price)
  return { products: result, totalCount: result.length, hasMore: false }
}

/**
 * ⭕ 위시리스트 토글
 */
export const toggleWishlistApi = async (_id: string): Promise<void> => {
  await delay(150)
}