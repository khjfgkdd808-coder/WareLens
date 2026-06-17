import { useAppStore } from '@/store/useAppStore'
import { CATEGORY_FILTERS, SORT_OPTIONS } from '@/utils/constants'
import { toggleWishlistApi } from '@/api/mockApi'
import ProductCard from './ProductCard'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import type { CategoryFilter, SortKey } from '@/types'

export default function RecommendationGrid() {
  const {
    activeCategory, sortKey, recommendStatus, wishlistIds,
    setActiveCategory, setSortKey, toggleWishlist, addToast,
    getFilteredProducts,
  } = useAppStore()

  const products = getFilteredProducts()
  const isLoading = recommendStatus === 'loading'

  const handleWishlist = async (productId: string) => {
    toggleWishlist(productId)
    try {
      await toggleWishlistApi(productId)
      const isNowWished = !wishlistIds.has(productId) // 토글 전 상태 반전
      addToast('success', isNowWished ? '위시리스트에 추가됐습니다.' : '위시리스트에서 제거됐습니다.')
    } catch {
      toggleWishlist(productId) // 롤백
      addToast('error', '위시리스트 업데이트에 실패했습니다.')
    }
  }

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          AI 추천 의류 목록
          <span className="text-sm font-normal text-gray-400 ml-2">({products.length}개)</span>
        </h2>
        {/* 정렬 */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap mb-4" role="tablist">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat} role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat as CategoryFilter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 그리드 */}
      {isLoading ? (
        <SkeletonGrid count={6}/>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">해당 카테고리의 추천 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onWishlist={handleWishlist}/>
          ))}
        </div>
      )}

      {/* 더 보기 (mock에서는 비활성) */}
      <button className="w-full mt-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2">
        더 많은 추천 상품 보기
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </section>
  )
}
