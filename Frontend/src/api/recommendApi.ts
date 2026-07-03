import axiosClient from './axiosClient'
import type {
  RecommendRequest,
  RecommendResponse,
  Recommendation,
  Product,
  ProductCategory,
  Season,
} from '@/types'

// ─────────────────────────────
// 카테고리 매핑
// ─────────────────────────────
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

// ─────────────────────────────
// Recommendation → Product
// ─────────────────────────────
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

// ─────────────────────────────
// ⭐ 실제 API
// ─────────────────────────────
export const postRecommend = async (
  req: RecommendRequest
): Promise<RecommendResponse> => {

  const formData = new FormData()

  // ✔ 필수값 3개 (누락 금지)
  formData.append('gender', req.gender)
  formData.append('height_cm', String(req.height_cm))

  // ✅ 여기 (몸무게 다시 포함)
  formData.append('weight_kg', String(req.weight_kg))

  formData.append('body_image', req.body_image)

  // 스타일 이미지 배열
  req.style_images.forEach((img) => {
    formData.append('style_images', img)
  })

  const { data } = await axiosClient.post<RecommendResponse>(
    '/recommendations/upload',
    formData
  )

  console.group('📥 Spring Boot Response')
  console.log(data)
  console.groupEnd()

  return data
}

// ─────────────────────────────
// 응답 → Product
// ─────────────────────────────
export const extractProducts = (
  res: RecommendResponse
): Product[] => {
  return res.data.recommendations.map(mapRecommendationToProduct)
}

// ─────────────────────────────
// TryOn placeholder
// ─────────────────────────────
export const requestTryOnPlaceholder = async (params: {
  personImageUrl: string
  clothing: {
    item_id: number
    image_url: string
    sub_category: string
    color: string
  }
}): Promise<{ resultImageUrl: string }> => {

  console.log('[TryOn]', params.clothing)

  return {
    resultImageUrl: params.clothing.image_url,
  }
}