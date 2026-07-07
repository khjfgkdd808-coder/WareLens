import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateBodyPhoto } from '@/api/mockApi'
import { validateImageFile } from '@/utils/helpers'

export default function FullBodyUploadZone() {
  const { setFullBodyImage, setPhotoValidation, openErrorModal, addToast } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [mode, setMode] = useState<'idle' | 'loading' | 'done'>('idle')
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = async (file: File | null | undefined) => {
    if (!file) return;

    const err = validateImageFile(file);
    if (err) { addToast('error', err); return; }

    setMode('loading');
    setPreview(URL.createObjectURL(file));

    try {
      const res = await validateBodyPhoto(file);
      
      if (res && res.status === 'success') {
        setFullBodyImage(file);
        setPhotoValidation({ 
          status: 'success', 
          message: '분석 완료', 
          checks: { isFrontFull: true, isFullBody: true, isBodyVisible: true } 
        });
        setMode('done');
      } else {
        throw new Error(res.message || "분석 실패");
      }
    } catch (err: any) {
      console.error("통신 실패:", err);
      setMode('idle');
      setPreview(null);
      // 백엔드에서 보낸 구체적인 에러 메시지 표시
      openErrorModal(err.message || '네트워크 연결 오류가 발생했습니다.');
    }
  }

  return (
    <div className="upload-zone-container">
      {mode === 'idle' && (
        <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
          <Upload className="icon" />
          <p>전신 사진 업로드</p>
          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => handleFileSelect(e.target.files?.[0])} 
          />
        </div>
      )}
      
      {mode === 'loading' && <div className="loading-spinner">분석 중...</div>}
      
      {mode === 'done' && preview && (
        <div className="preview-container">
          <img src={preview} alt="Uploaded" className="preview-image" />
          <button className="remove-btn" onClick={() => { setMode('idle'); setPreview(null); }}>
            <X />
          </button>
        </div>
      )}
    </div>
  )
}