/**
 * RecommendationGrid.tsx
 * AI 추천 결과 — 좌우로 넘겨보는 캐러셀 구조
 *
 * UX 변경:
 *  기존: 그리드 카드 클릭 → 가상피팅
 *  현재: 좌우 화살표 / 스와이프로 추천 옷을 넘기면
 *        selectedIndex 변경 → onItemChange(product) 즉시 호출
 *        → 가상피팅 결과 자동 갱신 (별도 클릭 불필요)
 *
 * 처음 노출: AI 추천 4개 (PAGE_SIZE_PC=4)
 * 더보기 클릭 시 4개씩 추가 노출 → 캐러셀 범위 확장
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { toggleWishlistApi } from '@/api/mockApi'
import { SORT_OPTIONS } from '@/utils/constants'
import type { CategoryFilter, Season, SortKey, Product } from '@/types'

interface Props {
  /** 캐러셀에서 옷이 바뀔 때마다 호출 — ResultPage가 가상피팅 갱신 */
  onItemChange: (product: Product) => void
}

const CATEGORY_TABS: { label: CategoryFilter }[] = [
  { label: '전체'          },
  { label: '전체 상의'     },
  { label: '반팔 티셔츠'   },
  { label: '긴팔 티셔츠'   },
  { label: '셔츠/블라우스' },
  { label: '니트/스웨터'   },
]
const SEASON_CHIPS: { value: Season; label: string }[] = [
  { value: 'all',    label: '전체'   },
  { value: 'spring', label: '봄/가을' },
  { value: 'summer', label: '여름'   },
  { value: 'winter', label: '겨울'   },
]

const BADGE_STYLE: Record<string, string> = {
  '어깨 비율 보완':   'bg-violet-50 text-violet-700',
  '상체 밸런스 조절': 'bg-blue-50 text-blue-700',
  '체형 적합':       'bg-green-50 text-green-700',
  '스타일 유사':     'bg-sky-50 text-sky-700',
  '색상 유사':       'bg-pink-50 text-pink-700',
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
      </div>
    </div>
  )
}

export default function RecommendationGrid({ onItemChange }: Props) {
  const {
    activeCategory, activeSeason, sortKey,
    recommendStatus, wishlistIds,
    setActiveCategory, setActiveSeason, setSortKey,
    toggleWishlist, addToast,
    getFilteredProducts, getVisibleProducts,
    visibleCount, loadMore,
    tryOnSelectedClothing,
    bodyAnalysis,
  } = useAppStore()

  const allFiltered = getFilteredProducts()
  const visible     = getVisibleProducts()
  const isLoading   = recommendStatus === 'loading'
  const hasMore     = visible.length < allFiltered.length

  // 현재 캐러셀에서 보고 있는 인덱스
  const [activeIndex, setActiveIndex] = useState(0)
  const didInit = useRef(false)

  // 목록이 로드되면 첫 상품으로 자동 선택 (즉시 가상피팅 시작)
  useEffect(() => {
    if (!isLoading && visible.length > 0 && !didInit.current) {
      didInit.current = true
      setActiveIndex(0)
      onItemChange(visible[0])
    }
  }, [isLoading, visible.length])

  // 필터 변경 시 인덱스 초기화
  useEffect(() => {
    if (visible.length > 0) {
      setActiveIndex(0)
      onItemChange(visible[0])
    }
  }, [activeCategory, activeSeason, sortKey])

  const handleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    toggleWishlist(productId)
    try {
      await toggleWishlistApi(productId)
      addToast('success', wishlistIds.has(productId) ? '위시리스트에서 제거됐습니다.' : '위시리스트에 추가됐습니다.')
    } catch {
      toggleWishlist(productId)
      addToast('error', '위시리스트 업데이트에 실패했습니다.')
    }
  }

  /** 좌우 이동 — 옷을 넘기면 즉시 onItemChange 호출 */
  const goTo = (idx: number) => {
    if (idx < 0 || idx >= visible.length) return
    setActiveIndex(idx)
    onItemChange(visible[idx])
  }
  const goPrev = () => goTo(activeIndex - 1)
  const goNext = () => {
    if (activeIndex === visible.length - 1 && hasMore) {
      loadMore()
      // 다음 렌더에서 더보기로 늘어난 목록 기준 인덱스 이동
      setTimeout(() => goTo(activeIndex + 1), 50)
      return
    }
    goTo(activeIndex + 1)
  }

  /** 스와이프(터치) 지원 */
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev()
  }

  const current = visible[activeIndex]

  return (
    <section>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          AI 추천 옷
          <span className="text-sm font-normal text-gray-400 ml-1.5">
            {!isLoading && visible.length > 0 && `${activeIndex + 1} / ${allFiltered.length}`}
          </span>
        </h2>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ outline: 'none' }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* ── 카테고리 탭 ── */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_TABS.map(({ label }) => (
          <button key={label} type="button"
            onClick={() => setActiveCategory(label as CategoryFilter)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeCategory === label ? '#2563eb' : '#f3f4f6',
              color:           activeCategory === label ? '#ffffff'  : '#4b5563',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 계절 필터 ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {SEASON_CHIPS.map(({ value, label }) => {
          const isActive = activeSeason === value
          return (
            <button key={value} type="button" onClick={() => setActiveSeason(value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap"
              style={{
                backgroundColor: isActive ? '#dbeafe' : '#ffffff',
                borderColor:     isActive ? '#93c5fd' : '#e5e7eb',
                color:           isActive ? '#1d4ed8' : '#6b7280',
                fontWeight:      isActive ? 600 : 400,
              }}>
              {value === 'spring' && '🌸 '}{value === 'summer' && '☀️ '}
              {value === 'winter' && '❄️ '}{value === 'all'    && '🌈 '}
              {label}
            </button>
          )
        })}
      </div>

      {/* ── 캐러셀: 좌우로 넘겨보기 ── */}
      {isLoading ? (
        <SkeletonCard />
      ) : visible.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">해당 조건의 추천 상품이 없습니다.</p>
        </div>
      ) : current && (
        <div
          className="relative select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 메인 카드 (현재 선택된 옷) */}
          <div className="flex items-center gap-2">

            {/* ◀ 이전 */}
            <button
              type="button"
              onClick={goPrev}
              disabled={activeIndex === 0}
              aria-label="이전 옷"
              className="flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition"
              style={{
                borderColor: activeIndex === 0 ? '#f3f4f6' : '#e5e7eb',
                color:       activeIndex === 0 ? '#d1d5db' : '#374151',
                cursor:      activeIndex === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: '#fff',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 카드 본문 */}
            <div
              key={current.id}
              className="flex-1 bg-white rounded-2xl border-2 overflow-hidden transition-all"
              style={{
                borderColor: tryOnSelectedClothing?.id === current.id ? '#2563eb' : '#f3f4f6',
                animation: 'fadeSlide 0.25s ease-out',
              }}
            >
              <div className="flex flex-col sm:flex-row">
                {/* 이미지 — 비율 확대로 오른쪽 영역 공간 채움 */}
                <div className="relative sm:w-1/2 flex-shrink-0 bg-gray-50" style={{ aspectRatio: '3/4' }}>
                  <img
                    src={current.imageUrl}
                    alt={current.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x400?text=No+Image' }}
                  />
                  <span className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#2563eb' }}>
                    적합도 {Math.round(current.similarityScore)}%
                  </span>
                  {/* 찜 토글 — 액션은 카드에 유지, 목록 표시는 우측 floating Popover로 분리 */}
                  <button
                    type="button"
                    onClick={(e) => handleWishlist(e, current.id)}
                    aria-label="찜하기"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition shadow-sm"
                  >
                    <Heart
                      className={`w-3 h-3 ${current.isWishlisted ? 'text-red-500' : 'text-gray-400'}`}
                      fill={current.isWishlisted ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                {/* 정보 — 색상/사이즈까지 포함하여 확장 */}
                <div className="flex-1 p-5 flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">{current.category}</p>
                    <p className="text-lg font-bold text-gray-900 leading-snug">{current.name}</p>
                  </div>

                  {/* 적합도 강조 */}
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm font-bold text-blue-600">
                      적합도 {Math.round(current.similarityScore)}%
                    </span>
                  </div>

                  {/* 추천 이유 */}
                  {current.recommendBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {current.recommendBadges.map((b) => (
                        <span key={b} className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${BADGE_STYLE[b] ?? 'bg-gray-50 text-gray-500'}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 구분선 */}
                  <div className="h-px bg-gray-100" />

                  {/* 색상 — 추후 확장 가능 구조 */}
                  {current.colors.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1.5">색상</p>
                      <div className="flex items-center gap-1.5">
                        {current.colors.map((c) => (
                          <span key={c} className="text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 추천 사이즈 — 상품 정보와 함께 표시 (체형분석 영역의 큰 표시 대신) */}
                  {bodyAnalysis && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">추천 사이즈</p>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">
                        {bodyAnalysis.recommendedSize.top}
                        <span className="text-[10px] font-normal text-gray-400 ml-0.5">
                          ({bodyAnalysis.recommendedSize.topNumeric})
                        </span>
                      </span>
                    </div>
                  )}

                  {/* 점 인디케이터 */}
                  <div className="flex items-center gap-1 mt-auto pt-1">
                    {visible.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goTo(i)}
                        className="rounded-full transition-all"
                        style={{
                          width:  i === activeIndex ? 16 : 6,
                          height: 6,
                          backgroundColor: i === activeIndex ? '#2563eb' : '#e5e7eb',
                        }}
                        aria-label={`${i + 1}번째 옷`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ▶ 다음 */}
            <button
              type="button"
              onClick={goNext}
              disabled={activeIndex === visible.length - 1 && !hasMore}
              aria-label="다음 옷"
              className="flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition"
              style={{
                borderColor: (activeIndex === visible.length - 1 && !hasMore) ? '#f3f4f6' : '#2563eb',
                color:       (activeIndex === visible.length - 1 && !hasMore) ? '#d1d5db' : '#2563eb',
                cursor:      (activeIndex === visible.length - 1 && !hasMore) ? 'not-allowed' : 'pointer',
                backgroundColor: (activeIndex === visible.length - 1 && !hasMore) ? '#fff' : '#eff6ff',
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 더보기 안내 (마지막 카드에서) */}
          {activeIndex === visible.length - 1 && hasMore && (
            <p className="text-center text-[11px] text-blue-500 mt-3">
              → 다음 화살표를 누르면 추천 옷 4개를 더 불러옵니다
            </p>
          )}
          {!hasMore && allFiltered.length > 4 && (
            <p className="text-center text-[11px] text-gray-400 mt-3">
              모든 추천 옷을 확인했습니다 ({allFiltered.length}개)
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  )
}
