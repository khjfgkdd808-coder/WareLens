import { useAppStore } from '@/store/useAppStore'
import { ANALYSIS_STEPS } from '@/utils/constants'
import type { AnalysisStatus } from '@/types'

const STEP_ORDER: AnalysisStatus[] = ['UPLOADING','BODY_ANALYZING','STYLE_ANALYZING','GENERATING','DONE']

const LoadingProgress = () => {
  const { analysisStatus, progress } = useAppStore()
  const step = ANALYSIS_STEPS[analysisStatus]
  const currentIdx = STEP_ORDER.indexOf(analysisStatus)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <p className="text-xl font-semibold text-gray-900">{step.label}</p>
        <p className="text-sm text-gray-500 mt-1">{step.description}</p>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>분석 진행률</span>
          <span className="font-medium text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}/>
        </div>
      </div>

      {/* 단계 목록 */}
      <ol className="w-full space-y-3">
        {STEP_ORDER.map((status, i) => {
          const s = ANALYSIS_STEPS[status]
          const isDone   = i < currentIdx || analysisStatus === 'DONE'
          const isActive = i === currentIdx && analysisStatus !== 'DONE' && analysisStatus !== 'ERROR'

          return (
            <li key={status} className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors
                ${isDone ? 'bg-blue-600' : isActive ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-100'}`}>
                {isDone ? (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : isActive ? (
                  <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2a10 10 0 010 20" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <span className="text-xs font-medium text-gray-400">{i+1}</span>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDone ? 'text-gray-900' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s.label}
                </p>
                {isActive && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default LoadingProgress
