import { useRef, useState } from 'react'
import { 
  Upload,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  XCircle
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateBodyPhoto } from '@/api/mockApi'
import { validateImageFile } from '@/utils/helpers'

export default function FullBodyUploadZone() {
  const { setFullBodyImage, setPhotoValidation, openErrorModal, addToast } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [mode, setMode] = useState<'idle' | 'loading' | 'done'>('idle')
  const [preview, setPreview] = useState<string | null>(null)

  const [quality, setQuality] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  const handleFileSelect = async (file: File | null | undefined) => {
    if (!file) return;

    const err = validateImageFile(file);
    if (err) { addToast('error', err); return; }

    setMode('loading');
    setPreview(URL.createObjectURL(file));

    try {
      const res = await validateBodyPhoto(file);
      
      if (res && res.status === 'success') {

  setFullBodyImage(file)

  setQuality({
    pass: true,
    label: '전신이 잘 보입니다',
    subLabel: 'AI 추천 및 가상피팅 가능',
    checks: {
      fullBody: true,
      centered: true,
      notCropped: true,
      ratio: true
    }
  })

  setPhotoValidation({ 
    status: 'success', 
    message: '분석 완료', 
    checks: { 
      isFrontFull: true, 
      isFullBody: true, 
      isBodyVisible: true 
    } 
  })

  setMode('done')

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
    <div className="upload-zone-container contents">
      {mode === 'idle' && (
        <div className="ga-photo w-full max-w-[360px] mx-auto sm:mx-0 sm:max-w-none space-y-3">

  <div
    className="
      relative
      w-full
      aspect-[3/4]
      rounded-2xl
      border-2
      border-dashed
      border-gray-300
      bg-gray-50
      flex
      flex-col
      items-center
      justify-center
      cursor-pointer
    "
  >

    <Camera className="w-8 h-8 text-gray-400"/>

    <p className="mt-3 text-sm font-semibold text-gray-600">
      정면 전신사진을 등록해주세요
    </p>

    <p className="text-xs text-gray-400 mt-1">
      사진 촬영 또는 업로드 가능
    </p>

  </div>


  <div className="flex gap-2 ">

    <button
  type="button"
  className="
  flex-1
  rounded-xl
  bg-blue-50
  border
  border-blue-200
  py-2.5
  text-xs
  font-bold
  text-blue-600
  flex
  items-center
  justify-center
  gap-1.5
  "
>
  <Camera className="w-3.5 h-3.5" />
  카메라 촬영
</button>


    <button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  className="
  flex-1
  rounded-xl
  border
  border-gray-200
  bg-white
  py-2.5
  text-xs
  font-bold
  text-gray-600
  flex
  items-center
  justify-center
  gap-1.5
  "
>
  <Upload className="w-3.5 h-3.5" />
  사진 업로드
</button>

  </div>

</div>
      )}
      
      {mode === 'loading' && (
        <div className="ga-photo w-full max-w-[360px] mx-auto sm:mx-0 sm:max-w-none">
          <div className="loading-spinner">분석 중...</div>
        </div>
      )}

      {mode === 'done' && preview && (
        <>

{/* 사진 — 결과 박스가 빠지면서 확보된 세로 공간을 그대로 사용
     (sm 이상에서는 h-full로 photo 영역이 2행을 병합한 높이를 꽉 채움) */}
<div className="ga-photo w-full max-w-[360px] mx-auto sm:mx-0 sm:max-w-none sm:h-full">

<div className="relative rounded-2xl overflow-hidden bg-gray-100 h-full">

<img
src={preview}
alt="전신사진"
className="w-full h-full aspect-[3/4] sm:aspect-auto object-cover"
/>


<div className="absolute top-3 left-3">
<div className="
flex items-center gap-1
px-3 py-1
rounded-full
bg-green-500
text-white
text-xs
font-bold
">

<CheckCircle2 className="w-3 h-3"/>

GOOD

</div>
</div>


</div>

</div>

{/* 결과 박스 — 오른쪽 가이드 아래로 이동 */}
<div className="
ga-quality
mt-2
rounded-xl
border
border-green-200
bg-green-50
p-4
">

<div className="flex gap-3">


<CheckCircle2 className="text-green-600"/>


<div>

<p className="
font-bold
text-green-700
text-sm
">
전신이 잘 보입니다
</p>


<p className="
text-xs
text-green-600
mt-1
">
AI 추천 및 가상피팅 가능
</p>

</div>

</div>



<div className="
grid
grid-cols-2
gap-2
mt-3
text-xs
">

<div>✅ 전신 포함</div>
<div>✅ 사람 중심 정렬</div>
<div>✅ 좌우 잘림 없음</div>
<div>✅ 이미지 비율 적합</div>


</div>


</div>

{/* 버튼 — 카드 맨 아래, 전체 폭 */}
<div className="ga-actions flex gap-2 self-center mt-4 sm:mt-0">


<button
onClick={()=>{
setMode('idle')
setPreview(null)
}}
className="
flex-1
    border
    rounded-xl
    py-2
    px-2
    text-sm
    whitespace-nowrap
    flex
    items-center
    justify-center
    gap-1
  "
>

<RotateCcw className="inline w-4 h-4 mr-1"/>

다시 업로드

</button>



<button
className="
flex-1
bg-blue-600
text-white
rounded-xl
py-2
text-sm
font-bold
"
>

사진 확정

</button>


</div>

        </>
      )}

      {/* 파일 업로드 input */}
      <input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  className="hidden"
  onChange={(e) => handleFileSelect(e.target.files?.[0])}
/>
    </div>
  )
}