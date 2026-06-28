import { useRef, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'
import { validateBodyPhoto } from '@/api/mockApi'

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

/* AI 검증 상태 패널 */
function ValidationPanel() {
  const { photoValidationStatus, photoValidationMessage, photoValidationChecks } = useAppStore()

  if (photoValidationStatus === 'idle') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Upload className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">전신 사진을 업로드해주세요</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            업로드 후 AI가 자동으로 사진 적합성을 확인합니다.
          </p>
        </div>
      </div>
    )
  }

  if (photoValidationStatus === 'validating') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-800">AI 자동 확인 중...</p>
          <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
            MediaPipe 기반 체형 분석을 진행하고 있습니다.
          </p>
          {/* 스켈레톤 진행 표시 */}
          <div className="mt-2 space-y-1.5">
            {['정면 전신 확인', '전신 비율 확인', '의상 적합성 확인'].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-200 animate-pulse flex-shrink-0" />
                <span className="text-[11px] text-blue-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (photoValidationStatus === 'success') {
    const checks = photoValidationChecks
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">사진 확인 완료</p>
          <p className="text-xs text-green-600 mt-0.5">AI 자동 검증을 통과했습니다.</p>
          {checks && (
            <div className="mt-2 space-y-1">
              {[
                { key: 'isFrontFull',   label: '정면 전신 사진' },
                { key: 'isFullBody',    label: '얼굴~발끝 포함' },
                { key: 'isBodyVisible', label: '몸 형태 확인 가능' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[11px] text-green-700 font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // error
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <XCircle className="w-4 h-4 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-red-800">확인 실패</p>
        <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{photoValidationMessage}</p>
        <p className="text-xs text-red-400 mt-1">사진을 교체하여 다시 시도해 주세요.</p>
      </div>
    </div>
  )
}

export default function FullBodyUploadZone() {
  const {
    fullBodyPreview,
    setFullBodyImage, removeFullBodyImage, addToast,
    setPhotoValidating, setPhotoValidation, resetPhotoValidation,
    photoValidationStatus, openErrorModal,
  } = useAppStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag]   = useState(false)

  /**
   * 파일 처리 + AI 자동 검증 트리거
   * 실제 API 연동 시 validateBodyPhoto 함수만 교체하면 됩니다.
   */
  const handleFile = async (file: File | null | undefined) => {
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      // 파일 형식/크기 오류 → Toast
      addToast('error', err)
      return
    }

    // 1. 이미지 미리보기 즉시 표시
    setFullBodyImage(file)
    if (inputRef.current) inputRef.current.value = ''

    // 2. AI 검증 시작 (상태: validating)
    setPhotoValidating()

    try {
      // 3. Mock API 호출 (실제 연동 시 이 부분만 교체)
      const result = await validateBodyPhoto(file)
      // 4. 결과 반영 (success / error)
      setPhotoValidation(result)

      // AI 검증 실패 시 → ErrorModal 표시
      if (result.status === 'error') {
        // 실제 연동 시: result.errorCode를 서버에서 받아 전달
        openErrorModal('NOT_FULL_BODY', () => {
          removeFullBodyImage()
          resetPhotoValidation()
        })
      }
    } catch {
      setPhotoValidation({
        status: 'error',
        message: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.',
        checks: { isFrontFull: false, isFullBody: false, isBodyVisible: false },
      })
      openErrorModal('NETWORK_ERROR')
    }
  }

  const handleRemove = () => {
    removeFullBodyImage()
    resetPhotoValidation()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-5 items-start">

        {/* 전신사진 업로드 — 9:16 세로 비율 */}
        <div className="flex-shrink-0 w-48 sm:w-56">
          <div
            role="button" tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
            className={[
              'relative w-full rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer',
              'flex flex-col items-center justify-center transition-all select-none aspect-[9/16]',
              drag && !fullBodyPreview ? 'border-blue-500 bg-blue-50' :
              fullBodyPreview ? 'border-transparent' :
              'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40',
            ].join(' ')}
          >
            {fullBodyPreview ? (
              <>
                <img
                  src={fullBodyPreview.previewUrl} alt="전신사진"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                {/* 검증 상태 뱃지 */}
                <div className="absolute top-3 left-3 right-3">
                  {photoValidationStatus === 'validating' && (
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full w-fit shadow">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      AI 확인 중
                    </div>
                  )}
                  {photoValidationStatus === 'success' && (
                    <div className="flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full w-fit shadow">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      확인 완료
                    </div>
                  )}
                  {photoValidationStatus === 'error' && (
                    <div className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full w-fit shadow">
                      <XCircle className="w-2.5 h-2.5" />
                      확인 실패
                    </div>
                  )}
                </div>
                {/* 교체 오버레이 */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-end justify-center pb-4">
                  <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                    클릭하여 교체
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg viewBox="0 0 100 200" className="h-3/4 opacity-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="50" cy="16" rx="11" ry="13"/>
                    <path d="M39 29 Q30 35 26 52 L22 90 Q36 94 50 94 Q64 94 78 90 L74 52 Q70 35 61 29 Z"/>
                    <path d="M26 54 L14 82 Q12 88 16 90 L20 88 L24 70"/>
                    <path d="M74 54 L86 82 Q88 88 84 90 L80 88 L76 70"/>
                    <path d="M38 94 L34 150 Q33 158 38 160 L44 160 L46 120 L54 120 L56 160 L62 160 Q67 158 66 150 L62 94"/>
                    <path d="M34 160 L32 190 Q31 196 38 196 L42 196 L44 160"/>
                    <path d="M62 160 L60 190 Q62 196 68 196 L72 196 L66 160"/>
                  </svg>
                </div>
                <Upload className="w-8 h-8 text-blue-300 mb-2 relative z-10" />
                <p className="text-xs font-semibold text-gray-700 relative z-10 text-center px-2">전신 사진 업로드</p>
                <p className="text-[10px] text-gray-400 mt-1 relative z-10 text-center px-2">클릭 또는 드래그</p>
              </>
            )}
          </div>

          {fullBodyPreview && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-2 text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              </svg>
              사진 삭제
            </button>
          )}
        </div>

        {/* 오른쪽: 촬영 가이드 + AI 검증 상태 패널 */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* AI 검증 상태 패널 (4가지 상태) */}
          <ValidationPanel />

          {/* 촬영 가이드 */}
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
        </div>
      </div>

      <input
        ref={inputRef} type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
