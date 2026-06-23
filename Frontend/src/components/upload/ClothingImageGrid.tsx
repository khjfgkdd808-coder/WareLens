import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'

const MAX = 5

export default function ClothingImageGrid() {
  const { clothingPreviews, addClothingImage, removeClothingImage, addToast } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag]   = useState(false)
  const canAdd = clothingPreviews.length < MAX

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
      {/* 가이드 문구 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-3">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p className="text-xs font-semibold text-amber-700">한 번에 한 벌의 의류만 올려주세요</p>
          <p className="text-xs text-amber-600 mt-0.5">옷 전체 형태가 보이는 사진, 단색 배경, 구겨짐 없는 사진을 권장합니다.</p>
        </div>
      </div>

      {/* 업로드 그리드 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
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
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40',
            ].join(' ')}
          >
            <svg className="w-7 h-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <p className="text-[10px] text-gray-400 text-center leading-tight">사진 추가</p>
          </div>
        )}

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

        {/* 슬롯 placeholder */}
        {Array.from({ length: Math.max(0, (canAdd ? MAX - 1 : MAX) - clothingPreviews.length) }).map((_, i) => (
          <div key={`empty-${i}`}
            className="aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
            <span className="text-[10px] text-gray-300">{clothingPreviews.length + i + (canAdd ? 2 : 1)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400">JPG, PNG, WebP · 최대 10MB</p>
        <p className={`text-xs font-medium ${clothingPreviews.length === MAX ? 'text-blue-600' : 'text-gray-400'}`}>
          {clothingPreviews.length} / {MAX}
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        multiple className="hidden" onChange={(e) => process(e.target.files)}/>
    </div>
  )
}
