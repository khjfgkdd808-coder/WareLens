import { useRef, useCallback, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'
import { MAX_CLOTHING_IMAGES } from '@/utils/constants'

const ClothingImageGrid = () => {
  const { clothingPreviews, addClothingImage, removeClothingImage, addToast } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const canAdd = clothingPreviews.length < MAX_CLOTHING_IMAGES

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, MAX_CLOTHING_IMAGES - clothingPreviews.length)
    for (const f of arr) {
      const err = validateImageFile(f)
      if (err) { addToast('error', err); return }
      addClothingImage(f)
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [clothingPreviews.length, addClothingImage, addToast])

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {canAdd && (
          <div
            role="button" tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files) }}
            className={`aspect-square rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 p-3 transition-all select-none
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
          >
            <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
            </svg>
            <p className="text-xs text-gray-500 text-center leading-tight">
              이미지 업로드<br/><span className="text-gray-400">(최대 {MAX_CLOTHING_IMAGES}장)</span>
            </p>
          </div>
        )}
        {clothingPreviews.map((p, i) => (
          <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
            <img src={p.previewUrl} alt={`의류 ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
            <button
              onClick={() => removeClothingImage(p.id)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
              aria-label="삭제"
            >✕</button>
            <span className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">{i+1}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">JPG, PNG, WebP · 최대 10MB</span>
        <span className={`text-xs font-medium ${clothingPreviews.length === MAX_CLOTHING_IMAGES ? 'text-blue-600' : 'text-gray-400'}`}>
          {clothingPreviews.length} / {MAX_CLOTHING_IMAGES}
        </span>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => processFiles(e.target.files)}/>
    </div>
  )
}

export default ClothingImageGrid
