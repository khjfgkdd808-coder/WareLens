/**
 * ResultPage.tsx — AI 추천 + 가상피팅 통합 화면
 *
 * UX 구조 (WareLens 방향):
 *  - 좌 50% : 가상피팅 결과 (사용자 전신 + 선택 옷 착용 결과)
 *  - 우 50% : 추천 캐러셀 (좌우로 넘기면 즉시 왼쪽 결과 갱신)
 *  - "이 옷 입어보기" 버튼 없음 — 옷을 넘기는 행위 자체가 가상피팅
 *  - 추천 사이즈는 상품 정보와 함께 표시 (체형분석 패널의 큰 사이즈 표시 제거)
 *  - 찜(하트): 추천 영역 내부가 아닌 우측 floating 버튼 + Popover로 분리
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RotateCcw, Share2, CheckCircle2, Loader2, Sparkles, Heart, X } from 'lucide-react'
import { useAppStore }          from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import { requestTryOn }         from '@/api/tryOnApi'
import { MOCK_FULLBODY_IMAGE }  from '@/utils/mockData'
import NoticeCard         from '@/components/common/NoticeCard'
import RecommendationGrid from '@/components/result/RecommendationGrid'
import type { Product } from '@/types'

/* ── 찜(위시리스트) Floating 버튼 + Popover ──────────────────── */
function WishlistFloatingButton() {
  const { products, wishlistIds } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const wishlisted = products.filter((p) => wishlistIds.has(p.id))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={ref}
      className="fixed z-40"
      style={{ right: 20, top: '50%', transform: 'translateY(-50%)' }}
    >
      {/* Floating 버튼 — 스크롤해도 고정 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="찜한 상품"
        className="relative w-12 h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
      >
        <Heart
          className={`w-5 h-5 ${wishlisted.length > 0 ? 'text-red-500' : 'text-gray-400'}`}
          fill={wishlisted.length > 0 ? 'currentColor' : 'none'}
        />
        {wishlisted.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {wishlisted.length}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          style={{ width: 260 }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">찜한 상품</p>
            <button onClick={() => setOpen(false)} aria-label="닫기"
              className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {wishlisted.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                아직 찜한 상품이 없습니다
              </p>
            ) : (
              wishlisted.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                  <img src={p.imageUrl} alt={p.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-50" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.category}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 가상피팅 결과 패널 (왼쪽 50%) ───────────────────────────── */
function VirtualFittingPanel({ personImageUrl }: { personImageUrl: string }) {
  const {
    tryOnSelectedClothing, tryOnStatus, tryOnResultImageUrl,
    tryOnError,
  } = useAppStore()

  /* idle — 안내 문구 (변경된 카피) */
  if (!tryOnSelectedClothing || tryOnStatus === 'idle') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
           style={{ aspectRatio: '3/4', maxHeight: 520 }}>
        <img src={personImageUrl} alt="원본 사진"
          className="w-full h-full object-cover object-top" />
        <div className="absolute bottom-4 inset-x-4">
          <div className="bg-black/55 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
            <Sparkles className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            {/* 변경된 안내 문구 */}
            <p className="text-white text-xs font-medium leading-relaxed">
              AI 추천 스타일을 넘겨보며<br/>가상 피팅 결과를 확인하세요
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* loading */
  if (tryOnStatus === 'loading') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-blue-50 border border-blue-100"
           style={{ aspectRatio: '3/4', maxHeight: 520 }}>
        <img src={personImageUrl} alt="원본" className="w-full h-full object-cover object-top opacity-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-blue-700">AI 착용 생성 중</p>
            <p className="text-xs text-blue-500 mt-1">{tryOnSelectedClothing.name}</p>
          </div>
        </div>
      </div>
    )
  }

  /* error */
  if (tryOnStatus === 'error') {
    return (
      <div className="w-full rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-3 py-16"
           style={{ minHeight: 400 }}>
        <p className="text-sm font-semibold text-red-700">생성 실패</p>
        <p className="text-xs text-red-500 text-center px-6">{tryOnError}</p>
      </div>
    )
  }

  /* success — 착용 결과 메인 */
  if (tryOnStatus === 'success' && tryOnResultImageUrl) {
    const isMock = tryOnResultImageUrl === personImageUrl
      || tryOnResultImageUrl === tryOnSelectedClothing.imageUrl

    return (
      <div className="space-y-3">
        {isMock && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-amber-600 font-medium text-center">
              UI 테스트 모드 — 실제 API 연결 시 합성 이미지가 생성됩니다
            </p>
          </div>
        )}
        <div className="relative w-full rounded-2xl overflow-hidden border-2"
             style={{ aspectRatio: '3/4', maxHeight: 520, borderColor: '#86efac' }}>
          <img src={tryOnResultImageUrl} alt="AI 착용 결과"
            className="w-full h-full object-cover object-top" />
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold text-white bg-green-500 px-2.5 py-1 rounded-full shadow">
              ✓ AI 착용 결과
            </span>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════
   ResultPage
═══════════════════════════════════════════════════════════════ */
export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    bodyAnalysis, fullBodyPreview,
    setProducts, setRecommendStatus, addToast, openErrorModal,
    tryOnSelectedClothing, tryOnStatus,
    setTryOnClothing, setTryOnStatus, setTryOnResult, setTryOnError,
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
        openErrorModal('RECOMMENDATION_FAILED', () => {
          setRecommendStatus('loading')
          fetchRecommendations({ taskId: taskId!, category: '전체', sort: 'similarity' })
            .then(({ products: p, totalCount, hasMore }) => {
              setProducts(p, totalCount, hasMore)
              setRecommendStatus('success')
            })
            .catch(() => openErrorModal('SERVER_ERROR'))
        })
      })
  }, [taskId])

  /**
   * 옷을 넘길 때마다 호출 — 클릭이 아니라 "탐색" 자체가 트리거
   * RecommendationGrid의 onItemChange로 연결
   */
  const handleItemChange = async (product: Product) => {
    if (tryOnSelectedClothing?.id === product.id && tryOnStatus === 'loading') return

    setTryOnClothing({
      id: product.id, name: product.name,
      imageUrl: product.imageUrl, category: product.category,
    })
    setTryOnStatus('loading')

    try {
      const res = await requestTryOn({ personImage: fullBodyUrl, clothingImage: product.imageUrl })
      setTryOnResult(res.resultImageUrl)
    } catch {
      setTryOnError('가상 피팅 생성에 실패했습니다.')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      addToast('success', '링크가 복사됐습니다!')
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      addToast('error', '링크 복사에 실패했습니다.')
    }
  }

  if (!bodyAnalysis) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">AI 추천을 준비하고 있습니다</p>
          <p className="text-sm text-gray-400 mb-5">잠시만 기다려 주세요.</p>
          <button onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
            <RotateCcw className="w-4 h-4" />홈으로
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-10">

      {/* 찜 Floating 버튼 — 스크롤해도 유지 */}
      <WishlistFloatingButton />

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-blue-500 font-semibold tracking-wide uppercase mb-0.5">AI 추천 완료</p>
          <h1 className="text-xl font-bold text-gray-900">오늘의 AI 추천 스타일</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
              : <><Share2 className="w-3.5 h-3.5" />공유</>
            }
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
            <RotateCcw className="w-3.5 h-3.5" />다시 분석
          </button>
        </div>
      </div>

      {/* ── 좌(50%) 가상피팅 / 우(50%) 추천 캐러셀 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ 왼쪽 50%: 가상피팅 결과 ══════════════════════ */}
        <div className="lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">가상 피팅 결과</h2>
            <VirtualFittingPanel personImageUrl={fullBodyUrl} />

            {/* 추천 사이즈 — 상품 정보와 함께 (체형분석 큰 표시 제거됨) */}
            {tryOnSelectedClothing && (
              <div className="mt-3 bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400">{tryOnSelectedClothing.name}</p>
                  <p className="text-[10px] text-gray-500">추천 사이즈</p>
                  <p className="text-xl font-bold text-white tabular-nums">
                    {bodyAnalysis.recommendedSize.topNumeric}
                    <span className="text-sm text-gray-400 ml-1">({bodyAnalysis.recommendedSize.top})</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">체형 분석 기반</p>
                  <p className="text-[10px] text-gray-500">자동 산출</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ 오른쪽 50%: 추천 캐러셀 ══════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <RecommendationGrid onItemChange={handleItemChange} />
        </div>
      </div>

      <div className="mt-6">
        <NoticeCard />
      </div>
    </main>
  )
}
