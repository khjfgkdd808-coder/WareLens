import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'

const FullBodyUploadZone = () => {
  const { fullBodyPreview, setFullBodyImage, removeFullBodyImage, addToast } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File | null | undefined) => {
    if (!file) return
    const err = validateImageFile(file)
    if (err) { addToast('error', err); return }
    setFullBodyImage(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }}
        className={`relative w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition-all select-none
          ${fullBodyPreview ? 'border-transparent' : isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
      >
        {fullBodyPreview ? (
          <>
            <img src={fullBodyPreview.previewUrl} alt="전신사진" className="absolute inset-0 w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 bg-black/50 px-3 py-1.5 rounded-full">클릭하여 교체</span>
            </div>
            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              업로드 완료
            </span>
          </>
        ) : (
          <>
            <svg className="w-9 h-9 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
            </svg>
            <p className="text-sm font-medium text-gray-700">전신 사진 업로드</p>
            <p className="text-xs text-gray-400">이미지를 드래그하거나 클릭하여 업로드</p>
          </>
        )}
      </div>
      {fullBodyPreview && (
        <button onClick={(e) => { e.stopPropagation(); removeFullBodyImage() }}
          className="mt-1.5 text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
          </svg>
          사진 삭제
        </button>
      )}
      {!fullBodyPreview && <p className="mt-1.5 text-xs text-gray-400">💡 정면이 잘 보이는 전신 사진을 업로드해 주세요.</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])}/>
    </div>
  )
}

export default FullBodyUploadZone
