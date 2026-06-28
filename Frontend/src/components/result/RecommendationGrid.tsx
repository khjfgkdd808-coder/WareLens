import { useAppStore } from '@/store/useAppStore'
import { SORT_OPTIONS } from '@/utils/constants'
import { toggleWishlistApi } from '@/api/mockApi'
import { requestTryOn } from '@/api/tryOnApi'
import ProductCard from './ProductCard'
import type { CategoryFilter, Season, SortKey } from '@/types'
import { Loader2 } from 'lucide-react'

const CATEGORY_TABS: { label: CategoryFilter }[] = [
  { label: '전체'         },
  { label: '전체 상의'    },
  { label: '반팔 티셔츠'  },
  { label: '긴팔 티셔츠'  },
  { label: '셔츠/블라우스'},
  { label: '니트/스웨터'  },
]
const COMING_SOON = ['하의', '원피스', '아우터']

// 계절 필터 칩 데이터
const SEASON_CHIPS: { value: Season; label: string }[] = [
  { value: 'all',    label: '전체'   },
  { value: 'spring', label: '봄/가을' },
  { value: 'summer', label: '여름'   },
  { value: 'winter', label: '겨울'   },
]

/* 스켈레톤 카드 — 4열 그리드용 */
function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="flex gap-1 mt-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-14" />
        </div>
      </div>
    </div>
  )
}

export default function RecommendationGrid() {
  const {
    activeCategory, activeSeason, sortKey,
    recommendStatus, wishlistIds, selectedProductId,
    setActiveCategory, setActiveSeason, setSortKey,
    toggleWishlist, selectProduct, addToast,
    getFilteredProducts, getVisibleProducts,
    visibleCount, loadMore,
    /* Try-On 상태 */
    tryOnSelectedClothing, tryOnStatus,
    setTryOnClothing, setTryOnStatus, setTryOnResult, setTryOnError,
    fullBodyPreview,
    /* 의류 선택 원본 */
    selectedRecommendation, setSelectedRecommendation,
  } = useAppStore()

  const allFiltered = getFilteredProducts()
  const visible     = getVisibleProducts()
  const isLoading   = recommendStatus === 'loading'
  const hasMore     = visible.length < allFiltered.length

  const handleWishlist = async (productId: string) => {
    toggleWishlist(productId)
    try {
      await toggleWishlistApi(productId)
      addToast('success',
        wishlistIds.has(productId) ? '위시리스트에서 제거됐습니다.' : '위시리스트에 추가됐습니다.'
      )
    } catch {
      toggleWishlist(productId)
      addToast('error', '위시리스트 업데이트에 실패했습니다.')
    }
  }

  const handleSelect = (id: string) => {
    selectProduct(selectedProductId === id ? null : id)
    // 선택 해제 시 selectedRecommendation도 초기화
    if (selectedProductId === id) setSelectedRecommendation(null)
  }

  /** "이 옷 입어보기" 클릭 핸들러 */
  const handleTryOn = async (product: ReturnType<typeof getVisibleProducts>[0]) => {
    if (tryOnSelectedClothing?.id === product.id && tryOnStatus === 'loading') return

    const personImageUrl = fullBodyPreview?.previewUrl
    if (!personImageUrl) {
      addToast('error', '전신 사진이 없습니다. 홈에서 먼저 전신 사진을 업로드해 주세요.')
      return
    }

    // 선택 의류 저장 (UI 표시용)
    setTryOnClothing({
      id:       product.id,
      name:     product.name,
      imageUrl: product.imageUrl,
      category: product.category,
    })
    setTryOnStatus('loading')

    try {
      // TODO: AI Try-On API 연결 예정 — 현재는 requestTryOn Mock 사용
      const res = await requestTryOn({
        personImage:   personImageUrl,
        clothingImage: product.imageUrl,
      })
      setTryOnResult(res.resultImageUrl)
      addToast('success', '가상 피팅 이미지가 생성됐습니다!')
    } catch {
      setTryOnError('가상 피팅 생성에 실패했습니다. 다시 시도해 주세요.')
      addToast('error', '가상 피팅 요청에 실패했습니다.')
    }
  }

  return (
    <section>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          AI 추천 의류 목록
          <span className="text-sm font-normal text-gray-400 ml-1.5">
            ({visible.length}/{allFiltered.length}개)
          </span>
        </h2>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ outline: 'none' }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── 카테고리 탭 ── */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_TABS.map(({ label }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveCategory(label as CategoryFilter)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeCategory === label ? '#2563eb' : '#f3f4f6',
              color:           activeCategory === label ? '#ffffff'  : '#4b5563',
            }}
          >
            {label}
          </button>
        ))}
        {COMING_SOON.map((label) => (
          <button key={label} disabled
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-300 cursor-not-allowed select-none"
          >
            🔒 {label}
          </button>
        ))}
      </div>

      {/* ── 계절 필터 칩 ── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {SEASON_CHIPS.map(({ value, label }) => {
          const isActive = activeSeason === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setActiveSeason(value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap"
              style={{
                backgroundColor: isActive ? '#dbeafe' : '#ffffff',
                borderColor:     isActive ? '#93c5fd' : '#e5e7eb',
                color:           isActive ? '#1d4ed8' : '#6b7280',
                fontWeight:      isActive ? 600 : 400,
              }}
            >
              {value === 'spring' && '🌸 '}
              {value === 'summer' && '☀️ '}
              {value === 'winter' && '❄️ '}
              {value === 'all'    && '🌈 '}
              {label}
            </button>
          )
        })}
      </div>

      {/* ── 카드 그리드 — PC 4열 / Mobile 2열 ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : allFiltered.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">해당 조건의 추천 상품이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">카테고리 또는 계절 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <>
          {/*
            PC:     4열 (lg:grid-cols-4)
            태블릿: 3열 (sm:grid-cols-3)
            모바일: 2열 (grid-cols-2)
          */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onWishlist={handleWishlist}
                onSelect={handleSelect}
                onTryOn={handleTryOn}
                isSelected={selectedProductId === p.id}
                isTryOnLoading={
                  tryOnSelectedClothing?.id === p.id && tryOnStatus === 'loading'
                }
              />
            ))}
          </div>

          {/* ── 더보기 버튼 ── */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: '#f0f9ff',
                  border:          '1.5px solid #bae6fd',
                  color:           '#0369a1',
                }}
              >
                <Loader2 className="w-4 h-4" style={{ display: 'none' }} />
                추천 상품 더보기
                <span className="text-xs font-normal opacity-70">
                  ({allFiltered.length - visible.length}개 더)
                </span>
              </button>
            </div>
          )}

          {/* 전체 표시 완료 메시지 */}
          {!hasMore && allFiltered.length > 0 && visibleCount > 8 && (
            <p className="mt-4 text-center text-xs text-gray-400">
              모든 추천 상품을 확인했습니다. ({allFiltered.length}개)
            </p>
          )}
        </>
      )}
    </section>
  )
}
