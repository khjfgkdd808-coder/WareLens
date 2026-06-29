import { useRef, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Upload, Info, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateBodyPhoto } from '@/api/mockApi'
import { validateImageFile } from '@/utils/helpers'

const DO_LIST = [
  '정면에서 전신이 모두 보이는 사진',
  '양팔과 양다리를 살짝 벌린 자연스러운 자세',
  '밝은 배경 또는 흰색 배경 권장',
  '몸 형태가 구분되는 단순한 옷',
  '혼자 촬영한 사진',
]
const DONT_LIST = [
  '측면 사진 / 거울 셀카',
  '오버핏 후드티, 롱패딩, 긴 치마',
  '발끝이 잘린 사진',
  '배경과 인물이 구분되지 않는 사진',
]

export default function FullBodyUploadZone() {
  const {
    fullBodyPreview, photoValidation,
    setFullBodyImage, removeFullBodyImage,
    setPhotoValidation, addToast,
  } = useAppStore()

  const inputRef        = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // 파일 선택 → 파일 저장 → AI 자동 검증 트리거
  const handleFile = async (file: File | null | undefined) => {
    if (!file) return

    // 1) 클라이언트 기본 검증 (파일 형식·크기)
    const clientErr = validateImageFile(file)
    if (clientErr) { addToast('error', clientErr); return }

    // 2) 스토어에 파일 저장
    setFullBodyImage(file)

    // 3) AI 검증 상태: 로딩 시작
    setPhotoValidation({ status: 'loading', message: 'AI가 사진을 확인하고 있습니다...' })

    // 4) 백엔드 API 호출 (현재는 Mock)
    try {
      const result = await validateBodyPhoto(file)
      setPhotoValidation(result)
      if (result.status === 'error') {
        addToast('error', result.message)
      }
    } catch {
      setPhotoValidation({
        status:  'error',
        message: '검증 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
        code:    'NETWORK_ERROR',
      })
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = () => {
    removeFullBodyImage()
    setShowGuide(false)
  }

  const validationStatus = photoValidation.status

  return (
    <div className="space-y-3">

      {/* ── 업로드 영역 (아바타 SVG 완전 제거, 넓게 확장) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={[
          'relative w-full rounded-2xl border-2 border-dashed overflow-hidden',
          'cursor-pointer transition-all select-none',
          /* 업로드 후: 더 높게 */
          fullBodyPreview ? 'h-80 border-transparent' : 'h-60',
          drag && !fullBodyPreview
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : !fullBodyPreview
              ? 'border-gray-300 hover:border-brand-400 hover:bg-brand-50/30'
              : '',
        ].join(' ')}
      >
        {fullBodyPreview ? (
          /* ── 업로드 완료 ── */
          <>
            <img
              src={fullBodyPreview.previewUrl}
              alt="전신사진"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            {/* 반투명 교체 오버레이 */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors flex items-center justify-center">
              <span className="text-white text-sm font-semibold bg-black/50 px-4 py-2 rounded-full opacity-0 hover:opacity-100 transition">
                클릭하여 교체
              </span>
            </div>
          </>
        ) : (
          /* ── 업로드 전: 아이콘 중심 레이아웃 ── */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
              ${drag ? 'bg-brand-100' : 'bg-gray-100'}
            `}>
              <Upload className={`w-7 h-7 ${drag ? 'text-brand-500' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                전신 사진을 업로드해 주세요
              </p>
              <p className="text-xs text-gray-400 mt-1">
                클릭하거나 드래그해서 파일을 올려주세요
              </p>
              <p className="text-[10px] text-gray-300 mt-1">
                JPG · PNG · WebP · 최대 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── AI 자동 검증 상태 표시 ── */}
      {fullBodyPreview && validationStatus !== 'idle' && (
        <div className={[
          'flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-all',
          validationStatus === 'loading'
            ? 'bg-blue-50 border-blue-100 text-blue-700'
            : validationStatus === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700',
        ].join(' ')}>
          {/* 아이콘 */}
          <div className="flex-shrink-0 mt-0.5">
            {validationStatus === 'loading' && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
            {validationStatus === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            {validationStatus === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>

          {/* 메시지 */}
          <div className="flex-1">
            <p className="font-semibold mb-0.5">
              {validationStatus === 'loading' && 'AI 자동 확인 중...'}
              {validationStatus === 'success' && '사진 확인 완료'}
              {validationStatus === 'error'   && '사진 확인 실패'}
            </p>
            <p className="leading-relaxed opacity-90">{photoValidation.message}</p>
            {/* 실패 시 재업로드 안내 */}
            {validationStatus === 'error' && (
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="mt-1.5 underline font-semibold text-red-600 hover:text-red-800 transition"
              >
                다른 사진으로 다시 시도
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 하단 액션 버튼 행 ── */}
      {fullBodyPreview && (
        <div className="flex items-center gap-3">
          {/* 삭제 */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            사진 삭제
          </button>

          <span className="text-gray-200">|</span>

          {/* 가이드 토글 */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition"
          >
            <Info className="w-3.5 h-3.5" />
            촬영 가이드
            {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* 업로드 전 가이드 토글 (사진 없을 때) */}
      {!fullBodyPreview && (
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 transition font-medium"
        >
          <Info className="w-3.5 h-3.5" />
          촬영 가이드 보기
          {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      {/* ── 촬영 가이드 패널 ── */}
      {showGuide && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 text-xs animate-slide-down">
          <div>
            <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span className="text-green-500 text-sm">✓</span> 좋은 사진
            </p>
            <ul className="space-y-1">
              {DO_LIST.map((t) => (
                <li key={t} className="text-gray-500 flex items-start gap-1.5">
                  <span className="text-green-400 flex-shrink-0 mt-0.5">·</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span className="text-red-400 text-sm">✕</span> 피해야 하는 사진
            </p>
            <ul className="space-y-1">
              {DONT_LIST.map((t) => (
                <li key={t} className="text-gray-500 flex items-start gap-1.5">
                  <span className="text-red-300 flex-shrink-0 mt-0.5">·</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
