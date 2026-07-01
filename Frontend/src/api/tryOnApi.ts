/**
 * tryOnApi.ts
 * AI Virtual Try-On API 모듈
 *
 * ─── 현재 상태 ────────────────────────────────────────────────
 * UI 구조 및 상태 관리 완성 / AI API 연결 대기 중
 *
 * ─── 실제 AI Try-On API 연결 방법 ────────────────────────────
 * 1. TRYON_ENDPOINT 상수를 실제 URL로 변경
 * 2. requestTryOn 함수 내 Mock 블록 제거
 * 3. 실제 axiosClient 호출 주석 해제
 *
 * ─── 기대 Request / Response ──────────────────────────────────
 * POST /api/v1/tryon   (multipart/form-data)
 *   person_image        : File     — 사용자 전신/상체 사진
 *   clothing_image_url  : string   — 선택한 의류 이미지 URL
 *   category            : string   — 'TOP' (현재 상의만 지원)
 *
 * Response:
 *   result_image_url    : string   — AI가 생성한 착용 이미지 URL
 *                          (사람의 얼굴·헤어·포즈 유지, 의류만 교체)
 *   confidence_score?   : number   — 착용 자연스러움 점수 (0~1)
 */

import type { TryOnRequest, TryOnResponse } from '@/types'
import axiosClient from './axiosClient'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// TODO: AI API 확정 후 실제 endpoint URL로 교체
// const TRYON_ENDPOINT = '/v1/tryon'

/**
 * AI Virtual Try-On 요청
 *
 * @param req.personImage   — 사용자 전신사진 (File 또는 이미지 URL)
 * @param req.clothingImage — 선택한 의류 이미지 URL
 * @returns { resultImageUrl } — AI가 생성한 착용 결과 이미지 URL
 *
 * 결과 이미지 특성 (AI API 연결 후):
 *  - 사람의 얼굴, 헤어, 포즈, 신체 형태 유지
 *  - 선택한 상의만 자연스럽게 교체
 *  - 현재는 상체 의류(T-shirt, 셔츠 등)만 지원
 */
export const requestTryOn = async (req: TryOnRequest): Promise<TryOnResponse> => {

  /* ── 실제 AI API 연동 섹션 (API 확정 후 주석 해제) ─────────────
  const formData = new FormData()

  if (req.personImage instanceof File) {
    formData.append('person_image', req.personImage)
  } else {
    // URL 전달 방식은 백엔드 명세에 따라 조정
    formData.append('person_image_url', req.personImage)
  }
  formData.append('clothing_image_url', req.clothingImage)
  formData.append('category', 'TOP') // 현재 상의만 지원

  const { data } = await axiosClient.post<{
    result_image_url: string
    confidence_score?: number
  }>(
    TRYON_ENDPOINT,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90_000, // AI 생성은 최대 90초
    },
  )

  return { resultImageUrl: data.result_image_url }
  ── 실제 API 연동 섹션 끝 ────────────────────────────────── */


  /* ── Mock 섹션 (AI API 연결 전 UI 테스트용) ──────────────────
   *
   * ⚠️  현재 반환되는 이미지는 AI 합성 결과가 아닙니다.
   *     실제 연결 시 사람에게 의류가 입혀진 이미지가 반환됩니다.
   *
   * Mock 동작: personImage URL을 그대로 반환 (원본 사진 유지 시뮬레이션)
   */
  await delay(2200)

  const mockResultUrl = typeof req.personImage === 'string'
    ? req.personImage   // 원본 사진을 결과로 (실제 연동 시 AI 합성 이미지로 교체됨)
    : URL.createObjectURL(req.personImage)

  return { resultImageUrl: mockResultUrl }
  /* ── Mock 섹션 끝 ─────────────────────────────────────────── */
}
