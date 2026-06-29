import type { AIExplanationResult } from '@/types'

interface Props { data: AIExplanationResult }

export default function AIExplanationCard({ data }: Props) {
  const radius = 36
  const circ   = 2 * Math.PI * radius
  const offset = circ * (1 - data.confidenceScore / 100)
  const gaugeColor = data.confidenceScore >= 80 ? '#22c55e' : data.confidenceScore >= 60 ? '#3b82f6' : '#f59e0b'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI 분석 요약</h2>
          <p className="text-xs text-gray-400">취향 이미지 {data.analyzedImageCount}장 분석 결과</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-around gap-4 bg-gray-50 rounded-xl p-4 mb-5">
          {/* 신뢰도 게이지 */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8"/>
                <circle cx="44" cy="44" r={radius} fill="none" stroke={gaugeColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-gray-900 leading-none">{data.confidenceScore}%</span>
                <span className="text-[10px] text-gray-400">신뢰도</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">추천 신뢰도</p>
          </div>
          <div className="w-px h-16 bg-gray-200 flex-shrink-0"/>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-gray-900">{data.recommendedSize}</span>
            <span className="text-xs text-gray-400 mt-1.5">추천 사이즈</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">추천 근거</p>
          <ul className="space-y-2">
            {data.reasons.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span className="text-xs text-gray-600 leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
