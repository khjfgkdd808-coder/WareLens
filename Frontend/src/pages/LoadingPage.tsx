import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { getAnalysisResult } from '@/api/mockApi'
import { ANALYSIS_STEPS } from '@/utils/constants'
import LoadingProgress from '@/components/loading/LoadingProgress'
import type { AnalysisStatus } from '@/types'

const STEP_SEQUENCE: AnalysisStatus[] = [
  'UPLOADING', 'BODY_ANALYZING', 'STYLE_ANALYZING', 'GENERATING', 'DONE'
]

export default function LoadingPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const { setAnalysisStatus, setAnalysisResult, setAnalysisError, addToast } = useAppStore()
  const stepRef    = useRef(0)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!taskId) { navigate('/upload', { replace: true }); return }

    // Mock: 단계별로 1초씩 진행하다가 마지막에 API 호출
    const advanceStep = () => {
      const status = STEP_SEQUENCE[stepRef.current]
      setAnalysisStatus(status)

      if (status === 'DONE') {
        getAnalysisResult(taskId)
          .then((result) => {
            setAnalysisResult({
              bodyAnalysis:  result.bodyAnalysis,
              aiExplanation: result.aiExplanation,
            })
            setTimeout(() => navigate(`/result/${taskId}`), 500)
          })
          .catch(() => {
            setAnalysisError('분석 중 오류가 발생했습니다.')
            addToast('error', '분석에 실패했습니다. 다시 시도해 주세요.')
          })
        return
      }

      stepRef.current += 1
      timerRef.current = setTimeout(advanceStep, 1200)
    }

    timerRef.current = setTimeout(advanceStep, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [taskId])

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2a10 10 0 010 20" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">AI 분석 중</h1>
            <p className="text-sm text-gray-500 mt-1">잠시만 기다려 주세요.</p>
          </div>
          <LoadingProgress />
        </div>
      </div>
    </main>
  )
}
