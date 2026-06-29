import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, RotateCcw, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import { MOCK_FULLBODY_IMAGE } from '@/utils/mockData'
import VirtualFitting     from '@/components/result/VirtualFitting'
import AnalysisCard       from '@/components/result/AnalysisCard'
import AIExplanationCard  from '@/components/result/AIExplanationCard'
import RecommendationGrid from '@/components/result/RecommendationGrid'
import NoticeCard         from '@/components/common/NoticeCard'
import { getBMIInfo }     from '@/utils/helpers'

/**
 * ResultPage 최종 레이아웃
 *
 * ① AI 스타일링 결과 (최상단 메인, 크게) + 가상피팅 + MediaPipe 관절 영역
 * ② AI 분석 요약 카드 (체형 + 스타일 요약)
 * ③ 추천 의류 Grid (Season 필터 + Load More)
 * ④ 체형 분석 상세 (접기/펼치기)
 * ⑤ 주의사항
 */
export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    bodyAnalysis, aiExplanation, fullBodyPreview, landmarks,
    products, selectedProductId,
    setProducts, setRecommendStatus, addToast,
  } = useAppStore()

  const [isCopied, setIsCopied]       = useState(false)
  const [showDetail, setShowDetail]   = useState(false)

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

  const selectedProduct = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null

  const fullBodyUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  // 로딩 상태
  if (!bodyAnalysis || !aiExplanation) {
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

  const bmiInfo = getBMIInfo(bodyAnalysis.bmi)

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">AI 스타일링 결과</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
              : <><Share2 className="w-3.5 h-3.5" />결과 공유</>
            }
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition">
            <RotateCcw className="w-3.5 h-3.5" /> 다시 분석
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          ① AI 스타일링 결과 — 최상단 메인, 크게 배치
          PC: [가상피팅 넓게] | [추천목록]
          모바일: 세로 스택
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">

        {/* 가상 피팅 (sticky) */}
        <div className="lg:sticky lg:top-20 space-y-3">
          <VirtualFitting
            fullBodyImageUrl={fullBodyUrl}
            selectedProduct={selectedProduct}
            landmarks={landmarks}
          />

          {/* MediaPipe 분석 정보 칩 */}
          {bodyAnalysis && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 grid grid-cols-3 gap-2 text-center shadow-sm">
              {[
                { label: '어깨', value: `${bodyAnalysis.bodyMeasurements.shoulderWidth}cm` },
                { label: '허리', value: `${bodyAnalysis.bodyMeasurements.waistCircumference}cm` },
                { label: '다리', value: `${bodyAnalysis.bodyMeasurements.legLength}cm` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-gray-800 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 추천 의류 목록 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <RecommendationGrid />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          ② AI 분석 요약 카드
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 체형 분석 요약 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3"/>
                <path d="M12 8v4M8.5 13.5l-1.5 6.5M15.5 13.5l1.5 6.5M8 16h8"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">내 체형 분석</h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">체형 타입</span>
              <span className="text-xs font-semibold text-gray-800">{bodyAnalysis.bodyType}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">BMI</span>
              <span className={`text-xs font-bold ${bmiInfo.color}`}>
                {bodyAnalysis.bmi} <span className="font-normal">({bmiInfo.label})</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs text-gray-500">추천 상의 사이즈</span>
              <span className="text-xs font-bold text-brand-600">
                {bodyAnalysis.recommendedSize.top} / {bodyAnalysis.recommendedSize.topNumeric}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">추천 하의 사이즈</span>
              <span className="text-xs font-bold text-brand-600">{bodyAnalysis.recommendedSize.bottom}</span>
            </div>
          </div>
        </div>

        {/* AI 스타일 분석 요약 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">AI 스타일 분석</h3>
          </div>

          {/* 신뢰도 게이지 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>추천 신뢰도</span>
              <span className="font-semibold text-brand-600">{aiExplanation.confidenceScore}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-700"
                style={{ width: `${aiExplanation.confidenceScore}%` }}/>
            </div>
          </div>

          {/* 분석 결과 태그 */}
          <div className="flex flex-wrap gap-1.5">
            {aiExplanation.reasons.map((r) => (
              <span key={r} className="text-[10px] bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full font-medium">
                # {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          ③ 체형 분석 상세 (접기/펼치기)
      ═══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
        >
          <span className="text-sm font-semibold text-gray-900">체형 분석 상세 보기</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetail ? 'rotate-180' : ''}`}/>
        </button>
        {showDetail && (
          <div className="border-t border-gray-100 animate-slide-down">
            <AnalysisCard data={bodyAnalysis} />
          </div>
        )}
      </div>

      {/* AIExplanationCard (상세) */}
      {showDetail && <AIExplanationCard data={aiExplanation} />}

      {/* 주의사항 */}
      <NoticeCard />
      <div className="h-4" />
    </main>
  )
}
