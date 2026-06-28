/**
 * TryOnResult.tsx
 * 가상 피팅 결과 패널
 *
 * 상태별 표시:
 * - idle:    의류를 선택하면 여기에 결과가 표시됩니다 (안내)
 * - loading: AI 처리 중 스피너
 * - success: 원본 사진 | 선택 의류 | 결과 이미지 3분할 비교
 * - error:   오류 메시지 + 재시도 버튼
 */
import { Loader2, RotateCcw, Shirt, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { requestTryOn } from '@/api/tryOnApi'
import { MOCK_FULLBODY_IMAGE } from '@/utils/mockData'

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

  const personImageUrl = fullBodyPreview?.previewUrl ?? MOCK_FULLBODY_IMAGE

  /** 재시도 핸들러 */
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
      // TODO: AI Try-On API 연결 후 실제 errorCode 전달
      setTryOnError('가상 피팅 생성에 실패했습니다. 다시 시도해 주세요.')
      openErrorModal('ANALYSIS_FAILED', handleRetry)
    }
  }

  /* ── idle: 안내 화면 ── */
  if (tryOnStatus === 'idle' && !tryOnResultImageUrl) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-blue-500" />
            가상 피팅
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Shirt className="w-8 h-8 text-blue-300" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">추천 의류를 선택하세요</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            아래 추천 목록에서 "이 옷 입어보기" 버튼을 누르면<br />
            AI가 가상 착용 이미지를 생성합니다.
          </p>
        </div>
      </div>
    )
  }

  /* ── loading: AI 처리 중 ── */
  if (tryOnStatus === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-blue-100 bg-blue-50">
          <h2 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            AI 가상 피팅 생성 중...
          </h2>
        </div>
        {tryOnSelectedClothing && (
          <div className="p-5">
            {/* 선택 의류 미리보기 */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
              <img
                src={tryOnSelectedClothing.imageUrl}
                alt={tryOnSelectedClothing.name}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold text-gray-800">{tryOnSelectedClothing.name}</p>
                <p className="text-[10px] text-gray-400">{tryOnSelectedClothing.category}</p>
              </div>
            </div>

            {/* 진행 애니메이션 */}
            <div className="grid grid-cols-3 gap-3">
              {['원본 사진', '선택 의류', 'AI 결과'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-xl bg-gray-100 animate-pulse"
                    style={{ aspectRatio: '3/4' }}
                  />
                  <p className="text-[10px] text-gray-400">{label}</p>
                  {i < 2 && (
                    <div className="hidden sm:block absolute" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-blue-500 mt-4 font-medium">
              AI가 가상 착용 이미지를 생성하고 있습니다...
            </p>
          </div>
        )}
      </div>
    )
  }

  /* ── error: 오류 화면 ── */
  if (tryOnStatus === 'error') {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            가상 피팅 실패
          </h2>
          <button
            type="button"
            onClick={resetTryOn}
            className="text-[10px] text-red-400 hover:text-red-600 transition"
          >
            닫기
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
            <X className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-700 mb-1">생성에 실패했습니다</p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            {tryOnError ?? '알 수 없는 오류가 발생했습니다.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition"
            style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  /* ── success: 결과 비교 화면 ── */
  if (tryOnStatus === 'success' && tryOnResultImageUrl && tryOnSelectedClothing) {
    const panels = [
      { label: '원본 사진',   src: personImageUrl,                    badge: null },
      { label: '선택 의류',   src: tryOnSelectedClothing.imageUrl,   badge: tryOnSelectedClothing.category },
      { label: 'AI 착용 결과', src: tryOnResultImageUrl,              badge: '✨ AI 생성' },
    ]

    return (
      <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-green-100 bg-green-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            가상 피팅 완료
          </h2>
          <button
            type="button"
            onClick={resetTryOn}
            className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
          >
            <X className="w-3 h-3" /> 닫기
          </button>
        </div>

        <div className="p-4">
          {/* 선택 의류 정보 */}
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-50 rounded-lg">
            <img
              src={tryOnSelectedClothing.imageUrl}
              alt={tryOnSelectedClothing.name}
              className="w-8 h-8 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-800 truncate">
                {tryOnSelectedClothing.name}
              </p>
              <p className="text-[9px] text-gray-400">{tryOnSelectedClothing.category}</p>
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
              적용됨
            </span>
          </div>

          {/* 3분할 비교 이미지 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {panels.map(({ label, src, badge }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-100"
                  style={{ aspectRatio: '3/4' }}
                >
                  <img
                    src={src}
                    alt={label}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/200x267?text=No+Image'
                    }}
                  />
                  {badge && (
                    <span
                      className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold
                                 px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#ffffff' }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-center text-[10px] text-gray-500 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* 재시도 */}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition"
            >
              <RotateCcw className="w-3 h-3" />
              다시 생성하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
