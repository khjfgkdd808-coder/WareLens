/**
 * recommendApi.ts
 * Backend 통합 추천 API 호출 모듈
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


// ─────────────────────────────────────────────
// 타입 변환
// ─────────────────────────────────────────────

const mapCategory = (subCategory: string): ProductCategory => {
  const map: Record<string, ProductCategory> = {
    '반팔 티셔츠': '반팔 티셔츠',
    '긴팔 티셔츠': '긴팔 티셔츠',
    '셔츠/블라우스': '셔츠/블라우스',
    '니트/스웨터': '니트/스웨터',
    '하의': '하의',
    '원피스': '원피스',
    '아우터': '아우터',

    TOP: '전체 상의',
    BOTTOM: '하의',
    DRESS: '원피스',
    OUTER: '아우터',
  }

  return map[subCategory] ?? '전체 상의'
}


export const mapRecommendationToProduct = (
  rec: Recommendation
): Product => ({
  id: String(rec.item_id),

  name: `${rec.sub_category} (${rec.color})`,

  category: mapCategory(rec.sub_category),

  imageUrl: rec.image_url,

  price: 0,

  colors: [rec.color],

  similarityScore: Math.round(rec.score * 100),

  recommendBadges: [],

  season: (rec.season ?? 'all') as Season,

  isWishlisted: false,
})


// ─────────────────────────────────────────────
// ⭐ 실제 백엔드 연결
// POST /api/recommendations/upload
// ─────────────────────────────────────────────

export const postRecommend = async (
  req: RecommendRequest
): Promise<RecommendResponse> => {


  const formData = new FormData()


  formData.append(
    'gender',
    req.gender
  )


  formData.append(
    'height_cm',
    String(req.height_cm)
  )


  formData.append(
    'weight_kg',
    String(req.weight_kg)
  )


  formData.append(
    'body_image',
    req.body_image
  )


  req.style_images.forEach((img) => {

    formData.append(
      'style_images',
      img
    )

  })


  const { data } =
    await axiosClient.post<RecommendResponse>(
      '/api/recommendations/upload',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    )


  return data
}



// ─────────────────────────────────────────────
// 응답 → Product 변환
// ─────────────────────────────────────────────

export const extractProducts = (
  res: RecommendResponse
): Product[] => {

  return res.data.recommendations.map(
    mapRecommendationToProduct
  )

}



// ─────────────────────────────────────────────
// Try-On 임시
// ─────────────────────────────────────────────

export const requestTryOnPlaceholder = async (
  params: {
    personImageUrl: string
    clothing: {
      item_id: number
      image_url: string
      sub_category: string
      color: string
    }
  }
): Promise<{ resultImageUrl: string }> => {


  console.log(
    '[TryOn] TODO',
    params.clothing
  )


  return {
    resultImageUrl:
      params.clothing.image_url,
  }

}