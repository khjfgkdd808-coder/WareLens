import { useEffect, useRef } from 'react'
import type { AIExplanationResult } from '@/types'

interface Props { data: AIExplanationResult }

const COLORS: Record<string, string> = {
  '상의': 'bg-blue-400', '하의': 'bg-indigo-400', '원피스': 'bg-pink-400',
  '아우터': 'bg-orange-400', '니트': 'bg-purple-400',
  '셔츠': 'bg-blue-400', '슬랙스': 'bg-emerald-400', '자켓': 'bg-amber-400',
}

export default function AIExplanationCard({ data }: Props) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([])
  const radius  = 36
  const circ    = 2 * Math.PI * radius
  const offset  = circ * (1 - data.confidenceScore / 100)
  const gaugeColor = data.confidenceScore >= 80 ? '#22c55e' : data.confidenceScore >= 60 ? '#3b82f6' : '#f59e0b'

  useEffect(() => {
    data.preferredCategories.forEach((_, i) => {
      const el = barRefs.current[i]
      if (!el) return
      el.style.width = '0%'
      setTimeout(() => { el.style.width = `${data.preferredCategories[i].percentage}%` }, 150 + i * 80)
    })
  }, [data])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI 분석 요약</h2>
          <p className="text-xs text-gray-400">Explainable AI 기반</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 신뢰도 + 사이즈 */}
        <div className="flex items-center justify-around gap-4 bg-gray-50 rounded-xl p-4">
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90" aria-label={`신뢰도 ${data.confidenceScore}%`}>
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

        {/* 선호 카테고리 */}
        <div>
          <div className="flex justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">선호 카테고리</p>
            <span className="text-xs text-gray-400">이미지 {data.analyzedImageCount}장 분석</span>
          </div>
          <div className="space-y-2.5">
            {data.preferredCategories.map(({ category, percentage }, i) => (
              <div key={category} className="flex items-center gap-3">
                <span className="w-14 text-xs text-gray-500 text-right flex-shrink-0">{category}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div ref={(el) => { barRefs.current[i] = el }}
                    className={`h-full rounded-full transition-all duration-700 ease-out ${COLORS[category] ?? 'bg-gray-400'}`}
                    style={{ width: '0%' }}/>
                </div>
                <span className="w-8 text-xs font-medium text-gray-600 tabular-nums">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-100"/>

        {/* 추천 근거 */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">추천 근거</p>
          <ul className="space-y-2">
            {data.reasons.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
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
