import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateBodyPhoto } from '@/api/mockApi'
import { validateImageFile } from '@/utils/helpers'

export default function FullBodyUploadZone() {
  const { setFullBodyImage, setPhotoValidation, openErrorModal, addToast } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 원래 사용하시던 상태 유지
  const [mode, setMode] = useState<'idle' | 'loading' | 'done'>('idle')
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = async (file: File | null | undefined) => {
    if (!file) return;

    // 1. 유효성 검사 (기존 로직 유지)
    const err = validateImageFile(file);
    if (err) { addToast('error', err); return; }

    // 2. 업로드 준비
    setMode('loading');
    setPreview(URL.createObjectURL(file));

    try {
      // 3. 서버 통신 (mockApi.ts 호출)
      const res = await validateBodyPhoto(file);
      
      // 서버에서 status: "success"를 보낼 때만 성공 처리
      if (res && res.status === 'success') {
        setFullBodyImage(file);
        setPhotoValidation({ 
          status: 'success', 
          message: '분석 완료', 
          checks: { isFrontFull: true, isFullBody: true, isBodyVisible: true } 
        });
        setMode('done');
      } else {
        throw new Error("서버 응답 오류");
      }
    } catch (err) {
      console.error("통신 실패:", err);
      // 에러 시 UI 초기화
      setMode('idle');
      setPreview(null);
      openErrorModal('NETWORK_ERROR');
    }
  }

  // UI는 원래 쓰시던 구조를 유지했습니다. (클래스명 등 확인 필요)
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