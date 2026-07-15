import { useState } from 'react'
import { Heart, MapPin, Crown, Check, ShoppingBag, Loader2 } from 'lucide-react'

import type { RecommendationProduct } from '@/types/recommendation'
import RecommendationReason, { RecommendationTags } from './RecommendationReason'
import StoreLocationModal from './StoreLocationModal'

const SEASON_LABEL: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  fall:   '가을',
  winter: '겨울',
}

interface RecommendationCardProps {
  product: RecommendationProduct
  /** 1-based 추천 순위 (Top1~Top5). 표시 전용이며 정렬/추천 로직에는 관여하지 않습니다. */
  rank: number
  isSelected: boolean
  /**
   * 찜 여부. Zustand store의 wishlistIds(Set)를 기준으로 ResultPage에서 계산해 내려줍니다.
   * product.isWishlisted는 최초 매핑 시 항상 false로 고정되는 값이라 클릭 후 갱신되지 않으므로
   * 더 이상 사용하지 않습니다. (root cause 수정)
   */
  isWishlisted: boolean
  onSelect: (p: RecommendationProduct) => void
  onWishlist: (id: string) => void
  /** 가상피팅(POST /api/recommendations/tryon) 요청 진행 중일 때 true — 버튼 비활성화용 (신규) */
  disabled?: boolean
}

/** Top1 전용 "BEST MATCH" 리본 / Top2~5는 순번 배지 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm shadow-blue-200">
          1
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          <Crown className="w-3 h-3" />
          BEST MATCH
        </span>
      </div>
    )
  }

  const RANK_STYLE: Record<number, string> = {
    2: 'bg-gray-100 text-gray-500',
    3: 'bg-orange-50 text-orange-500',
  }

  return (
    <span
      className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
        RANK_STYLE[rank] ?? 'bg-gray-50 text-gray-400'
      }`}
    >
      {rank}
    </span>
  )
}

/**
 * AI 추천 상품 카드 (프리미엄 쇼핑몰 스타일)
 *
 * 표시 항목:
 *   - 순위 배지 (Top1: BEST MATCH 리본 / Top2~5: 순번)
 *   - 상품 이미지 (기존 대비 확대)
 *   - 상품명 + 카테고리
 *   - Matching Score(=기존 similarityScore) + 계절 배지
 *   - 추천 태그 배지 (color/fabric/fit/season 실데이터 기반)
 *   - AI 추천 이유 (짧은 문장 3줄)
 *   - 매장에서 찾기 / 가상 피팅 적용 버튼
 *
 * 데이터/기능(추천 로직, API, 매칭, 가상피팅, 찜, 매장 찾기)은 기존과 동일하게 유지되며,
 * 이 컴포넌트에서는 표시 레이아웃과 스타일만 변경합니다.
 */
export default function RecommendationCard({
  product, rank, isSelected, isWishlisted, onSelect, onWishlist, disabled = false,
}: RecommendationCardProps) {
  const [showLocation, setShowLocation] = useState(false)

  const seasonLabel = product.season && product.season !== 'all'
    ? SEASON_LABEL[product.season] ?? product.season
    : null

  const isBest = rank === 1

  return (
    <>
      <div
        onClick={() => { if (!disabled) onSelect(product) }}
        className={[
          'group relative rounded-2xl border cursor-pointer transition-all duration-200',
          isSelected
            ? 'border-blue-500 bg-blue-50/60 shadow-md'
            : isBest
              ? 'border-blue-200 bg-white shadow-md hover:shadow-lg'
              : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200',
        ].join(' ')}
        style={{ padding: '16px' }}
      >
        {/* 상단: 순위 배지 + 찜 */}
        <div className="flex items-center justify-between mb-2.5">
          <RankBadge rank={rank} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onWishlist(product.id) }}
            aria-label="찜하기"
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                       transition-colors ${isWishlisted ? 'bg-red-50' : 'bg-gray-50 hover:bg-red-50'}`}
          >
            <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}
                   fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 본문: 이미지(확대) + 상품 정보 — 이미지가 가장 먼저 눈에 들어오도록 카드 내 비중을 높였습니다 */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
            style={{ width: 128, aspectRatio: '3/4' }}
          >
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900 leading-snug truncate">{product.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{product.category}</p>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                Matching Score {Math.round(product.similarityScore)}%
              </span>
              {seasonLabel && (
                <span className="text-[10px] font-medium text-blue-500 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                  {seasonLabel}
                </span>
              )}
            </div>

            <div className="mt-2">
              <RecommendationTags product={product} />
            </div>

            <div className="mt-2">
              <RecommendationReason product={product} />
            </div>
          </div>
        </div>

        {/* 하단 버튼: 매장에서 찾기 / 가상 피팅 적용 (필요 최소 높이로 축소, 1줄 고정) */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowLocation(true) }}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold rounded-lg py-1.5
                       whitespace-nowrap text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-3 h-3 flex-shrink-0" /> 매장에서 찾기
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!disabled) onSelect(product) }}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold rounded-lg py-1.5
                       whitespace-nowrap transition-colors ${
              isSelected
                ? 'text-white bg-blue-700 hover:bg-blue-800'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSelected && disabled
              ? <><Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" /> 피팅 중...</>
              : isSelected
              ? <><Check className="w-3 h-3 flex-shrink-0" /> 가상피팅 적용됨</>
              : <><ShoppingBag className="w-3 h-3 flex-shrink-0" /> 가상피팅 적용</>
            }
          </button>
        </div>
      </div>

      {showLocation && (
        <StoreLocationModal
          productId={product.id}
          productName={product.name}
          onClose={() => setShowLocation(false)}
        />
      )}
    </>
  )
}