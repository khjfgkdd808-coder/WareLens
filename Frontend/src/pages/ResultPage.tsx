import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import AnalysisCard       from '@/components/result/AnalysisCard'
import AIExplanationCard  from '@/components/result/AIExplanationCard'
import RecommendationGrid from '@/components/result/RecommendationGrid'
import NoticeCard         from '@/components/common/NoticeCard'

export default function ResultPage() {
  const { taskId }  = useParams<{ taskId: string }>()
  const navigate    = useNavigate()
  const { bodyAnalysis, aiExplanation, setProducts, setRecommendStatus, addToast } = useAppStore()
  const [isCopied, setIsCopied] = useState(false)

  // bodyAnalysis가 없으면 mock 데이터로 직접 진입 가능하도록 로드
  useEffect(() => {
    if (!taskId) { navigate('/upload', { replace: true }); return }
    setRecommendStatus('loading')
    fetchRecommendations({ taskId, category: '전체', sort: 'similarity' })
      .then(({ products, totalCount, hasMore }) => {
        setProducts(products, totalCount, hasMore)
        setRecommendStatus('success')
      })
      .catch(() => setRecommendStatus('error'))
  }, [taskId])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      addToast('success', '결과 링크가 복사됐습니다!')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      addToast('error', '링크 복사에 실패했습니다.')
    }
  }

  // bodyAnalysis 없으면 (직접 URL 접근) mock 데이터 import
  const analysis   = bodyAnalysis
  const explanation = aiExplanation

  if (!analysis || !explanation) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">분석 결과를 불러오는 중입니다...</p>
          <button onClick={() => navigate('/upload')}
            className="text-sm text-blue-600 hover:underline">← 업로드 페이지로</button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">분석 결과</h1>
          <p className="text-sm text-gray-400 mt-0.5">AI가 분석한 나의 체형과 추천 의류입니다.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            {isCopied ? (
              <><svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>복사됨</>
            ) : (
              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>결과 공유</>
            )}
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
            다시 분석
          </button>
        </div>
      </div>

      {/* 체형 분석 카드 */}
      <AnalysisCard data={analysis}/>

      {/* AI 분석 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <AIExplanationCard data={explanation}/>
        {/* 오른쪽: 간단한 분석 팁 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">💡 사이즈 선택 팁</h3>
          <ul className="space-y-2 text-xs text-blue-700 leading-relaxed">
            <li>· 브랜드마다 실측이 다를 수 있어요.</li>
            <li>· 상의는 어깨 너비를 가장 먼저 확인하세요.</li>
            <li>· 니트·스웨터는 한 사이즈 크게 입으면 편합니다.</li>
            <li>· 하의는 허리와 엉덩이 둘레를 함께 고려하세요.</li>
            <li>· 온라인 구매 시 교환 정책을 꼭 확인하세요.</li>
          </ul>
        </div>
      </div>

      {/* 추천 의류 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <RecommendationGrid/>
      </div>

      {/* 주의사항 */}
      <NoticeCard/>

      <div className="h-4"/>
    </main>
  )
}
