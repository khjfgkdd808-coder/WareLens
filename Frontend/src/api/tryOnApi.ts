/**
 * tryOnApi.ts
 * 가상 피팅(Try-On) API 모듈
 *
 * 현재 상태: AI Try-On API 미확정
 * → UI 구조 및 상태 관리는 완성, API 호출 부분만 TODO 처리
 *
 * 실제 연동 시:
 * 1. ENDPOINT 상수를 실제 URL로 교체
 * 2. requestTryOn 함수의 TODO 주석 제거 후 axiosClient 호출로 교체
 */

import type { TryOnRequest, TryOnResponse } from '@/types'
// axiosClient는 실제 연동 시 사용
// import axiosClient from './axiosClient'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * TODO: AI Try-On API 연결 예정
 * Endpoint:  미확정 (예: POST /api/v1/tryon)
 * Request:   multipart/form-data { person_image, clothing_image_url }
 * Response:  { result_image_url: string }
 */

// TODO: API 확정 후 실제 endpoint로 교체
// const TRYON_ENDPOINT = '/v1/tryon'

/**
 * 가상 피팅 요청 함수
 *
 * @param req.personImage   - 사용자 전신사진 (File 또는 이미지 URL)
 * @param req.clothingImage - 선택한 의류 이미지 URL
 * @returns TryOnResponse { resultImageUrl }
 *
 * ─── TODO: AI Try-On API 연결 예정 ───────────────────────────
 * 현재는 UI 흐름 테스트를 위해 선택 의류 이미지를 결과로 반환합니다.
 * API 확정 후 아래 Mock 섹션을 제거하고 실제 호출로 교체하세요.
 * ─────────────────────────────────────────────────────────────
 */
export const requestTryOn = async (req: TryOnRequest): Promise<TryOnResponse> => {
  // TODO: AI Try-On API 연결 예정 ─────────────────────────────
  // 아래 Mock 블록을 제거하고 실제 API 호출로 교체합니다.
  await delay(1600) // UI 테스트용 딜레이

  const mockResultUrl =
    typeof req.personImage === 'string'
      ? req.clothingImage          // URL인 경우 의류 이미지를 결과로 반환
      : URL.createObjectURL(req.personImage)

  return { resultImageUrl: mockResultUrl }
  // TODO 끝 ──────────────────────────────────────────────────


  /* ── 실제 API 연동 섹션 (API 확정 후 주석 해제) ─────────────
  const formData = new FormData()

  if (req.personImage instanceof File) {
    formData.append('person_image', req.personImage)
  } else {
    formData.append('person_image_url', req.personImage)
  }
  formData.append('clothing_image_url', req.clothingImage)

  const { data } = await axiosClient.post<{ result_image_url: string }>(
    TRYON_ENDPOINT,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,  // Try-On은 처리 시간이 길 수 있음
    },
  )

  return { resultImageUrl: data.result_image_url }
  ── 실제 API 연동 섹션 끝 ────────────────────────────────── */
}
