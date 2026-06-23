import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { getAnalysisResult } from '@/api/mockApi'
import { ANALYSIS_ERROR_MESSAGES } from '@/utils/constants'
import LoadingProgress from '@/components/loading/LoadingProgress'
import type { AnalysisStatus } from '@/types'

const STEP_SEQUENCE: AnalysisStatus[] = [
  'UPLOADING', 'BODY_ANALYZING', 'STYLE_ANALYZING', 'GENERATING', 'DONE',
]

export default function LoadingPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate   = useNavigate()
  const {
    analysisStatus, analysisErrorCode,
    setAnalysisStatus, setAnalysisResult, setAnalysisError, addToast,
  } = useAppStore()
  const stepRef  = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!taskId) { navigate('/', { replace: true }); return }
    stepRef.current = 0

    const advance = () => {
      const status = STEP_SEQUENCE[stepRef.current]
      setAnalysisStatus(status)
      if (status === 'DONE') {
        getAnalysisResult(taskId)
          .then((r) => {
            setAnalysisResult({ bodyAnalysis: r.bodyAnalysis, aiExplanation: r.aiExplanation })
            setTimeout(() => navigate(`/result/${taskId}`), 600)
          })
          .catch(() => {
            setAnalysisError('분석 중 오류가 발생했습니다.', 'UNKNOWN')
            addToast('error', '분석에 실패했습니다.')
          })
        return
      }
      stepRef.current += 1
      timerRef.current = setTimeout(advance, 1300)
    }

    timerRef.current = setTimeout(advance, 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [taskId])

  const isError = analysisStatus === 'ERROR'
  const errInfo = ANALYSIS_ERROR_MESSAGES[analysisErrorCode ?? 'UNKNOWN']

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* 카드 헤더 */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isError ? 'bg-red-50' : 'bg-blue-50'}`}>
              {isError ? (
                <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2a10 10 0 010 20" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{isError ? '분석 실패' : 'AI 분석 중'}</h1>
            <p className="text-sm text-gray-500 mt-1">{isError ? errInfo.desc : '잠시만 기다려 주세요.'}</p>
          </div>

          <LoadingProgress/>

          {/* 에러 시 재시도 버튼 */}
          {isError && (
            <button onClick={() => navigate('/')}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              {errInfo.action} →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
