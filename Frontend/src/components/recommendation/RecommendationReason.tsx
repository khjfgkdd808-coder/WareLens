import { Palette, Layers, Shirt, CalendarCheck } from 'lucide-react'
import type { RecommendationProduct } from '@/types/recommendation'

/**
 * AI 추천 태그 배지 + 추천 이유
 *
 * 기존에는 fit/color/fabric/season 4개 축 모두 "체형 맞춤", "컬러 매칭" 같은
 * 고정 문구로 표시했습니다. 이제는 CLIP이 실제 분석한 값(색상/소재/스타일/시즌)을
 * 그대로 태그 문구에 반영합니다. (예: "네이비 컬러", "면 소재", "캐주얼 스타일")
 *
 * 데이터 출처 (LoadingPage.tsx의 mappedProducts에서 이미 채워지는 필드,
 * CLIP 응답 필드명을 그대로 유지):
 *   - color  → 색상 원본 값 (예: "NAVY")
 *   - fabric → 소재 원본 값 (예: "COTTON")
 *   - usage  → 스타일/용도 원본 값 (예: "Casual")
 *   - season → 계절 원본 값 (예: "fall")
 *
 * AI가 생성한 reason이 존재하면 그것을 우선 표시하고,
 * reason이 없을 때만 기존 feature 기반 추천 이유를 사용합니다.
 */

type TagKey = 'color' | 'fabric' | 'style' | 'season'

const COLOR_LABEL: Record<string, string> = {
  BLACK: '블랙',
  WHITE: '화이트',
  GRAY: '그레이',
  NAVY: '네이비',
  BLUE: '블루',
  RED: '레드',
  PINK: '핑크',
  ORANGE: '오렌지',
  YELLOW: '옐로우',
  GREEN: '그린',
  PURPLE: '퍼플',
  BROWN: '브라운',
  BEIGE: '베이지',
  MULTI: '멀티컬러',
}

const FABRIC_LABEL: Record<string, string> = {
  COTTON: '면',
  POLYESTER: '폴리에스터',
  WOOL: '울',
  ACRYLIC: '아크릴',
  SYNTHETIC: '합성섬유',
  'COTTON LINEN': '코튼 린넨',
  BLENDED: '혼방',
}

const STYLE_LABEL: Record<string, string> = {
  CASUAL: '캐주얼',
  FORMAL: '포멀',
  'SMART CASUAL': '스마트 캐주얼',
  SPORTS: '스포츠',
  ETHNIC: '에스닉',
}

const SEASON_LABEL: Record<string, string> = {
  SPRING: '봄',
  SUMMER: '여름',
  FALL: '가을',
  WINTER: '겨울',
}

const TAG_STYLE: Record<
  TagKey,
  {
    icon: typeof Palette
    className: string
    suffix: string
  }
> = {
  color: {
    icon: Palette,
    className: 'bg-pink-50 text-pink-700 border border-pink-100',
    suffix: '컬러',
  },
  fabric: {
    icon: Layers,
    className: 'bg-sky-50 text-sky-700 border border-sky-100',
    suffix: '소재',
  },
  style: {
    icon: Shirt,
    className: 'bg-violet-50 text-violet-700 border border-violet-100',
    suffix: '스타일',
  },
  season: {
    icon: CalendarCheck,
    className: 'bg-green-50 text-green-700 border border-green-100',
    suffix: '시즌',
  },
}

const REASON_TEXT: Record<TagKey, (value: string) => string> = {
  color: (v) => `${v} 컬러가 특징인 아이템이에요`,
  fabric: (v) => `${v} 소재로 제작됐어요`,
  style: (v) => `${v} 스타일에 잘 어울려요`,
  season: (v) => `${v} 시즌에 적합한 아이템이에요`,
}

function resolveLabel(map: Record<string, string>, raw?: string): string | null {
  if (!raw) return null
  const key = raw.trim().toUpperCase()
  return map[key] ?? null
}

function useRecommendationFeatures(
  product: RecommendationProduct,
): { key: TagKey; label: string }[] {
  const features: { key: TagKey; label: string }[] = []

  const color = resolveLabel(COLOR_LABEL, product.color)
  if (color) features.push({ key: 'color', label: color })

  const fabric = resolveLabel(FABRIC_LABEL, product.fabric)
  if (fabric) features.push({ key: 'fabric', label: fabric })

  const style = resolveLabel(STYLE_LABEL, product.usage)
  if (style) features.push({ key: 'style', label: style })

  const season = resolveLabel(SEASON_LABEL, product.season)
  if (season) features.push({ key: 'season', label: season })

  return features
}

/** 추천 태그 배지 */
export function RecommendationTags({
  product,
}: {
  product: RecommendationProduct
}) {
  const features = useRecommendationFeatures(product).slice(0, 4)
  if (features.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {features.map(({ key, label }) => {
        const { icon: Icon, className, suffix } = TAG_STYLE[key]

        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${className}`}
          >
            <Icon className="w-3 h-3" />
            {label} {suffix}
          </span>
        )
      })}
    </div>
  )
}

/** AI 추천 이유 */
export default function RecommendationReason({
  product,
}: {
  product: RecommendationProduct
}) {
  // AI 서버가 생성한 추천 이유가 있으면 그것을 우선 사용
  if (product.reason?.trim()) {
    return (
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 mb-1">
          AI 추천 이유
        </p>

        <p className="text-[11px] text-gray-600 leading-snug">
          • {product.reason}
        </p>
      </div>
    )
  }

  // reason이 없으면 기존 feature 기반 문구 사용
  const features = useRecommendationFeatures(product).slice(0, 3)

  if (features.length === 0) return null

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 mb-1">
        AI 추천 이유
      </p>

      <ul className="space-y-0.5">
        {features.map(({ key, label }) => (
          <li
            key={key}
            className="text-[11px] text-gray-600 leading-snug"
          >
            • {REASON_TEXT[key](label)}
          </li>
        ))}
      </ul>
    </div>
  )
}