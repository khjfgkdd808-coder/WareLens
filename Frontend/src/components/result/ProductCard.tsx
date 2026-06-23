import type { Product, RecommendBadge } from '@/types'
import { formatPrice, formatSimilarity } from '@/utils/helpers'

interface Props {
  product: Product
  onWishlist: (id: string) => void
  onSelect:   (id: string) => void
  isSelected: boolean
}

const BADGE_STYLE: Record<RecommendBadge, string> = {
  '어깨 비율 보완':    'bg-violet-50 text-violet-700',
  '상체 밸런스 조절':  'bg-blue-50 text-blue-700',
  '체형 적합':        'bg-green-50 text-green-700',
  '스타일 유사':      'bg-sky-50 text-sky-700',
  '색상 유사':        'bg-pink-50 text-pink-700',
}

export default function ProductCard({ product, onWishlist, onSelect, isSelected }: Props) {
  return (
    <div
      className={[
        'group bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-blue-500 shadow-md shadow-blue-100 ring-2 ring-blue-400 ring-offset-1'
          : 'border-gray-100 hover:shadow-md hover:border-gray-200',
      ].join(' ')}
      onClick={() => onSelect(product.id)}
    >
      {/* 이미지 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
        <img src={product.imageUrl} alt={product.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=No+Image' }}/>
        {/* 유사도 뱃지 */}
        <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {formatSimilarity(product.similarityScore)}
        </span>
        {/* 선택 표시 */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        )}
        {/* 위시리스트 */}
        <button onClick={(e) => { e.stopPropagation(); onWishlist(product.id) }}
          aria-label="위시리스트"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition shadow-sm">
          <svg className={`w-4 h-4 transition-colors ${product.isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>
      {/* 정보 */}
      <div className="p-3">
        <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.category}</p>
        {product.recommendBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {product.recommendBadges.slice(0, 2).map((b) => (
              <span key={b} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${BADGE_STYLE[b] ?? 'bg-gray-50 text-gray-500'}`}>
                {b}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs font-bold text-gray-900 mt-2">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}
