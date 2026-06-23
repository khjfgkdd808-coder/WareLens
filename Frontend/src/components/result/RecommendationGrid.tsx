import { useAppStore } from '@/store/useAppStore'
import { SORT_OPTIONS } from '@/utils/constants'
import { toggleWishlistApi } from '@/api/mockApi'
import ProductCard from './ProductCard'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import type { CategoryFilter, SortKey } from '@/types'

// 상의 서브카테고리 탭 (활성) + 준비중 카테고리
const ACTIVE_TABS: { label: CategoryFilter; key: string }[] = [
  { label: '전체',        key: 'all'    },
  { label: '전체 상의',   key: 'top'    },
  { label: '반팔 티셔츠', key: 'short'  },
  { label: '긴팔 티셔츠', key: 'long'   },
  { label: '셔츠/블라우스',key: 'shirt' },
  { label: '니트/스웨터', key: 'knit'   },
]
const COMING_SOON = ['하의', '원피스', '아우터']

export default function RecommendationGrid() {
  const {
    activeCategory, sortKey, recommendStatus, wishlistIds,
    selectedProductId,
    setActiveCategory, setSortKey, toggleWishlist, selectProduct, addToast,
    getFilteredProducts,
  } = useAppStore()

  const products  = getFilteredProducts()
  const isLoading = recommendStatus === 'loading'

  const handleWishlist = async (productId: string) => {
    toggleWishlist(productId)
    try {
      await toggleWishlistApi(productId)
      addToast('success', wishlistIds.has(productId) ? '위시리스트에서 제거됐습니다.' : '위시리스트에 추가됐습니다.')
    } catch {
      toggleWishlist(productId)
      addToast('error', '위시리스트 업데이트에 실패했습니다.')
    }
  }

  const handleSelect = (id: string) => {
    selectProduct(selectedProductId === id ? null : id)
  }

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          AI 추천 의류 목록
          <span className="text-sm font-normal text-gray-400 ml-1.5">({products.length}개)</span>
        </h2>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap gap-2 mb-5 scrollbar-hide overflow-x-auto pb-1">
        {ACTIVE_TABS.map(({ label }) => (
          <button key={label} onClick={() => setActiveCategory(label as CategoryFilter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === label ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
        {/* 준비중 탭 */}
        {COMING_SOON.map((label) => (
          <div key={label} className="relative flex-shrink-0">
            <button disabled className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-300 cursor-not-allowed select-none">
              <svg className="w-2.5 h-2.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              {label}
            </button>
          </div>
        ))}
      </div>

      {/* 그리드 */}
      {isLoading ? (
        <SkeletonGrid count={6}/>
      ) : products.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">해당 카테고리의 추천 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p}
              onWishlist={handleWishlist}
              onSelect={handleSelect}
              isSelected={selectedProductId === p.id}/>
          ))}
        </div>
      )}

      {/* 선택 안내 */}
      {!isLoading && products.length > 0 && !selectedProductId && (
        <p className="text-center text-xs text-gray-400 mt-4">
          👆 상품 카드를 클릭하면 위 피팅 화면에서 가상으로 입어볼 수 있어요
        </p>
      )}
    </section>
  )
}
