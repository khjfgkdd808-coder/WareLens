/**
 * TryOnResult.tsx
 * AI Virtual Try-On 결과 패널
 *
 * 목표:
 *  - 사람의 얼굴·헤어·포즈·신체 형태 유지
 *  - 선택한 상의만 교체된 AI 착용 결과 이미지 표시
 *  - 현재 상의(TOP)만 지원, 하의/전체 코디는 추후 확장
 *
 * 상태:
 *  idle    → 의류 선택 안내
 *  loading → AI 생성 중 (진행 단계 표시)
 *  success → AI 착용 결과 중심 레이아웃
 *  error   → 오류 + 재시도
 */
import { useState } from 'react'
import { Loader2, RotateCcw, Shirt, X, ZoomIn, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { requestTryOn } from '@/api/tryOnApi'
import { MOCK_FULLBODY_IMAGE } from '@/utils/mockData'

// AI 생성 단계 (실제 API 연동 후 서버 progress와 연동 가능)
const LOADING_STEPS = [
  { label: '사람 신체 분석 중',     desc: 'MediaPipe 관절 좌표 추출' },
  { label: '의류 영역 감지 중',     desc: '상의 영역 세분화 처리' },
  { label: 'AI 착용 합성 중',       desc: '사람·의류 자연스럽게 결합' },
  { label: '결과 이미지 생성 중',   desc: '고해상도 렌더링 완성' },
]

function LoadingSteps() {
  const [step, setStep] = useState(0)

  // 단계 자동 진행 (실제 API 연동 시 서버 progress로 교체)
  useState(() => {
    let i = 0
    const t = setInterval(() => {
      i++
      if (i < LOADING_STEPS.length) setStep(i)
      else clearInterval(t)
    }, 550)
    return () => clearInterval(t)
  })

  return (
    <div className="space-y-2 mt-4">
      {LOADING_STEPS.map((s, i) => {
        const isDone    = i < step
        const isCurrent = i === step
        return (
          <div key={s.label}
            className="flex items-start gap-3 px-3 py-2 rounded-lg transition-all"
            style={{ backgroundColor: isCurrent ? '#eff6ff' : 'transparent' }}>
            {/* 상태 아이콘 */}
            <div className="flex-shrink-0 mt-0.5">
              {isDone ? (
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
              )}
            </div>
            <div>
              <p className={`text-xs font-semibold ${isCurrent ? 'text-blue-700' : isDone ? 'text-gray-500' : 'text-gray-300'}`}>
                {s.label}
              </p>
              {isCurrent && (
                <p className="text-[10px] text-blue-400 mt-0.5">{s.desc}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 확대 보기 모달
function ZoomModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt}
          className="w-full rounded-2xl object-cover shadow-2xl"
          style={{ maxHeight: '80vh', objectPosition: 'top' }}
        />
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition">
          <X className="w-4 h-4" />
        </button>
        <p className="text-center text-white/70 text-xs mt-3">{alt}</p>
      </div>
    </div>
  )
}

export default function TryOnResult() {
  const {
    tryOnSelectedClothing,
    tryOnStatus,
    tryOnResultImageUrl,
    tryOnError,
    fullBodyPreview,
    setTryOnStatus,
    setTryOnResult,
    setTryOnError,
    resetTryOn,
    openErrorModal,
  } = useAppStore()

  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  const personImageUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  const handleRetry = async () => {
    if (!tryOnSelectedClothing) return
    setTryOnStatus('loading')
    try {
      const res = await requestTryOn({
        personImage:   personImageUrl,
        clothingImage: tryOnSelectedClothing.imageUrl,
      })
      setTryOnResult(res.resultImageUrl)
    } catch {
      setTryOnError('가상 피팅 생성에 실패했습니다. 다시 시도해 주세요.')
      openErrorModal('ANALYSIS_FAILED', handleRetry)
    }
  }

  // ── idle ──────────────────────────────────────────────────────
  if (tryOnStatus === 'idle') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shirt className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">AI 가상 피팅</h2>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            상의 전용
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
          {/* 미리보기 — 원본 사진 + 빈 옷 자리 */}
          <div className="flex gap-3 items-end">
            <div className="relative w-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                 style={{ aspectRatio: '3/4' }}>
              <img src={personImageUrl} alt="원본 사진"
                className="w-full h-full object-cover object-top opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt className="w-7 h-7 text-gray-300" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            </div>
            <div className="w-20 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center"
                 style={{ aspectRatio: '3/4' }}>
              <div className="text-center">
                <Shirt className="w-6 h-6 text-blue-300 mx-auto" />
                <p className="text-[9px] text-blue-300 mt-1 font-medium">AI 결과</p>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">아래 추천 목록에서 옷을 선택하세요</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            "이 옷 입어보기" 버튼을 누르면<br/>
            AI가 실제 착용 이미지를 생성합니다
          </p>
        </div>
      </div>
    )
  }

  // ── loading ───────────────────────────────────────────────────
  if (tryOnStatus === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-blue-100"
             style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <h2 className="text-sm font-semibold text-blue-800">AI 가상 착용 생성 중...</h2>
          </div>
          <p className="text-[11px] text-blue-400 mt-0.5">
            사람의 얼굴·포즈를 유지하면서 의류를 자연스럽게 적용합니다
          </p>
        </div>

        {tryOnSelectedClothing && (
          <div className="p-5">
            {/* 선택 의류 + 원본 사진 */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
                   style={{ aspectRatio: '3/4' }}>
                <img src={personImageUrl} alt="원본 사진"
                  className="w-full h-full object-cover object-top opacity-80" />
                <span className="absolute bottom-1.5 inset-x-0 text-center text-[9px] font-semibold text-white"
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>원본 사진</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shirt className="w-3 h-3 text-blue-500" />
                </div>
                <div className="w-px h-8 bg-blue-100" />
                <span className="text-[9px] text-blue-400 font-bold">AI</span>
                <div className="w-px h-8 bg-blue-100" />
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
                  </svg>
                </div>
              </div>
              <div className="relative flex-1 rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
                   style={{ aspectRatio: '3/4' }}>
                <img src={tryOnSelectedClothing.imageUrl} alt={tryOnSelectedClothing.name}
                  className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 inset-x-0 text-center text-[9px] font-semibold text-white"
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>선택 의류</span>
              </div>
            </div>

            {/* 진행 단계 */}
            <LoadingSteps />
          </div>
        )}
      </div>
    )
  }

  // ── error ─────────────────────────────────────────────────────
  if (tryOnStatus === 'error') {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />가상 피팅 실패
          </h2>
          <button type="button" onClick={resetTryOn}
            className="text-[10px] text-red-400 hover:text-red-600 transition">닫기</button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 px-6 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-300" />
          <div>
            <p className="text-sm font-medium text-red-700">생성에 실패했습니다</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {tryOnError ?? '알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>
          <button type="button" onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition"
            style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            <RotateCcw className="w-3.5 h-3.5" />다시 시도
          </button>
        </div>
      </div>
    )
  }

  // ── success ───────────────────────────────────────────────────
  if (tryOnStatus === 'success' && tryOnResultImageUrl && tryOnSelectedClothing) {

    const isMockResult = tryOnResultImageUrl === personImageUrl
      || tryOnResultImageUrl === tryOnSelectedClothing.imageUrl

    // 3분할 패널 정의 — 원본 / 선택 의류 / AI 결과
    const panels = [
      {
        key:    'person',
        src:    personImageUrl,
        alt:    '원본 사진',
        label:  '원본 사진',
        badge:  null,
        border: 'border-gray-100',
        labelColor: 'text-gray-400',
        objectPos: 'object-top',
      },
      {
        key:    'clothing',
        src:    tryOnSelectedClothing.imageUrl,
        alt:    tryOnSelectedClothing.name,
        label:  tryOnSelectedClothing.category,
        badge:  tryOnSelectedClothing.name,
        border: 'border-blue-100',
        labelColor: 'text-blue-500',
        objectPos: 'object-center',
      },
      {
        key:    'result',
        src:    tryOnResultImageUrl,
        alt:    'AI 착용 결과',
        label:  'AI 결과',
        badge:  null,
        border: 'border-green-200',
        labelColor: 'text-green-600',
        objectPos: 'object-top',
      },
    ]

    return (
      <>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">

          {/* 헤더 */}
          <div className="px-5 py-3.5 border-b border-green-100"
               style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <h2 className="text-sm font-semibold text-green-800">가상 피팅 완료</h2>
              </div>
              <button type="button" onClick={resetTryOn}
                className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition">
                <X className="w-3 h-3" />닫기
              </button>
            </div>

            {/* Mock 안내 */}
            {isMockResult && (
              <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-snug">
                  <span className="font-semibold">UI 테스트 모드</span> — AI API 미연결 상태입니다.
                  실제 연결 시 의류가 자연스럽게 착용된 이미지가 생성됩니다.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">

            {/* ── 3분할 동일 크기 그리드 ── */}
            {/* 원본 사진 → 선택 의류 → AI 착용 결과 */}
            <div className="grid grid-cols-3 gap-2">
              {panels.map((panel) => (
                <div key={panel.key} className="flex flex-col gap-1.5">
                  {/* 카드 이미지 */}
                  <div
                    className={`relative w-full rounded-xl overflow-hidden bg-gray-50 border-2 ${panel.border} cursor-pointer hover:opacity-90 transition`}
                    style={{ aspectRatio: '3/4' }}
                    onClick={() => setZoomSrc(panel.src)}
                  >
                    <img
                      src={panel.src}
                      alt={panel.alt}
                      className={`w-full h-full object-cover ${panel.objectPos}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://placehold.co/200x267?text=${encodeURIComponent(panel.alt)}`
                      }}
                    />

                    {/* 뱃지 (의류 이름) */}
                    {panel.badge && (
                      <div className="absolute bottom-0 inset-x-0 px-1.5 pb-1.5 pt-4"
                           style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
                        <p className="text-white text-[9px] font-semibold leading-tight line-clamp-2 text-center">
                          {panel.badge}
                        </p>
                      </div>
                    )}

                    {/* AI 결과 성공 체크 */}
                    {panel.key === 'result' && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}

                    {/* 확대 힌트 */}
                    <div className="absolute top-1.5 left-1.5">
                      <div className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center">
                        <ZoomIn className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* 레이블 */}
                  <p className={`text-center text-[10px] font-semibold ${panel.labelColor}`}>
                    {panel.label}
                  </p>
                </div>
              ))}
            </div>

            {/* 흐름 화살표 설명 (텍스트) */}
            <p className="text-center text-[10px] text-gray-300 tracking-wide">
              원본 사진 &nbsp;→&nbsp; 선택 의류 &nbsp;→&nbsp; AI 착용 결과
            </p>

            {/* 하단 액션 */}
            <div className="flex items-center justify-between pt-0.5">
              <button type="button" onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition">
                <RotateCcw className="w-3 h-3" />다시 생성
              </button>
              <button type="button" onClick={resetTryOn}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
                <X className="w-3 h-3" />다른 옷 선택
              </button>
            </div>
          </div>
        </div>

        {/* 확대 보기 모달 */}
        {zoomSrc && (
          <ZoomModal
            src={zoomSrc}
            alt={
              zoomSrc === tryOnResultImageUrl ? 'AI 착용 결과' :
              zoomSrc === tryOnSelectedClothing.imageUrl ? tryOnSelectedClothing.name :
              '원본 사진'
            }
            onClose={() => setZoomSrc(null)}
          />
        )}
      </>
    )
  }

  return null
}
