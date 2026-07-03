/**
 * ResultPageOption1.tsx — 옵션 1
 *
 * 레이아웃:
 *  좌 1:1 우 = 전신사진+추천사이즈 | 세로 리스트 5개 (스크롤)
 *  우측 카드 hover → 큰 미리보기 팝업
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RotateCcw, Share2, CheckCircle2, Loader2, Heart, X } from 'lucide-react'
import { useAppStore }          from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import { requestTryOn }         from '@/api/tryOnApi'
import { toggleWishlistApi }    from '@/api/mockApi'
import { MOCK_FULLBODY_IMAGE }  from '@/utils/mockData'
import NoticeCard from '@/components/common/NoticeCard'
import type { Product } from '@/types'

/* ── 찜 Floating ──────────────────────────────────────────────── */
function WishlistFloating() {
  const { products, wishlistIds } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const wishlisted = products.filter((p) => wishlistIds.has(p.id))

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="fixed z-40" style={{ right: 20, top: '50%', transform: 'translateY(-50%)' }}>
      <button type="button" onClick={() => setOpen(v => !v)} aria-label="찜한 상품"
        className="relative w-12 h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:shadow-xl transition-all">
        <Heart className={`w-5 h-5 ${wishlisted.length > 0 ? 'text-red-500' : 'text-gray-400'}`}
               fill={wishlisted.length > 0 ? 'currentColor' : 'none'} />
        {wishlisted.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {wishlisted.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden" style={{ width: 260 }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">찜한 상품</p>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {wishlisted.length === 0
              ? <p className="text-xs text-gray-400 text-center py-8">아직 찜한 상품이 없습니다</p>
              : wishlisted.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.category}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 우측 세로 리스트 카드 (hover → 큰 미리보기) ──────────────── */
function ClothingListCard({
  product, isSelected, onSelect, onWishlist,
}: {
  product: Product; isSelected: boolean
  onSelect: (p: Product) => void
  onWishlist: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ top: number }>({ top: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setHoverPos({ top: rect.top })
    }
    setHovered(true)
  }

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(product)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
      style={{
        borderColor: isSelected ? '#2563eb' : '#e5e7eb',
        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* 썸네일 */}
      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
        <img src={product.imageUrl} alt={product.name}
          className="w-full h-full object-cover" />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-medium">{product.category}</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
            적합도 {Math.round(product.similarityScore)}%
          </span>
          {isSelected && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              ✓ 선택됨
            </span>
          )}
        </div>
      </div>

      {/* 찜 */}
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onWishlist(product.id) }}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 transition">
        <Heart className={`w-3.5 h-3.5 ${product.isWishlisted ? 'text-red-500' : 'text-gray-400'}`}
               fill={product.isWishlisted ? 'currentColor' : 'none'} />
      </button>

      {/* Hover 미리보기 — 카드 왼쪽에 팝업 */}
      {hovered && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            right: 'calc(50% + 20px)',
            top: Math.min(hoverPos.top, window.innerHeight - 320),
            width: 220,
          }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="aspect-[3/4] w-full bg-gray-50">
              <img src={product.imageUrl} alt={product.name}
                className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-900 text-center truncate">{product.name}</p>
              <p className="text-[10px] text-gray-400 text-center mt-0.5">{product.category}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ResultPageOption1
═══════════════════════════════════════════════════════════════ */
export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    bodyAnalysis, fullBodyPreview,
    products,
    setProducts, setRecommendStatus, addToast, openErrorModal,
    tryOnSelectedClothing, tryOnStatus,
    setTryOnClothing, setTryOnStatus, setTryOnResult, setTryOnError,
    toggleWishlist, wishlistIds,
  } = useAppStore()

  const [isCopied, setIsCopied] = useState(false)
  const fullBodyUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  useEffect(() => {
    if (!taskId) { navigate('/', { replace: true }); return }
    setRecommendStatus('loading')
    fetchRecommendations({ taskId, category: '전체', sort: 'similarity' })
      .then(({ products: p, totalCount, hasMore }) => {
        setProducts(p, totalCount, hasMore)
        setRecommendStatus('success')
      })
      .catch(() => {
        setRecommendStatus('error')
        openErrorModal('RECOMMENDATION_FAILED')
      })
  }, [taskId])

  const handleSelect = async (product: Product) => {
    if (tryOnSelectedClothing?.id === product.id && tryOnStatus === 'loading') return
    setTryOnClothing({ id: product.id, name: product.name, imageUrl: product.imageUrl, category: product.category })
    setTryOnStatus('loading')
    try {
      const res = await requestTryOn({ personImage: fullBodyUrl, clothingImage: product.imageUrl })
      setTryOnResult(res.resultImageUrl)
    } catch {
      setTryOnError('가상 피팅 생성에 실패했습니다.')
    }
  }

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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      addToast('success', '링크가 복사됐습니다!')
      setTimeout(() => setIsCopied(false), 2500)
    } catch { addToast('error', '링크 복사에 실패했습니다.') }
  }

  // 상위 5개
  const top5 = products.slice(0, 5)

  if (!bodyAnalysis) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">AI 추천을 준비하고 있습니다</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
            <RotateCcw className="w-4 h-4" />홈으로
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-10">
      <WishlistFloating />

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-blue-500 font-semibold tracking-wide uppercase mb-0.5">AI 추천 완료</p>
          <h1 className="text-xl font-bold text-gray-900">오늘의 AI 추천 스타일</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</> : <><Share2 className="w-3.5 h-3.5" />공유</>}
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
            <RotateCcw className="w-3.5 h-3.5" />다시 분석
          </button>
        </div>
      </div>

      {/* ── 1:1 2컬럼 메인 레이아웃 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ 좌측: 상체 중심 전신사진 + 추천 사이즈 ══════════ */}
        <div className="lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">체형 분석 결과</h2>

            {/* 상체 중심 사진 (object-position: top) */}
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-100"
                 style={{ aspectRatio: '3/4', maxHeight: 460 }}>
              <img src={fullBodyUrl} alt="전신 사진"
                className="w-full h-full object-cover object-top" />
              {/* 가상피팅 로딩 오버레이 */}
              {tryOnStatus === 'loading' && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-white text-xs font-semibold">AI 착용 생성 중...</p>
                </div>
              )}
              {/* 가상피팅 성공 시 결과 오버레이 */}
              {tryOnStatus === 'success' && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-bold text-white bg-green-500 px-2 py-1 rounded-full shadow">
                    ✓ AI 착용 결과
                  </span>
                </div>
              )}
            </div>

            {/* 추천 사이즈 */}
            <div className="mt-3 bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400">추천 사이즈</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {bodyAnalysis.recommendedSize.topNumeric}
                  <span className="text-sm text-gray-400 ml-1">({bodyAnalysis.recommendedSize.top})</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">체형 분석 기반</p>
                {tryOnSelectedClothing && (
                  <p className="text-[10px] text-blue-400 mt-0.5 truncate max-w-[120px]">
                    {tryOnSelectedClothing.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ 우측: 세로 리스트 5개 (스크롤 가능) ═════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              AI 추천 상의
              <span className="text-xs text-gray-400 font-normal ml-1.5">TOP 5</span>
            </h2>
            <p className="text-[10px] text-gray-400">카드에 마우스를 올리면 미리볼 수 있어요</p>
          </div>

          {/* 세로 리스트 — 스크롤 */}
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 520 }}>
            {top5.length === 0
              ? <div className="py-12 text-center text-sm text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />추천 목록 불러오는 중...</div>
              : top5.map((product) => (
                  <ClothingListCard
                    key={product.id}
                    product={product}
                    isSelected={tryOnSelectedClothing?.id === product.id}
                    onSelect={handleSelect}
                    onWishlist={handleWishlist}
                  />
                ))}
          </div>
        </div>
      </div>

      <div className="mt-6"><NoticeCard /></div>
    </main>
  )
}
