/**
 * ProductCard.tsx
 * 추천 의류 카드 — 카드 클릭 자체가 가상피팅 트리거
 *
 * UX 변경:
 *  기존: 카드 클릭 → 선택 / "이 옷 입어보기" 버튼 → 가상피팅
 *  현재: 카드 클릭 → 즉시 가상피팅 시작 (버튼 제거)
 *
 * "이 옷 입어보기" TryOnButton은 파일 유지하나 이 카드에서 미사용
 */
import type { Product, RecommendBadge } from '@/types'
import { formatSimilarity } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'

interface Props {
  product:        Product
  onWishlist:     (id: string) => void
  onTryOn:        (product: Product) => void   // 카드 클릭 = 가상피팅 트리거
  isSelected:     boolean
  isTryOnLoading: boolean
}

const BADGE_STYLE: Record<RecommendBadge, string> = {
  '어깨 비율 보완':   'bg-violet-50 text-violet-700 border border-violet-100',
  '상체 밸런스 조절': 'bg-blue-50   text-blue-700   border border-blue-100',
  '체형 적합':       'bg-green-50  text-green-700  border border-green-100',
  '스타일 유사':     'bg-sky-50    text-sky-700    border border-sky-100',
  '색상 유사':       'bg-pink-50   text-pink-700   border border-pink-100',
}

const SEASON_LABEL: Record<string, string> = {
  spring: '🌸봄/가을', summer: '☀️여름', fall: '🌸봄/가을', winter: '❄️겨울',
}

export default function ProductCard({
  product, onWishlist, onTryOn, isSelected, isTryOnLoading,
}: Props) {
  return (
    <div
      onClick={() => !isTryOnLoading && onTryOn(product)}
      className={[
        'group relative flex flex-col bg-white rounded-xl border overflow-hidden',
        'transition-all duration-200',
        isTryOnLoading
          ? 'cursor-wait opacity-90'
          : 'cursor-pointer hover:shadow-md',
        isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-400 ring-offset-1'
          : 'border-gray-100 hover:border-blue-200',
      ].join(' ')}
    >
      {/* ── 이미지 (3:4) ── */}
      <div className="relative w-full overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/300x400?text=No+Image'
          }}
        />

        {/* 유사도 */}
        <span className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
              style={{ backgroundColor: '#2563eb' }}>
          {formatSimilarity(product.similarityScore)}
        </span>

        {/* 계절 */}
        {product.season && product.season !== 'all' && (
          <span className="absolute top-2 right-8 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/90 text-gray-600 shadow-sm">
            {SEASON_LABEL[product.season] ?? product.season}
          </span>
        )}

        {/* 위시리스트 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onWishlist(product.id) }}
          aria-label="위시리스트"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition shadow-sm"
        >
          <svg
            className={`w-4 h-4 transition-colors ${product.isWishlisted ? 'text-red-500' : 'text-gray-400'}`}
            viewBox="0 0 24 24"
            fill={product.isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>

        {/* 선택(로딩) 오버레이 */}
        {isSelected && isTryOnLoading && (
          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
          </div>
        )}

        {/* 선택 완료 체크 */}
        {isSelected && !isTryOnLoading && (
          <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        )}

        {/* 호버 힌트 (미선택 상태) */}
        {!isSelected && !isTryOnLoading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors
                          flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <span className="text-white text-[10px] font-bold bg-blue-600/90 px-3 py-1.5 rounded-full shadow">
              착용 미리보기
            </span>
          </div>
        )}
      </div>

      {/* ── 텍스트 ── */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-[10px] text-gray-400 font-medium">{product.category}</p>
        <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</p>
        {product.recommendBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {product.recommendBadges.slice(0, 2).map((b) => (
              <span key={b} className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${BADGE_STYLE[b] ?? 'bg-gray-50 text-gray-500'}`}>
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
