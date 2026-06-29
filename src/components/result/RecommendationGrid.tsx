import { useAppStore } from '@/store/useAppStore'
import { SORT_OPTIONS, SEASON_FILTERS } from '@/utils/constants'
import { toggleWishlistApi } from '@/api/mockApi'
import ProductCard from './ProductCard'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import type { CategoryFilter, SortKey, Season } from '@/types'
import { ChevronDown } from 'lucide-react'

const ACTIVE_TABS: { label: CategoryFilter }[] = [
  { label: '전체'        },
  { label: '전체 상의'   },
  { label: '반팔 티셔츠' },
  { label: '긴팔 티셔츠' },
  { label: '셔츠/블라우스'},
  { label: '니트/스웨터' },
]
const COMING_SOON = ['하의', '원피스', '아우터']

export default function RecommendationGrid() {
  const {
    activeCategory, activeSeason, sortKey,
    wishlistIds, selectedProductId, recommendStatus,
    products, visibleCount,
    setActiveCategory, setActiveSeason, setSortKey,
    toggleWishlist, selectProduct, addToast, loadMore,
    getFilteredProducts,
  } = useAppStore()

  const filtered  = getFilteredProducts()
  const isLoading = recommendStatus === 'loading'

  // 전체 필터 적용 후 총 개수 (visibleCount 적용 전)
  const totalFiltered = (() => {
    let list = (activeCategory === '전체' || activeCategory === '전체 상의')
      ? products
      : products.filter((p) => p.category === activeCategory)
    if (activeSeason !== '전체') list = list.filter((p) => p.season === activeSeason)
    return list.length
  })()
  const hasMore = filtered.length < totalFiltered

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
    <section className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          AI 추천 의류
          <span className="text-sm font-normal text-gray-400 ml-1.5">({totalFiltered}개)</span>
        </h2>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500">
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* 계절 필터 칩 */}
      <div className="flex gap-2 flex-wrap">
        {SEASON_FILTERS.map((s) => (
          <button key={s} onClick={() => setActiveSeason(s as Season)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeSeason === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {s === '전체' ? '🌈 전체' : s === '봄/가을' ? '🌸 봄/가을' : s === '여름' ? '☀️ 여름' : '❄️ 겨울'}
          </button>
        ))}
      </div>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {ACTIVE_TABS.map(({ label }) => (
          <button key={label} onClick={() => setActiveCategory(label as CategoryFilter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === label ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
        {COMING_SOON.map((label) => (
          <div key={label} className="relative flex-shrink-0">
            <button disabled
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-300 cursor-not-allowed select-none flex items-center gap-1">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              {label}
            </button>
          </div>
        ))}
      </div>

      {/* 상품 그리드 — PC 4열, 모바일 2열 */}
      {isLoading ? (
        <SkeletonGrid count={8}/>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">해당 조건의 추천 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p}
              onWishlist={handleWishlist}
              onSelect={handleSelect}
              isSelected={selectedProductId === p.id}/>
          ))}
        </div>
      )}

      {/* Load More */}
      {!isLoading && hasMore && (
        <button onClick={loadMore}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium">
          추천 상품 더보기
          <ChevronDown className="w-4 h-4"/>
        </button>
      )}

      {/* 가상 피팅 안내 */}
      {!isLoading && filtered.length > 0 && !selectedProductId && (
        <p className="text-center text-xs text-gray-400 pt-1">
          👆 상품 카드를 클릭하면 위 AI 스타일링 화면에서 가상으로 입어볼 수 있어요
        </p>
      )}
    </section>
  )
}
