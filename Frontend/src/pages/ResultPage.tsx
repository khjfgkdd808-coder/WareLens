import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import { MOCK_FULLBODY_IMAGE } from '@/utils/mockData'
import AnalysisCard       from '@/components/result/AnalysisCard'
import RecommendationGrid from '@/components/result/RecommendationGrid'
import VirtualFitting     from '@/components/result/VirtualFitting'
import NoticeCard         from '@/components/common/NoticeCard'

/**
 * ResultPage 레이아웃 (AI 분석 요약 제거 후)
 *
 * ① 체형 분석 결과 (AnalysisCard)
 * ② AI 스타일링 결과 (VirtualFitting — 확대) + 추천 의류 목록 (RecommendationGrid)
 * ③ 주의사항 (NoticeCard)
 */
export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    bodyAnalysis, fullBodyPreview,
    products, selectedProductId,
    setProducts, setRecommendStatus, addToast,
  } = useAppStore()
  const [isCopied, setIsCopied] = useState(false)

  // 추천 목록 로드
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
        addToast('error', '추천 목록을 불러오지 못했습니다.')
      })
  }, [taskId])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      addToast('success', '결과 링크가 복사됐습니다!')
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      addToast('error', '링크 복사에 실패했습니다.')
    }
  }

  // 선택된 상품 객체
  const selectedProduct = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null

  // 전신사진: 실제 업로드 → Mock fallback
  const fullBodyUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  // 로딩/에러 fallback
  if (!bodyAnalysis) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">분석 결과를 불러오는 중입니다</p>
          <p className="text-sm text-gray-400 mb-5">잠시만 기다려 주세요.</p>
          <button onClick={() => navigate('/')}
            className="text-sm text-brand-600 hover:underline flex items-center gap-1 mx-auto">
            <RotateCcw className="w-4 h-4" /> 홈으로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">추천 결과</h1>
        <div className="flex items-center gap-2">

          {/* 공유 버튼 */}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
              : <><Share2 className="w-3.5 h-3.5" />결과 공유</>
            }
          </button>

          {/* 다시 분석 */}
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
            <RotateCcw className="w-3.5 h-3.5" /> 다시 분석
          </button>
        </div>
      </div>

      {/* ── ① 체형 분석 결과 ── */}
      <AnalysisCard data={bodyAnalysis} />

      {/*
        ── ② AI 스타일링 결과 + 추천 의류 목록 ──
        PC:  [가상피팅 (좌, 고정폭)] | [추천목록 (우, flex-1)]
        모바일: 세로 스택
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">

        {/* 가상 피팅 — 확대 배치 */}
        <div className="lg:sticky lg:top-20">
          <VirtualFitting
            fullBodyImageUrl={fullBodyUrl}
            selectedProduct={selectedProduct}
          />
        </div>

        {/* 추천 의류 목록 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <RecommendationGrid />
        </div>
      </div>

      {/* ── 주의사항 ── */}
      <NoticeCard />
      <div className="h-4" />
    </main>
  )
}
