import { useAppStore } from '@/store/useAppStore'
import { ANALYSIS_STEPS, ANALYSIS_ERROR_MESSAGES } from '@/utils/constants'
import type { AnalysisStatus } from '@/types'

const STEP_ORDER: AnalysisStatus[] = [
  'UPLOADING', 'BODY_ANALYZING', 'STYLE_ANALYZING', 'GENERATING', 'DONE',
]

export default function LoadingProgress() {
  const { analysisStatus, progress, analysisError, analysisErrorCode } = useAppStore()
  const step = ANALYSIS_STEPS[analysisStatus]
  const curIdx = STEP_ORDER.indexOf(analysisStatus)

  // 에러 상태
  if (analysisStatus === 'ERROR') {
    const errInfo = ANALYSIS_ERROR_MESSAGES[analysisErrorCode ?? 'UNKNOWN']
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 mb-1">{errInfo.title}</p>
          <p className="text-sm text-gray-500 leading-relaxed">{errInfo.desc}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 w-full text-left">
          <p className="text-xs font-semibold text-red-700 mb-1">오류 코드</p>
          <p className="text-xs text-red-500 font-mono">{analysisErrorCode ?? 'UNKNOWN'}</p>
          {analysisError && <p className="text-xs text-red-400 mt-1">{analysisError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-7 w-full max-w-sm mx-auto">
      {/* 상태 메시지 */}
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900">{step.label}</p>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.description}</p>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>분석 진행률</span>
          <span className="font-semibold text-blue-600 tabular-nums">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}/>
        </div>
      </div>

      {/* 단계 목록 */}
      <ol className="w-full space-y-3">
        {STEP_ORDER.map((status, i) => {
          const s = ANALYSIS_STEPS[status]
          const isDone   = i < curIdx || analysisStatus === 'DONE'
          const isActive = i === curIdx && analysisStatus !== 'DONE'

          return (
            <li key={status} className="flex items-center gap-3">
              <div className={[
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
                isDone   ? 'bg-blue-600 shadow-sm'                           : '',
                isActive ? 'bg-blue-100 border-2 border-blue-400'            : '',
                !isDone && !isActive ? 'bg-gray-100'                         : '',
              ].join(' ')}>
                {isDone ? (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : isActive ? (
                  <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2a10 10 0 010 20" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <span className="text-xs font-medium text-gray-400">{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDone ? 'text-gray-900' : isActive ? 'text-blue-700' : 'text-gray-400'}`}>
                  {s.label}
                </p>
                {isActive && (
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
