import type { BodyAnalysisResult } from '@/types'
import { getBMIInfo } from '@/utils/helpers'

interface Props { data: BodyAnalysisResult }

const MannequinPanel = ({ m }: { m: BodyAnalysisResult['bodyMeasurements'] }) => {
  const rows = [
    { label: '어깨 너비', value: m.shoulderWidth },
    { label: '가슴 둘레', value: m.chestCircumference },
    { label: '허리 둘레', value: m.waistCircumference },
    { label: '엉덩이 둘레', value: m.hipCircumference },
    { label: '다리 길이', value: m.legLength },
  ]
  return (
    <div className="flex gap-3 items-start">
      <svg viewBox="0 0 110 260" className="w-20 flex-shrink-0" aria-hidden="true">
        <ellipse cx="55" cy="20" rx="14" ry="16" fill="#e5e7eb"/>
        <rect x="50" y="34" width="10" height="10" rx="3" fill="#e5e7eb"/>
        <path d="M30 44 Q25 84 28 122 H82 Q85 84 80 44 Q68 38 55 38 Q42 38 30 44Z" fill="#d1d5db"/>
        <path d="M30 50 Q18 86 20 122" stroke="#d1d5db" strokeWidth="13" strokeLinecap="round" fill="none"/>
        <path d="M80 50 Q92 86 90 122" stroke="#d1d5db" strokeWidth="13" strokeLinecap="round" fill="none"/>
        <path d="M42 122 Q38 182 40 252" stroke="#d1d5db" strokeWidth="19" strokeLinecap="round" fill="none"/>
        <path d="M68 122 Q72 182 70 252" stroke="#d1d5db" strokeWidth="19" strokeLinecap="round" fill="none"/>
        <line x1="22" y1="54" x2="88" y2="54" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="3 2"/>
        <line x1="24" y1="74" x2="86" y2="74" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="3 2"/>
        <line x1="26" y1="96" x2="84" y2="96" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="3 2"/>
        <line x1="24" y1="116" x2="86" y2="116" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="3 2"/>
      </svg>
      <div className="flex-1 pt-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-800 tabular-nums">{value}<span className="text-xs font-normal text-gray-400 ml-0.5">cm</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisCard({ data }: Props) {
  // getBMIInfo는 내부 데이터 구조 유지를 위해 호출하되 UI에서는 직접 노출하지 않음
  const _bmiInfo = getBMIInfo(data.bmi)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">체형 분석 결과</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_190px] gap-x-6 gap-y-6">

          {/* 추천 사이즈 — 메인 강조 */}
          <div>
            <p className="text-xs text-gray-400 mb-1">추천 사이즈</p>
            <p className="text-4xl font-bold text-gray-900 leading-none tabular-nums">
              {data.recommendedSize.top}
              <span className="text-xl font-semibold text-gray-400 ml-1">({data.recommendedSize.topNumeric})</span>
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">상의 <span className="font-semibold text-gray-700">{data.recommendedSize.topNumeric} ({data.recommendedSize.top})</span></p>
              <p className="text-xs text-gray-500">하의 <span className="font-semibold text-gray-700">{data.recommendedSize.bottom}</span></p>
            </div>
            <p className="text-[10px] text-gray-300 mt-3">KS 표준 사이즈 기준</p>
          </div>

          {/* 체형 정보 */}
          <div>
            <p className="text-xs text-gray-400 mb-1">체형 분류</p>
            <p className="text-2xl font-bold text-gray-900 leading-none">{data.bodyType}</p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-gray-500">키와 체중 비율, 어깨·골반 폭을 기반으로 분류한 체형 유형입니다.</p>
            </div>
          </div>

          {/* 추천 근거 */}
          <div>
            <p className="text-xs text-gray-400 mb-2">추천 근거</p>
            <ul className="space-y-2">
              {/* 첫 번째 근거: 체형·치수 중심으로 커스텀 */}
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span className="text-xs text-gray-600 leading-relaxed">
                  체형 분석 결과와 신체 비율을 기반으로 추천하며, BMI 정보는 참고 데이터로 활용됩니다.
                </span>
              </li>
              {/* 나머지 근거 (첫 번째 건너뛰기) */}
              {data.reasons.slice(1).map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span className="text-xs text-gray-600 leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 신체 치수 마네킹 패널 */}
          <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
            <MannequinPanel m={data.bodyMeasurements}/>
          </div>
        </div>
      </div>
    </div>
  )
}
