import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, Shirt } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Product, MediaPipeLandmarks } from '@/types'

interface Props {
  fullBodyImageUrl: string | null
  selectedProduct:  Product | null
  /** MediaPipe 랜드마크 — 백엔드 연동 후 실제값 주입, 없으면 gender 기반 기본값 사용 */
  landmarks?:       MediaPipeLandmarks | null
}

// ── gender 기반 기본 피팅 포지션 ─────────────────────────────
// MediaPipe 연동 전 fallback: 성별 체형에 맞게 top/left/width % 조정
const GENDER_FIT = {
  male: {
    top:   '15%',   // 목 아래 약간 아래
    left:  '8%',    // 어깨 폭이 넓어 더 바깥으로
    width: '84%',   // 남성 어깨 폭 반영해 넓게
  },
  female: {
    top:   '17%',
    left:  '14%',
    width: '72%',   // 여성 체형 기준 표준
  },
} as const

/**
 * landmarks가 있을 때: 어깨 좌표로 실제 위치/크기 계산
 * landmarks가 없을 때: gender 기반 기본값 사용
 */
const computeFitStyle = (
  gender:    'male' | 'female',
  landmarks: MediaPipeLandmarks | null | undefined,
  product:   Product | null,
): { top: string; left: string; width: string } => {
  // 1순위: 상품별 fitPosition (Mock 또는 서버 제공)
  if (product?.fitPosition) return product.fitPosition

  // 2순위: MediaPipe 랜드마크 기반 계산
  if (landmarks) {
    const { leftShoulder, rightShoulder } = landmarks
    const shoulderLeft  = Math.min(leftShoulder.x,  rightShoulder.x) * 100
    const shoulderRight = Math.max(leftShoulder.x,  rightShoulder.x) * 100
    const shoulderTop   = Math.min(leftShoulder.y,  rightShoulder.y) * 100
    const width = (shoulderRight - shoulderLeft) * 1.35  // 어깨 폭 × 1.35 (소매 여유)
    const left  = shoulderLeft - (width - (shoulderRight - shoulderLeft)) / 2
    return {
      top:   `${(shoulderTop - 3).toFixed(1)}%`,
      left:  `${Math.max(0, left).toFixed(1)}%`,
      width: `${Math.min(100, width).toFixed(1)}%`,
    }
  }

  // 3순위: gender 기반 기본값
  return GENDER_FIT[gender]
}

export default function VirtualFitting({ fullBodyImageUrl, selectedProduct, landmarks }: Props) {
  const { userInfo } = useAppStore()
  const [showGuide, setShowGuide] = useState(false)

  const fit = computeFitStyle(userInfo.gender, landmarks, selectedProduct)
  const overlayUrl = selectedProduct?.overlayImageUrl ?? selectedProduct?.imageUrl

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">AI 스타일링 결과</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedProduct
                ? `${selectedProduct.name} 착용 중`
                : '아래 상의를 클릭해 가상으로 입어보세요'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition"
        >
          <Info className="w-3.5 h-3.5" />
          {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showGuide && (
        <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 text-xs text-brand-700 leading-relaxed animate-slide-down">
          아래 추천 목록에서 상의를 클릭하면 전신 사진에 자동으로 오버레이됩니다.
          <br />
          <span className="font-semibold">현재 버전은 상의 추천 및 가상 피팅만 지원합니다.</span>
        </div>
      )}

      {/* 피팅 캔버스 — 더 크게 (max-w 확대) */}
      <div className="p-5">
        <div
          className="relative mx-auto bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-100"
          style={{ aspectRatio: '9/16', maxWidth: 360 }}
        >
          {/* ── [1] Base: 전신사진 ── */}
          {fullBodyImageUrl ? (
            <img
              src={fullBodyImageUrl}
              alt="전신사진"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
              {/* 업로드 안내 (아바타 SVG 없음) */}
              <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <p className="text-xs text-gray-400 text-center px-6 leading-relaxed">
                전신 사진을 업로드하면<br />가상 피팅을 확인할 수 있어요
              </p>
            </div>
          )}

          {/* ── [2] Middle: 상의 오버레이 ── */}
          {selectedProduct && overlayUrl && (
            <div
              className="absolute pointer-events-none transition-all duration-300"
              style={{
                top:    fit.top,
                left:   fit.left,
                width:  fit.width,
                filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.20))',
              }}
            >
              <img
                src={overlayUrl}
                alt={`${selectedProduct.name} 가상 피팅`}
                className="w-full object-contain"
                style={{
                  mixBlendMode:          fullBodyImageUrl ? 'multiply' : 'normal',
                  opacity:               fullBodyImageUrl ? 0.88 : 0.95,
                  WebkitMaskImage:       'linear-gradient(to bottom, black 60%, transparent 100%)',
                  maskImage:             'linear-gradient(to bottom, black 60%, transparent 100%)',
                }}
              />
            </div>
          )}

          {/* ── [3] Top: MediaPipe 가이드라인 ── */}
          {showGuide && fullBodyImageUrl && landmarks && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line
                x1={`${landmarks.leftShoulder.x  * 100}%`}
                y1={`${landmarks.leftShoulder.y  * 100}%`}
                x2={`${landmarks.rightShoulder.x * 100}%`}
                y2={`${landmarks.rightShoulder.y * 100}%`}
                stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.8"
              />
              <circle cx={`${landmarks.leftShoulder.x  * 100}%`} cy={`${landmarks.leftShoulder.y  * 100}%`} r="0.8" fill="#3b82f6" opacity="0.9"/>
              <circle cx={`${landmarks.rightShoulder.x * 100}%`} cy={`${landmarks.rightShoulder.y * 100}%`} r="0.8" fill="#3b82f6" opacity="0.9"/>
            </svg>
          )}

          {/* 미선택 안내 오버레이 */}
          {!selectedProduct && fullBodyImageUrl && (
            <div className="absolute inset-0 flex items-end justify-center pb-5 bg-gradient-to-t from-black/25 to-transparent">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center shadow mx-4">
                <p className="text-xs font-semibold text-gray-800">아래에서 상의를 선택해 주세요</p>
                <p className="text-[10px] text-gray-500 mt-0.5">카드를 클릭하면 가상으로 입어볼 수 있어요</p>
              </div>
            </div>
          )}

          {/* 선택 상품 뱃지 */}
          {selectedProduct && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3">
              <div className="bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg max-w-[90%] truncate">
                👕 {selectedProduct.name}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-3 leading-relaxed">
          현재 버전은 상의 추천 및 가상 피팅만 지원합니다.
          {landmarks ? ' (MediaPipe 좌표 적용)' : ' (성별 기반 기본값 적용)'}
        </p>
      </div>
    </div>
  )
}
