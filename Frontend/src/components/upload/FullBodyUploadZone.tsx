import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'

// 촬영 가이드 항목
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

const CHECKLIST_ITEMS: { key: 'isFrontFull' | 'isFullBody' | 'isBodyVisible'; label: string }[] = [
  { key: 'isFrontFull',   label: '정면 전신 사진입니다' },
  { key: 'isFullBody',    label: '얼굴부터 발끝까지 모두 보입니다' },
  { key: 'isBodyVisible', label: '몸 형태가 확인 가능한 옷입니다' },
]

export default function FullBodyUploadZone() {
  const {
    fullBodyPreview, bodyPhotoChecklist,
    setFullBodyImage, removeFullBodyImage, setBodyPhotoCheck, addToast,
  } = useAppStore()
  const inputRef   = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

  const handleFile = (file: File | null | undefined) => {
    if (!file) return
    const err = validateImageFile(file)
    if (err) { addToast('error', err); return }
    setFullBodyImage(file)
    setShowGuide(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* 업로드 존 */}
      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
        className={[
          'relative w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer',
          'flex flex-col items-center justify-center transition-all select-none',
          fullBodyPreview ? 'h-72 border-transparent' : 'h-52',
          drag && !fullBodyPreview ? 'border-blue-500 bg-blue-50' : !fullBodyPreview ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40' : '',
        ].join(' ')}
      >
        {fullBodyPreview ? (
          /* 업로드 완료 상태 */
          <>
            <img src={fullBodyPreview.previewUrl} alt="전신사진" className="absolute inset-0 w-full h-full object-cover"/>
            {/* 인체 실루엣 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 100 200" className="h-56 opacity-30 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="50" cy="16" rx="11" ry="13"/>
                <path d="M39 29 Q30 35 26 52 L22 90 Q36 94 50 94 Q64 94 78 90 L74 52 Q70 35 61 29 Z"/>
                <path d="M26 54 L14 82 Q12 88 16 90 L20 88 L24 70"/>
                <path d="M74 54 L86 82 Q88 88 84 90 L80 88 L76 70"/>
                <path d="M38 94 L34 150 Q33 158 38 160 L44 160 L46 120 L50 120 L54 120 L56 160 L62 160 Q67 158 66 150 L62 94"/>
                <path d="M34 160 L32 190 Q31 196 38 196 L42 196 L44 160"/>
                <path d="M62 160 L60 190 Q62 196 68 196 L72 196 L66 160"/>
              </svg>
            </div>
            {/* 완료 뱃지 */}
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              업로드 완료
            </div>
            {/* 교체 오버레이 */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-end justify-center pb-4">
              <span className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100">
                클릭하여 교체
              </span>
            </div>
          </>
        ) : (
          /* 업로드 전 상태 — 실루엣 가이드 */
          <>
            {/* 배경 실루엣 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 100 200" className="h-40 opacity-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="50" cy="16" rx="11" ry="13"/>
                <path d="M39 29 Q30 35 26 52 L22 90 Q36 94 50 94 Q64 94 78 90 L74 52 Q70 35 61 29 Z"/>
                <path d="M26 54 L14 82 Q12 88 16 90 L20 88 L24 70"/>
                <path d="M74 54 L86 82 Q88 88 84 90 L80 88 L76 70"/>
                <path d="M38 94 L34 150 Q33 158 38 160 L44 160 L46 120 L54 120 L56 160 L62 160 Q67 158 66 150 L62 94"/>
                <path d="M34 160 L32 190 Q31 196 38 196 L42 196 L44 160"/>
                <path d="M62 160 L60 190 Q62 196 68 196 L72 196 L66 160"/>
              </svg>
            </div>
            {/* 업로드 아이콘 */}
            <svg className="w-10 h-10 text-blue-300 mb-2 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
            </svg>
            <p className="text-sm font-semibold text-gray-700 relative z-10">전신 사진 업로드</p>
            <p className="text-xs text-gray-400 mt-1 relative z-10">클릭하거나 드래그해서 사진을 올려주세요</p>
          </>
        )}
      </div>

      {/* 삭제 버튼 */}
      {fullBodyPreview && (
        <button onClick={(e) => { e.stopPropagation(); removeFullBodyImage() }}
          className="text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          </svg>
          사진 삭제
        </button>
      )}

      {/* 촬영 가이드 토글 */}
      <button onClick={() => setShowGuide((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition font-medium">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {showGuide ? '가이드 닫기' : '촬영 가이드 보기'}
        <svg className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* 촬영 가이드 */}
      {showGuide && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 text-xs">
          <div>
            <p className="font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="text-green-500">✓</span> 좋은 사진
            </p>
            <ul className="space-y-1">
              {DO_LIST.map((t) => (
                <li key={t} className="text-gray-500 flex items-start gap-1.5">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">·</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
              <span className="text-red-400">✕</span> 피해야 하는 사진
            </p>
            <ul className="space-y-1">
              {DONT_LIST.map((t) => (
                <li key={t} className="text-gray-500 flex items-start gap-1.5">
                  <span className="text-red-300 mt-0.5 flex-shrink-0">·</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 업로드 전 체크리스트 */}
      {fullBodyPreview && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-blue-800 mb-2">업로드 전 확인해 주세요</p>
          {CHECKLIST_ITEMS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={[
                'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                bodyPhotoChecklist[key]
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300 bg-white group-hover:border-blue-400',
              ].join(' ')}>
                {bodyPhotoChecklist[key] && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className={`text-xs ${bodyPhotoChecklist[key] ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                {label}
              </span>
              <input type="checkbox" className="sr-only" checked={bodyPhotoChecklist[key]}
                onChange={(e) => setBodyPhotoCheck(key, e.target.checked)}/>
            </label>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={(e) => handleFile(e.target.files?.[0])}/>
    </div>
  )
}
