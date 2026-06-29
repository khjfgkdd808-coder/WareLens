import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'

const MAX = 5

// 빈 슬롯에 보여줄 의류 실루엣 아이콘 (순환)
const CLOTHING_ICONS = [
  // 티셔츠
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 6 L6 12 L10 14 L10 32 L30 32 L30 14 L34 12 L26 6 C26 6 23 10 20 10 C17 10 14 6 14 6Z" />
  </svg>,
  // 셔츠
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 5 L6 11 L10 13 L10 33 L30 33 L30 13 L34 11 L27 5 M13 5 L17 9 M27 5 L23 9 M17 9 L20 11 L23 9" />
  </svg>,
  // 후드티
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 6 C12 6 8 9 6 13 L10 15 L10 33 L30 33 L30 15 L34 13 C32 9 28 6 26 6 C26 6 24 10 20 10 C16 10 14 6 14 6Z" />
    <path d="M16 7 Q20 14 24 7" />
  </svg>,
  // 니트/스웨터
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 6 L6 13 L10 15 L10 33 L30 33 L30 15 L34 13 L26 6 C26 6 23 9 20 9 C17 9 14 6 14 6Z" />
    <path d="M10 18 L30 18 M10 22 L30 22 M10 26 L30 26" />
  </svg>,
  // 추가 (+)
  null,
]

export default function ClothingImageGrid() {
  const { clothingPreviews, addClothingImage, removeClothingImage, addToast } = useAppStore()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const canAdd    = clothingPreviews.length < MAX
  const emptyCount = MAX - clothingPreviews.length - (canAdd ? 1 : 0)

  const process = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, MAX - clothingPreviews.length)
    for (const f of arr) {
      const err = validateImageFile(f)
      if (err) { addToast('error', err); return }
      addClothingImage(f)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {/* 안내 배너 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-3">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p className="text-xs font-semibold text-amber-700">한 번에 한 벌의 의류만 올려주세요</p>
          <p className="text-xs text-amber-600 mt-0.5">옷 전체 형태가 보이는 사진, 단색 배경을 권장합니다.</p>
        </div>
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">

        {/* 업로드 버튼 */}
        {canAdd && (
          <div
            role="button" tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files) }}
            className={[
              'aspect-square rounded-xl border-2 border-dashed cursor-pointer',
              'flex flex-col items-center justify-center gap-1.5 transition-all select-none p-2',
              drag
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-300 hover:border-brand-400 hover:bg-brand-50/40',
            ].join(' ')}
          >
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Plus className="w-5 h-5 text-brand-400" />
            </div>
            <p className="text-[10px] text-gray-400 text-center leading-tight">사진 추가</p>
          </div>
        )}

        {/* 업로드된 이미지 */}
        {clothingPreviews.map((p, i) => (
          <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <img src={p.previewUrl} alt={`의류 ${i+1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
            <button onClick={() => removeClothingImage(p.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500 text-[10px]"
              aria-label="삭제">✕</button>
            <span className="absolute bottom-1 left-1 w-4 h-4 rounded-full bg-black/50 text-white text-[9px] font-bold flex items-center justify-center">
              {i+1}
            </span>
          </div>
        ))}

        {/* 빈 슬롯 — 의류 실루엣 아이콘 */}
        {Array.from({ length: Math.max(0, emptyCount) }).map((_, i) => {
          const icon = CLOTHING_ICONS[i % (CLOTHING_ICONS.length - 1)]
          return (
            <div
              key={`empty-${i}`}
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50/60 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition group"
            >
              <div className="text-gray-200 group-hover:text-brand-200 transition">
                {icon}
              </div>
              <span className="text-[9px] text-gray-300 group-hover:text-brand-300">
                {clothingPreviews.length + i + 2}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400">JPG · PNG · WebP · 최대 10MB</p>
        <p className={`text-xs font-medium ${clothingPreviews.length === MAX ? 'text-brand-600' : 'text-gray-400'}`}>
          {clothingPreviews.length} / {MAX}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple className="hidden" onChange={(e) => process(e.target.files)}/>
    </div>
  )
}
