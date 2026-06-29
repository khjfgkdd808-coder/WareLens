/**
 * recommendApi.ts
 * Backend 통합 추천 API 호출 모듈
 *
 * 아키텍처:
 *   React → POST /api/v1/recommend (Spring Boot)
 *         → MediaPipe 체형 분석 + CLIP 스타일 추천 통합
 *         → 결과 반환
 *
 * Frontend는 CLIP / MediaPipe 서버를 직접 호출하지 않습니다.
 * 모든 AI API 호출은 Backend를 통해 이루어집니다.
 *
 * 현재 상태: Backend 미완성 → Mock 구조로 개발
 * 실제 연동 시: 각 함수의 Mock 섹션을 제거하고 axiosClient 섹션 주석을 해제하세요.
 */

import axiosClient from './axiosClient'
import type {
  RecommendRequest,
  RecommendResponse,
  Recommendation,
  Product,
  ProductCategory,
  Season,
} from '@/types'
import { MOCK_PRODUCTS, MOCK_BODY_ANALYSIS } from '@/utils/mockData'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ──────────────────────────────────────────────────────────────
// 타입 변환 유틸리티
// Recommendation(CLIP 원본) → Product(Frontend UI용)
// Backend 확정 후 이 함수를 실제 응답 구조에 맞게 수정합니다.
// ──────────────────────────────────────────────────────────────

/**
 * CLIP API 카테고리 문자열 → Frontend ProductCategory 매핑
 */
const mapCategory = (subCategory: string): ProductCategory => {
  const map: Record<string, ProductCategory> = {
    '반팔 티셔츠':    '반팔 티셔츠',
    '긴팔 티셔츠':    '긴팔 티셔츠',
    '셔츠/블라우스':  '셔츠/블라우스',
    '니트/스웨터':    '니트/스웨터',
    '하의':           '하의',
    '원피스':         '원피스',
    '아우터':         '아우터',
    'TOP':            '전체 상의',
    'BOTTOM':         '하의',
    'DRESS':          '원피스',
    'OUTER':          '아우터',
  }
  return map[subCategory] ?? '전체 상의'
}

/**
 * Recommendation(CLIP 원본) → Product(UI 표시용) 변환
 * Backend 응답 필드명(snake_case)은 그대로 유지하고
 * Frontend에서 필요한 camelCase 필드로 변환합니다.
 */
export const mapRecommendationToProduct = (rec: Recommendation): Product => ({
  id:              String(rec.item_id),
  name:            `${rec.sub_category} (${rec.color})`,  // [Draft] 상품명 필드 없음 — Backend 협의 필요
  category:        mapCategory(rec.sub_category),
  imageUrl:        rec.image_url,
  price:           0,                                      // [Draft] CLIP 응답에 가격 없음
  colors:          [rec.color],
  similarityScore: Math.round(rec.score * 100),
  recommendBadges: [],
  season:          (rec.season ?? 'all') as Season,
  isWishlisted:    false,
})

// ──────────────────────────────────────────────────────────────
// API 함수
// ──────────────────────────────────────────────────────────────

/**
 * 통합 추천 요청
 * POST /api/v1/recommend
 *
 * @param req - 사용자 입력 (gender, height_cm, weight_kg, body_image, style_images)
 * @returns RecommendResponse (체형 분석 + 스타일 분석 + 추천 목록)
 */
export const postRecommend = async (req: RecommendRequest): Promise<RecommendResponse> => {
  /* ── Mock 섹션 (Backend 연동 전) ─────────────────────────── */
  await delay(2000)

  // MOCK_PRODUCTS를 Recommendation 구조로 역변환하여 반환
  const mockRecommendations: Recommendation[] = MOCK_PRODUCTS.map((p, i) => ({
    rank:         i + 1,
    item_id:      Number(p.id),
    image_url:    p.imageUrl,
    score:        p.similarityScore / 100,
    category:     'TOP',
    sub_category: p.category as string,
    color:        p.colors[0] ?? '기본',
    pattern:      '무지',
    season:       p.season,
  }))

  return {
    status: 'SUCCESS',
    data: {
      body_result:          MOCK_BODY_ANALYSIS,
      size_recommendation:  {
        recommended_size: MOCK_BODY_ANALYSIS.recommendedSize.topNumeric,
        ks_label:         `${MOCK_BODY_ANALYSIS.recommendedSize.topNumeric}-95-170`,
        reasons:          MOCK_BODY_ANALYSIS.reasons,
      },
      style_analysis: {
        top_categories: ['캐주얼', '미니멀'],
        top_colors:     ['화이트', '네이비'],
      },
      recommendations: mockRecommendations,
    },
  }
  /* ── Mock 섹션 끝 ──────────────────────────────────────────── */


  /* ── 실제 API 연동 섹션 (주석 해제 후 사용) ─────────────────
  const formData = new FormData()
  formData.append('gender',     req.gender)
  formData.append('height_cm',  String(req.height_cm))
  formData.append('weight_kg',  String(req.weight_kg))
  formData.append('body_image', req.body_image)
  req.style_images.forEach((img) => formData.append('style_images', img))

  const { data } = await axiosClient.post<RecommendResponse>(
    '/v1/recommend',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
  ── 실제 API 연동 섹션 끝 ────────────────────────────────── */
}

/**
 * 추천 결과에서 Product 배열 추출
 * RecommendResponse → Product[]
 */
export const extractProducts = (res: RecommendResponse): Product[] =>
  res.data.recommendations.map(mapRecommendationToProduct)


// ──────────────────────────────────────────────────────────────
// Try-On API (미확정 — TODO)
// ──────────────────────────────────────────────────────────────

/**
 * 가상 피팅 실행
 *
 * TODO: AI Try-On API 연결 예정
 * - AI Try-On 팀 API 확정 후 이 함수를 구현합니다.
 * - Endpoint: 미확정 (예: POST /api/v1/tryon)
 * - Request:  { person_image: File | string, clothing_image_url: string }
 * - Response: { result_image_url: string }
 *
 * 현재는 선택된 의류 데이터 구조만 수신하고 TODO 처리합니다.
 */
export const requestTryOnPlaceholder = async (params: {
  personImageUrl: string
  clothing: {
    item_id:      number
    image_url:    string
    sub_category: string
    color:        string
  }
}): Promise<{ resultImageUrl: string }> => {
  // TODO: AI Try-On API 연결 예정
  // 현재는 선택 의류 이미지를 그대로 반환 (UI 테스트용)
  console.log('[TryOn] TODO - 선택 의류:', params.clothing)
  await delay(1500)
  return { resultImageUrl: params.clothing.image_url }
}
