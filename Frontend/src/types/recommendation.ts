// ── 추천 결과 화면 전용 타입 ──────────────────────────────────
//
// types/index.ts 의 Product는 수정하지 않습니다.
// CLIP 응답(color / fabric / fit)은 ResultPage.tsx의 mappedProducts에서
// 이미 실제로 채워지고 있는 필드이며, 여기서는 그 값을 안전하게
// 사용하기 위한 확장 타입만 별도로 선언합니다.
import type { Product } from '@/types'

/**
 * ResultPage.tsx에서 CLIP 추천 응답을 매핑할 때 실제로 채워지는 필드들.
 * (article_type → name/category, clip_score → similarityScore 는
 *  이미 Product 타입에 포함되어 있으므로 여기서는 CLIP 전용 추가 필드만 확장합니다.)
 */
export interface RecommendationProduct extends Product {
  color?: string
  fabric?: string
  fit?: string
  /** top5_tryon_images[i].garment_info.image_name 과 매칭하기 위한 키 */
  imageName?: string
}
