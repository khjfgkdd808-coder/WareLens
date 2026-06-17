import { useEffect, useRef } from 'react'
import type { BodyAnalysisResult } from '@/types'
import { getBMIInfo } from '@/utils/helpers'

interface Props { data: BodyAnalysisResult }

const BMIGauge = ({ bmi }: { bmi: number }) => {
  const ref = useRef<HTMLDivElement>(null)
  const pct = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.left = '0%'
    requestAnimationFrame(() => { el.style.left = `calc(${pct}% - 6px)` })
  }, [pct])

  return (
    <div className="mt-3">
      <div className="relative h-2.5 rounded-full overflow-visible flex">
        <div className="w-[17.5%] bg-blue-300 rounded-l-full h-full"/>
        <div className="w-[32.5%] bg-green-400 h-full"/>
        <div className="w-[25%] bg-yellow-400 h-full"/>
        <div className="w-[25%] bg-red-400 rounded-r-full h-full"/>
        <div ref={ref} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-gray-700 shadow-md transition-all duration-700 ease-out" style={{ left: '0%' }}/>
      </div>
      <div className="flex justify-between mt-1">
        {['저체중','정상','과체중','비만'].map((l) => (
          <span key={l} className="text-[10px] text-gray-400">{l}</span>
        ))}
      </div>
    </div>
  )
}

const AnalysisCard = ({ data }: Props) => {
  const { label, color, bg } = getBMIInfo(data.bmi)
  const m = data.bodyMeasurements

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h2 className="text-base font-semibold text-gray-900">체형 분석 결과</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-8">

          {/* 좌: 수치 정보 */}
          <div className="space-y-6">
            {/* BMI */}
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">BMI</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900 tabular-nums">{data.bmi}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">체형 분류</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{data.bodyType}</p>
                </div>
              </div>
              <BMIGauge bmi={data.bmi}/>
            </div>

            {/* 추천 사이즈 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">추천 사이즈</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-baseline gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl">
                  <span className="text-2xl font-bold">{data.recommendedSize.top}</span>
                  <span className="text-sm opacity-80">({data.recommendedSize.topNumeric})</span>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <p>상의 <span className="font-semibold text-gray-800">{data.recommendedSize.topNumeric} ({data.recommendedSize.top})</span></p>
                  <p>하의 <span className="font-semibold text-gray-800">{data.recommendedSize.bottom}</span></p>
                  <p className="text-xs text-gray-300">KS 표준 사이즈 기준</p>
                </div>
              </div>
            </div>

            {/* 추천 근거 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">추천 근거</p>
              <ul className="space-y-2">
                {data.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
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

          {/* 우: 마네킹 + 측정값 */}
          <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
            <p className="text-xs text-gray-400 mb-3 text-center">체형 측정값</p>
            <div className="flex gap-4 items-start">
              {/* SVG 마네킹 */}
              <svg viewBox="0 0 120 270" className="w-24 flex-shrink-0" aria-hidden="true">
                <ellipse cx="60" cy="22" rx="16" ry="18" fill="#e5e7eb"/>
                <rect x="54" y="38" width="12" height="12" rx="4" fill="#e5e7eb"/>
                <path d="M34 50 Q28 92 31 132 H89 Q92 92 86 50 Q73 43 60 43 Q47 43 34 50Z" fill="#d1d5db"/>
                <path d="M34 56 Q20 94 22 132" stroke="#d1d5db" strokeWidth="14" strokeLinecap="round" fill="none"/>
                <path d="M86 56 Q100 94 98 132" stroke="#d1d5db" strokeWidth="14" strokeLinecap="round" fill="none"/>
                <path d="M46 132 Q42 192 44 260" stroke="#d1d5db" strokeWidth="20" strokeLinecap="round" fill="none"/>
                <path d="M74 132 Q78 192 76 260" stroke="#d1d5db" strokeWidth="20" strokeLinecap="round" fill="none"/>
                <line x1="26" y1="60" x2="94" y2="60" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2"/>
                <line x1="28" y1="82" x2="92" y2="82" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2"/>
                <line x1="30" y1="105" x2="90" y2="105" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2"/>
                <line x1="29" y1="126" x2="91" y2="126" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 2"/>
              </svg>
              {/* 수치 */}
              <div className="flex-1 space-y-0">
                {[
                  { label: '어깨 너비', value: m.shoulderWidth },
                  { label: '가슴 둘레', value: m.chestCircumference },
                  { label: '허리 둘레', value: m.waistCircumference },
                  { label: '엉덩이 둘레', value: m.hipCircumference },
                  { label: '다리 길이', value: m.legLength },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{value}<span className="text-xs font-normal text-gray-400 ml-0.5">cm</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisCard
