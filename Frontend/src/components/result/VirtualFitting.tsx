import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, Shirt } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Product } from '@/types'

interface Props {
  fullBodyImageUrl: string | null
  selectedProduct:  Product | null
}

/**
 * VirtualFitting — AI 스타일링 가상 피팅 컴포넌트
 *
 * 레이어 구조:
 *   [1] Base  : 사용자 전신사진
 *   [2] Middle: 추천 상의 오버레이 (position absolute, mixBlendMode multiply)
 *   [3] Top   : MediaPipe 가이드라인 SVG (showGuide 시)
 *
 * 상의 위치/크기:
 *   - gender='male'   → 어깨 폭 넓게 (width 82%, left 9%)
 *   - gender='female' → 표준 (width 74%, left 13%)
 *   - fitPosition prop 우선 적용 (MediaPipe 좌표 연동 예정)
 */
export default function VirtualFitting({ fullBodyImageUrl, selectedProduct }: Props) {
  const { userInfo } = useAppStore()
  const [showGuide, setShowGuide] = useState(false)

  // 성별 기반 기본 포지션 (MediaPipe 연동 전 Mock)
  const genderDefaults =
    userInfo.gender === 'male'
      ? { top: '16%', left: '9%',  width: '82%' }
      : { top: '17%', left: '13%', width: '74%' }

  // fitPosition prop 있으면 우선 적용
  const fit = selectedProduct?.fitPosition ?? genderDefaults
  const overlayUrl = selectedProduct?.overlayImageUrl ?? selectedProduct?.imageUrl

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI 스타일링 결과</h3>
            <p className="text-xs text-gray-400 mt-0.5">상의 카드를 클릭해 가상으로 입어보세요</p>
          </div>
        </div>
        <button onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition">
          <Info className="w-3.5 h-3.5" />
          {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 사용 방법 안내 */}
      {showGuide && (
        <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 text-xs text-brand-700 leading-relaxed animate-slide-down">
          아래 추천 목록에서 상의 카드를 클릭하면 전신 사진에 자동으로 오버레이됩니다.
          현재 버전은 <strong>상의 추천 및 가상 피팅</strong>만 지원합니다.
        </div>
      )}

      {/* 피팅 캔버스 */}
      <div className="p-5">
        <div
          className="relative mx-auto bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-100"
          style={{ aspectRatio: '9/16', maxWidth: 300 }}
        >
          {/* ── [1] Base: 전신사진 ── */}
          {fullBodyImageUrl ? (
            <img
              src={fullBodyImageUrl}
              alt="전신사진"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            /* 전신사진 없을 때 실루엣 */
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 200" className="h-48 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="50" cy="16" rx="11" ry="13"/>
                <path d="M39 29 Q30 35 26 52 L22 90 Q36 94 50 94 Q64 94 78 90 L74 52 Q70 35 61 29 Z"/>
                <path d="M26 54 L14 82 Q12 88 16 90 L20 88 L24 70"/>
                <path d="M74 54 L86 82 Q88 88 84 90 L80 88 L76 70"/>
                <path d="M38 94 L34 150 Q33 158 38 160 L44 160 L46 120 L54 120 L56 160 L62 160 Q67 158 66 150 L62 94"/>
                <path d="M34 160 L32 190 Q31 196 38 196 L42 196 L44 160"/>
                <path d="M62 160 L60 190 Q62 196 68 196 L72 196 L66 160"/>
              </svg>
              <p className="text-xs text-gray-400 mt-3 text-center px-6 leading-relaxed">
                전신 사진을 업로드하면<br />여기에 표시됩니다
              </p>
            </div>
          )}

          {/* ── [2] Middle: 상의 오버레이 ── */}
          {selectedProduct && overlayUrl && (
            <div
              className="absolute pointer-events-none"
              style={{
                top:   fit.top,
                left:  fit.left,
                width: fit.width,
                // 자연스러운 착장감을 위한 drop-shadow
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))',
              }}
            >
              <img
                src={overlayUrl}
                alt={`${selectedProduct.name} 가상 피팅`}
                className="w-full object-contain"
                style={{
                  mixBlendMode: fullBodyImageUrl ? 'multiply' : 'normal',
                  opacity: fullBodyImageUrl ? 0.85 : 0.95,
                  // 하단 자연스럽게 페이드
                  WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                  maskImage:       'linear-gradient(to bottom, black 70%, transparent 100%)',
                }}
              />
            </div>
          )}

          {/* ── [3] Top: MediaPipe 가이드라인 (Mock) ── */}
          {showGuide && fullBodyImageUrl && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 300 533"
            >
              {/* 어깨 라인 */}
              <line x1="55"  y1="112" x2="245" y2="112"
                stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.75"/>
              {/* 허리 라인 */}
              <line x1="80"  y1="215" x2="220" y2="215"
                stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.75"/>
              {/* 어깨 포인트 */}
              <circle cx="55"  cy="112" r="4" fill="#3b82f6" opacity="0.9"/>
              <circle cx="245" cy="112" r="4" fill="#3b82f6" opacity="0.9"/>
              {/* 목 중심 */}
              <circle cx="150" cy="90"  r="3" fill="#60a5fa" opacity="0.8"/>
              {/* 레이블 */}
              <text x="260" y="116" fontSize="8" fill="#3b82f6" opacity="0.8">어깨</text>
              <text x="228" y="219" fontSize="8" fill="#3b82f6" opacity="0.8">허리</text>
            </svg>
          )}

          {/* 미선택 안내 */}
          {!selectedProduct && (
            <div className="absolute inset-0 flex items-end justify-center pb-5 bg-gradient-to-t from-black/25 to-transparent">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center shadow mx-4">
                <p className="text-xs font-semibold text-gray-800">아래에서 상의를 선택해 주세요</p>
                <p className="text-[10px] text-gray-500 mt-0.5">카드를 클릭하면 가상으로 입어볼 수 있어요</p>
              </div>
            </div>
          )}

          {/* 선택 상품명 뱃지 */}
          {selectedProduct && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3">
              <div className="bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg max-w-[90%] truncate">
                👕 {selectedProduct.name}
              </div>
            </div>
          )}
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-[10px] text-gray-400 mt-3 leading-relaxed">
          현재 버전은 상의 추천 및 가상 피팅만 지원합니다.<br />
          실제 AI 피팅은 MediaPipe 연동 후 제공됩니다.
        </p>
      </div>
    </div>
  )
}
