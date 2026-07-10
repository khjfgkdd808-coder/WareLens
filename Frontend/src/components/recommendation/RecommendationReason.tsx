import { PersonStanding, Palette, Layers, CalendarCheck } from 'lucide-react'
import type { RecommendationProduct } from '@/types/recommendation'

/**
 * AI 추천 태그 배지 + 추천 이유
 *
 * 새로운 AI 모델/계산을 추가하지 않고, ResultPage.tsx에서
 * CLIP 응답을 매핑할 때 이미 채워지는 실제 필드만 사용합니다.
 *   - fit     → 체형에 맞는 핏
 *   - color   → 선호 색상과의 유사도
 *   - fabric  → 선호 소재/스타일과의 일치도
 *   - season  → 계절 적합도
 * 실제 값이 없는 항목은 표시하지 않습니다.
 *
 * 배지 색상은 새 디자인 시스템을 만들지 않고, 이 프로젝트에 이미 있는
 * ProductCard.tsx의 BADGE_STYLE 팔레트(violet/pink/sky/green)를 그대로 재사용합니다.
 */

type ReasonKey = 'fit' | 'color' | 'fabric' | 'season'

const TAG_META: Record<ReasonKey, { label: string; icon: typeof PersonStanding; className: string }> = {
  // ProductCard.tsx BADGE_STYLE과 동일한 색 조합 재사용
  fit:    { label: '체형 맞춤', icon: PersonStanding, className: 'bg-violet-50 text-violet-700 border border-violet-100' },
  color:  { label: '컬러 매칭', icon: Palette,        className: 'bg-pink-50   text-pink-700   border border-pink-100' },
  fabric: { label: '소재 일치', icon: Layers,          className: 'bg-sky-50    text-sky-700    border border-sky-100' },
  season: { label: '시즌 추천', icon: CalendarCheck,   className: 'bg-green-50  text-green-700  border border-green-100' },
}

const REASON_TEXT: Record<ReasonKey, string> = {
  fit:    '체형을 자연스럽게 보완해요',
  color:  '선호 컬러와 잘 어울려요',
  fabric: '선호하는 소재와 잘 맞아요',
  season: '지금 계절에 적합한 아이템이에요',
}

function useRecommendationSignals(product: RecommendationProduct): ReasonKey[] {
  const keys: ReasonKey[] = []
  if (product.fit)    keys.push('fit')
  if (product.color)  keys.push('color')
  if (product.fabric) keys.push('fabric')
  if (product.season && product.season !== 'all') keys.push('season')
  return keys
}

/** 추천 태그 배지 (최대 4개, color/fabric/fit/season 실데이터 기반) */
export function RecommendationTags({ product }: { product: RecommendationProduct }) {
  const keys = useRecommendationSignals(product).slice(0, 4)
  if (keys.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((key) => {
        const { label, icon: Icon, className } = TAG_META[key]
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${className}`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </span>
        )
      })}
    </div>
  )
}

/** AI 추천 이유 (짧은 문장 최대 3줄, 20자 내외) */
export default function RecommendationReason({ product }: { product: RecommendationProduct }) {
  const keys = useRecommendationSignals(product).slice(0, 3)
  if (keys.length === 0) return null

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 mb-1">AI 추천 이유</p>
      <ul className="space-y-0.5">
        {keys.map((key) => (
          <li key={key} className="text-[11px] text-gray-600 leading-snug">
            • {REASON_TEXT[key]}
          </li>
        ))}
      </ul>
    </div>
  )
}