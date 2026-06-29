import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import { MOCK_FULLBODY_IMAGE } from '@/utils/mockData'
import RecommendationGrid from '@/components/result/RecommendationGrid'
import TryOnResult        from '@/components/result/TryOnResult'
import NoticeCard         from '@/components/common/NoticeCard'
import type { BodyAnalysisResult } from '@/types'

/*
  MediaPipe / CLIP / BMI 등의 분석 데이터는 내부 로직에서 활용되며
  데이터 구조는 유지합니다. UI 표현은 핵심 결과만 표시합니다.
*/
const SK_POINTS = [
  { x: 150, y: 55  }, { x: 142, y: 60  }, { x: 158, y: 60  },
  { x: 136, y: 66  }, { x: 164, y: 66  }, { x: 150, y: 88  },
  { x: 88,  y: 118 }, { x: 212, y: 118 }, { x: 66,  y: 178 },
  { x: 234, y: 178 }, { x: 52,  y: 232 }, { x: 248, y: 232 },
  { x: 114, y: 228 }, { x: 186, y: 228 }, { x: 108, y: 335 },
  { x: 192, y: 335 }, { x: 103, y: 435 }, { x: 197, y: 435 },
]
const SK_LINES: [number, number][] = [
  [0,5],[5,6],[5,7],[6,8],[7,9],[8,10],[9,11],
  [6,12],[7,13],[12,13],[12,14],[13,15],[14,16],[15,17],
]
void SK_POINTS; void SK_LINES // 데이터 구조 유지, 향후 API 연동 시 활용

/* ─────────────────────────────────────────────────────────────
   체형 분석 패널
   - 왼쪽: 상체 중심 사진 (얼굴 ~ 골반)
   - 오른쪽: 추천 상의 사이즈만 표시
───────────────────────────────────────────────────────────── */
function BodyAnalysisPanel({
  data,
  imageUrl,
}: {
  data: BodyAnalysisResult
  imageUrl: string | null
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">체형 분석 결과</h2>
      </div>

      {/* 본문: 사진(좌) + 사이즈(우) — 50 : 50 */}
      <div className="flex flex-col sm:flex-row" style={{ minHeight: 280 }}>

        {/* ── 왼쪽: 상체 중심 사진 ── */}
        <div className="sm:w-1/2 flex-shrink-0 relative bg-gray-50 overflow-hidden"
             style={{ minHeight: 280 }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="상체 사진"
              className="w-full h-full"
              style={{
                objectFit:      'cover',
                /*
                  상체(얼굴~골반) 중심으로 크롭
                  object-position: x center, y 상단에서 15% 지점 시작
                  → 하체가 잘려 상체가 넓게 표시됨
                */
                objectPosition: 'center 10%',
                maxHeight:      400,
              }}
            />
          ) : (
            /* 사진 없을 때 placeholder */
            <div className="flex flex-col items-center justify-center h-full min-h-[280px]">
              <svg viewBox="0 0 80 100" className="w-20 text-gray-200"
                   fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="40" cy="12" rx="10" ry="11"/>
                <path d="M30 23 Q22 32 20 55 H60 Q58 32 50 23 Q45 20 40 20 Q35 20 30 23Z"/>
                <path d="M20 35 L10 60 Q9 65 14 66 L18 64 L21 48"/>
                <path d="M60 35 L70 60 Q71 65 66 66 L62 64 L59 48"/>
                <path d="M30 55 L28 90" stroke="currentColor" strokeWidth="10"
                      strokeLinecap="round"/>
                <path d="M50 55 L52 90" stroke="currentColor" strokeWidth="10"
                      strokeLinecap="round"/>
              </svg>
              <p className="text-[11px] text-gray-400 mt-3 text-center leading-relaxed">
                전신 사진을 업로드하면<br/>여기에 표시됩니다
              </p>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 추천 상의 사이즈 ── */}
        <div className="sm:w-1/2 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100
                        flex flex-col items-center justify-center px-6 py-8 gap-3">

          {/* 레이블 */}
          <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">
            추천 사이즈
          </p>

          {/* 상의 사이즈 — 핵심 강조 */}
          <div className="text-center">
            <p
              className="font-bold text-gray-900 leading-none tabular-nums"
              style={{ fontSize: 64 }}
            >
              {data.recommendedSize.topNumeric}
            </p>
            <p className="text-lg font-semibold text-gray-400 mt-1 tracking-wide">
              ({data.recommendedSize.top})
            </p>
          </div>

          {/* 구분선 */}
          <div className="w-10 h-px bg-gray-200 my-1" />

          {/* 보조 설명 — 최소화 */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            체형 분석을 기반으로<br/>산출된 상의 추천 사이즈입니다
          </p>

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ResultPage
───────────────────────────────────────────────────────────── */
export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    bodyAnalysis, fullBodyPreview,
    setProducts, setRecommendStatus, addToast, openErrorModal,
  } = useAppStore()
  const [isCopied, setIsCopied] = useState(false)

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
            .catch(() => {
              setRecommendStatus('error')
              openErrorModal('SERVER_ERROR')
            })
        })
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

  const fullBodyUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  if (!bodyAnalysis) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">분석 결과를 불러오는 중입니다</p>
          <p className="text-sm text-gray-400 mb-5">잠시만 기다려 주세요.</p>
          <button onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
            <RotateCcw className="w-4 h-4" /> 홈으로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── 페이지 헤더 ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">추천 결과</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
              : <><Share2 className="w-3.5 h-3.5" />결과 공유</>
            }
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
            <RotateCcw className="w-3.5 h-3.5" /> 다시 분석
          </button>
        </div>
      </div>

      {/* ── ① 체형 분석 결과 ── */}
      <BodyAnalysisPanel data={bodyAnalysis} imageUrl={fullBodyUrl} />

      {/* ── ② 가상 피팅 결과 ── */}
      <TryOnResult />

      {/* ── ③ AI 추천 의류 목록 ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <RecommendationGrid />
      </div>

      {/* ── 주의사항 ── */}
      <NoticeCard />
      <div className="h-4" />
    </main>
  )
}
