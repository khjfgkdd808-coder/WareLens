import type { Product, RecommendBadge } from '@/types'
import { formatPrice, formatSimilarity } from '@/utils/helpers'

interface Props {
  product:  Product
  onWishlist: (id: string) => void
}

const BADGE_STYLE: Record<RecommendBadge, string> = {
  '색상 유사':  'bg-purple-50 text-purple-700',
  '스타일 유사': 'bg-blue-50 text-blue-700',
  '체형 적합':  'bg-green-50 text-green-700',
}

export default function ProductCard({ product, onWishlist }: Props) {
  return (
    <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 animate-fade-in">
      {/* 이미지 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=No+Image' }}
        />
        {/* 유사도 뱃지 */}
        <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {formatSimilarity(product.similarityScore)} 유사도
        </span>
        {/* 위시리스트 */}
        <button
          onClick={() => onWishlist(product.id)}
          aria-label={product.isWishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm"
        >
          <svg className={`w-4 h-4 transition-colors ${product.isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>

      {/* 정보 */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>

        {/* 색상 */}
        {product.colors.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {product.colors.map((c) => (
              <span key={c} className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: c }} title={c}/>
            ))}
          </div>
        )}

        {/* 추천 뱃지 */}
        {product.recommendBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.recommendBadges.map((b) => (
              <span key={b} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${BADGE_STYLE[b]}`}>
                ✓ {b}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm font-bold text-gray-900 mt-2">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}
