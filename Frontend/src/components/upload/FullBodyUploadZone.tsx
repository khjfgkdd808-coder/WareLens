/**
 * FullBodyUploadZone.tsx
 * 전신 사진 업로드 — 카메라 촬영 UX
 *
 * 4단계 상태 흐름:
 *  idle      → 촬영 전 안내 + 파일 업로드 대안
 *  camera    → 카메라 프리뷰 + 실루엣 가이드 + MediaPipe 인식 상태
 *  detecting → 인식 실패 시 위치 조정 안내
 *  done      → 촬영 완료 미리보기 + 다시 촬영 / 사용하기
 *
 * 기존 데이터 흐름 유지:
 *  setFullBodyImage / removeFullBodyImage / validateBodyPhoto / setPhotoValidating 등
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, XCircle, Camera, Upload,
         RotateCcw, Check, AlertTriangle, ZoomIn } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'
import { validateBodyPhoto } from '@/api/mockApi'

// ── 상수 ────────────────────────────────────────────────────────
const TIPS_GOOD = [
  '정면에서 전신이 모두 보이는 사진',
  '양팔과 양다리를 살짝 벌린 자연스러운 자세',
  '밝은 배경 또는 흰색 배경 권장',
  '몸 형태가 구분되는 단순한 옷',
  '혼자 촬영한 사진',
]
const TIPS_BAD = [
  '측면 사진 / 거울 셀카',
  '오버핏 후드티, 롱패딩, 긴 치마',
  '발끝이 잘린 사진',
  '배경과 인물이 구분되지 않는 사진',
]

// 인식 상태 메시지
const DETECT_MSGS: Record<string, { label: string; color: string; tip: string }> = {
  scanning: { label: '인체 인식 중...', color: '#3b82f6', tip: '화면 안에 전신이 들어오도록 위치를 조정해 주세요' },
  partial:  { label: '전신이 잘리고 있어요', color: '#f59e0b', tip: '조금 뒤로 물러서거나 카메라를 아래로 내려주세요' },
  detected: { label: '인식 완료 — 촬영하세요!', color: '#22c55e', tip: '자연스럽게 서서 촬영 버튼을 눌러주세요' },
}

type ZoneMode = 'idle' | 'camera' | 'detecting' | 'done'
type DetectState = 'scanning' | 'partial' | 'detected'

// ── 사람 실루엣 SVG ─────────────────────────────────────────────
function PersonSilhouette({ opacity = 0.18, color = 'white' }: { opacity?: number; color?: string }) {
  return (
    <svg viewBox="0 0 100 220" className="w-full h-full" fill="none"
         stroke={color} strokeWidth="1.5" opacity={opacity}>
      <ellipse cx="50" cy="15" rx="12" ry="13"/>
      <path d="M38 28 Q28 38 25 58 L22 100 Q35 105 50 105 Q65 105 78 100 L75 58 Q72 38 62 28 Z"/>
      <path d="M25 62 L12 95 Q10 102 16 104 L20 102 L24 82"/>
      <path d="M75 62 L88 95 Q90 102 84 104 L80 102 L76 82"/>
      <path d="M36 105 L33 165 Q32 174 37 175 L43 175 L45 130 L50 130 L55 130 L57 175 L63 175 Q68 174 67 165 L64 105"/>
      <path d="M33 175 L31 210 Q30 217 37 217 L41 217 L43 175"/>
      <path d="M63 175 L61 210 Q63 217 69 217 L73 217 L67 175"/>
    </svg>
  )
}

// ── MediaPipe 스켈레톤 (인식 완료 오버레이) ─────────────────────
const SK_POINTS = [
  { x: 50, y: 8  }, { x: 44, y: 12 }, { x: 56, y: 12 },
  { x: 50, y: 20 }, { x: 30, y: 32 }, { x: 70, y: 32 },
  { x: 22, y: 50 }, { x: 78, y: 50 }, { x: 18, y: 66 },
  { x: 82, y: 66 }, { x: 38, y: 63 }, { x: 62, y: 63 },
  { x: 35, y: 82 }, { x: 65, y: 82 }, { x: 32, y: 98 },
  { x: 68, y: 98 },
]
const SK_LINES: [number, number][] = [
  [0,3],[3,4],[3,5],[4,6],[5,7],[6,8],[7,9],[4,10],[5,11],
  [10,12],[11,12],[12,13],[12,14],[13,15],
]

function SkeletonOverlay() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 110">
      {SK_LINES.map(([a, b], i) => (
        <line key={i}
          x1={SK_POINTS[a].x} y1={SK_POINTS[a].y}
          x2={SK_POINTS[b].x} y2={SK_POINTS[b].y}
          stroke="#3b82f6" strokeWidth="0.8" opacity="0.8" strokeLinecap="round"/>
      ))}
      {SK_POINTS.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="1.5"
          fill="#3b82f6" stroke="white" strokeWidth="0.6" opacity="0.9"/>
      ))}
    </svg>
  )
}

// ── AI 검증 상태 패널 ───────────────────────────────────────────
function ValidationPanel() {
  const { photoValidationStatus, photoValidationMessage, photoValidationChecks } = useAppStore()
  if (photoValidationStatus === 'idle') return null

  if (photoValidationStatus === 'validating') {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">AI 자동 확인 중...</p>
          <div className="mt-1.5 space-y-1">
            {['정면 전신 확인', '전신 비율 확인', '의상 적합성 확인'].map((label) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-pulse flex-shrink-0" />
                <span className="text-[11px] text-blue-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (photoValidationStatus === 'success') {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-50 border border-green-200">
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">사진 확인 완료</p>
          {photoValidationChecks && (
            <div className="mt-1.5 space-y-0.5">
              {[
                { key: 'isFrontFull',   label: '정면 전신 사진' },
                { key: 'isFullBody',    label: '얼굴~발끝 포함' },
                { key: 'isBodyVisible', label: '몸 형태 확인 가능' },
              ].map(({ key, label }) => (
                <p key={key} className="flex items-center gap-1.5 text-[11px] text-green-700 font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
                       strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {label}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">확인 실패</p>
        <p className="text-xs text-red-600 mt-0.5">{photoValidationMessage}</p>
        <p className="text-xs text-red-400 mt-1">사진을 교체하거나 다시 촬영해 주세요.</p>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────
export default function FullBodyUploadZone() {
  const {
    fullBodyPreview,
    setFullBodyImage, removeFullBodyImage, addToast,
    setPhotoValidating, setPhotoValidation, resetPhotoValidation,
    photoValidationStatus, openErrorModal,
  } = useAppStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const detectTimer  = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mode,       setMode]       = useState<ZoneMode>('idle')
  const [detectState, setDetectState] = useState<DetectState>('scanning')
  const [cameraErr,  setCameraErr]  = useState('')
  const [drag,       setDrag]       = useState(false)

  // ── 카메라 정리 ───────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (detectTimer.current) {
      clearInterval(detectTimer.current)
      detectTimer.current = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // ── 카메라 시작 ───────────────────────────────────────────────
  const startCamera = async () => {
    setCameraErr('')
    setMode('camera')
    setDetectState('scanning')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Mock MediaPipe 인식 시뮬레이션
      let tick = 0
      detectTimer.current = setInterval(() => {
        tick++
        if (tick < 2)        setDetectState('scanning')
        else if (tick < 4)   setDetectState('partial')
        else {
          setDetectState('detected')
          if (detectTimer.current) clearInterval(detectTimer.current)
        }
      }, 1200)
    } catch (err) {
      stopCamera()
      setMode('idle')
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? '카메라 접근 권한이 없습니다. 브라우저 설정에서 카메라를 허용해 주세요.'
        : '카메라를 시작할 수 없습니다. 파일 업로드를 이용해 주세요.'
      setCameraErr(msg)
      addToast('error', msg)
    }
  }

  // ── 촬영 ─────────────────────────────────────────────────────
  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 셀카 모드(전면 카메라)는 좌우 반전
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)
    ctx.restore()

    canvas.toBlob(async (blob) => {
      if (!blob) return
      stopCamera()
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      await processFile(file)
    }, 'image/jpeg', 0.92)
  }

  // ── 파일 처리 + AI 검증 (기존 데이터 흐름 그대로 유지) ───────
  const processFile = async (file: File) => {
    const err = validateImageFile(file)
    if (err) { addToast('error', err); return }

    setFullBodyImage(file)
    setMode('done')
    setPhotoValidating()

    try {
      const result = await validateBodyPhoto(file)
      setPhotoValidation(result)
      if (result.status === 'error') {
        openErrorModal('NOT_FULL_BODY', () => {
          handleRetake()
        })
      }
    } catch {
      setPhotoValidation({
        status:  'error',
        message: '네트워크 오류가 발생했습니다.',
        checks:  { isFrontFull: false, isFullBody: false, isBodyVisible: false },
      })
      openErrorModal('NETWORK_ERROR')
    }
  }

  // ── 다시 촬영 ─────────────────────────────────────────────────
  const handleRetake = () => {
    removeFullBodyImage()
    resetPhotoValidation()
    setCameraErr('')
    setMode('idle')
    stopCamera()
  }

  // ── 파일 드래그/선택 ──────────────────────────────────────────
  const handleFileDrop = (file: File | null | undefined) => {
    if (!file) return
    processFile(file)
  }

  // ── 카메라 취소 ───────────────────────────────────────────────
  const cancelCamera = () => {
    stopCamera()
    setMode('idle')
    setDetectState('scanning')
  }

  const dm = DETECT_MSGS[detectState]

  // ═══════════════════════════════════════════════════════════════
  // 렌더
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">

      {/* ── 메인 업로드 영역 ─────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* 왼쪽: 사진/카메라 영역 */}
        <div className="flex-shrink-0 w-48 sm:w-56">

          {/* ── IDLE: 촬영 전 상태 ───────────────────────── */}
          {mode === 'idle' && (
            <div className="space-y-2">
              {/* 실루엣 + 촬영 버튼 영역 */}
              <div
                className="relative w-full rounded-2xl overflow-hidden aspect-[9/16] cursor-pointer group"
                style={{ background: 'linear-gradient(160deg, #1e3a5f 0%, #0f172a 100%)' }}
                onClick={startCamera}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && startCamera()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDrag(false)
                  handleFileDrop(e.dataTransfer.files[0])
                }}
              >
                {/* 실루엣 가이드 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/5 h-4/5">
                    <PersonSilhouette opacity={0.22} color="white" />
                  </div>
                </div>
                {/* 상단 가이드라인 */}
                <div className="absolute top-4 left-4 right-4">
                  <p className="text-white text-[9px] font-semibold tracking-widest uppercase opacity-60 text-center">
                    전신 촬영 가이드
                  </p>
                </div>
                {/* 코너 프레임 */}
                {['top-3 left-3','top-3 right-3','bottom-3 left-3','bottom-3 right-3'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-4 h-4`}
                    style={{
                      borderTop:   i < 2 ? '2px solid rgba(255,255,255,0.4)' : 'none',
                      borderBottom: i >= 2 ? '2px solid rgba(255,255,255,0.4)' : 'none',
                      borderLeft:  i % 2 === 0 ? '2px solid rgba(255,255,255,0.4)' : 'none',
                      borderRight: i % 2 === 1 ? '2px solid rgba(255,255,255,0.4)' : 'none',
                    }}
                  />
                ))}
                {/* 촬영 CTA */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col items-center gap-2"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-white text-[10px] font-semibold">카메라로 촬영</p>
                </div>
                {/* 드래그 오버레이 */}
                {drag && (
                  <div className="absolute inset-0 bg-blue-500/30 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-white text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-semibold">여기에 놓으세요</p>
                    </div>
                  </div>
                )}
              </div>
              {/* 파일 업로드 대안 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 rounded-xl text-[11px] font-medium text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-500 transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                파일에서 선택
              </button>
              {cameraErr && (
                <p className="text-[10px] text-red-500 text-center leading-relaxed">{cameraErr}</p>
              )}
            </div>
          )}

          {/* ── CAMERA: 카메라 활성 상태 ─────────────────── */}
          {(mode === 'camera') && (
            <div className="space-y-2">
              <div className="relative w-full rounded-2xl overflow-hidden aspect-[9/16] bg-black">
                {/* 비디오 프리뷰 */}
                <video
                  ref={videoRef}
                  playsInline muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* 실루엣 가이드 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/5 h-4/5">
                    <PersonSilhouette
                      opacity={detectState === 'detected' ? 0 : 0.35}
                      color={detectState === 'partial' ? '#fbbf24' : 'white'}
                    />
                  </div>
                  {detectState === 'detected' && <SkeletonOverlay />}
                </div>

                {/* 인식 상태 표시 */}
                <div className="absolute top-3 inset-x-3 flex justify-center">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold backdrop-blur-sm"
                    style={{ backgroundColor: `${dm.color}cc` }}
                  >
                    {detectState === 'scanning' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {detectState === 'partial'  && <AlertTriangle className="w-3 h-3" />}
                    {detectState === 'detected' && <CheckCircle2  className="w-3 h-3" />}
                    {dm.label}
                  </div>
                </div>

                {/* 하단: 촬영 버튼 + 취소 */}
                <div
                  className="absolute bottom-0 inset-x-0 p-4 flex flex-col items-center gap-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
                >
                  {/* 촬영 버튼 */}
                  <button
                    type="button"
                    onClick={capture}
                    disabled={detectState !== 'detected'}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: detectState === 'detected' ? 'white' : 'rgba(255,255,255,0.3)',
                      border: '3px solid white',
                      cursor: detectState === 'detected' ? 'pointer' : 'not-allowed',
                      transform: detectState === 'detected' ? 'scale(1)' : 'scale(0.9)',
                    }}
                    aria-label="촬영"
                  >
                    {detectState === 'detected'
                      ? <Camera className="w-7 h-7 text-gray-800" />
                      : <Loader2 className="w-5 h-5 text-white animate-spin" />
                    }
                  </button>
                  <button
                    type="button"
                    onClick={cancelCamera}
                    className="text-white/70 text-[10px] hover:text-white transition"
                  >
                    취소
                  </button>
                </div>
              </div>
              {/* 위치 안내 */}
              <div
                className="px-3 py-2 rounded-xl text-[10px] font-medium text-center"
                style={{ backgroundColor: `${dm.color}20`, color: dm.color }}
              >
                {dm.tip}
              </div>
            </div>
          )}

          {/* ── DONE: 촬영 완료 ───────────────────────────── */}
          {mode === 'done' && fullBodyPreview && (
            <div className="space-y-2">
              <div className="relative w-full rounded-2xl overflow-hidden aspect-[9/16] bg-gray-100">
                <img
                  src={fullBodyPreview.previewUrl}
                  alt="촬영된 전신사진"
                  className="w-full h-full object-cover object-top"
                />
                {/* 검증 상태 뱃지 */}
                <div className="absolute top-3 left-3">
                  {photoValidationStatus === 'validating' && (
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />AI 확인 중
                    </div>
                  )}
                  {photoValidationStatus === 'success' && (
                    <div className="flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                      <Check className="w-2.5 h-2.5" />확인 완료
                    </div>
                  )}
                  {photoValidationStatus === 'error' && (
                    <div className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                      <XCircle className="w-2.5 h-2.5" />확인 실패
                    </div>
                  )}
                </div>
                {/* 성공 시 스켈레톤 미리보기 */}
                {photoValidationStatus === 'success' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <SkeletonOverlay />
                  </div>
                )}
              </div>
              {/* 다시 촬영 / 사용하기 */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="py-2 rounded-xl text-[11px] font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />다시 촬영
                </button>
                <button
                  type="button"
                  disabled={photoValidationStatus !== 'success'}
                  className="py-2 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-1 transition"
                  style={{
                    backgroundColor: photoValidationStatus === 'success' ? '#2563eb' : '#d1d5db',
                    cursor: photoValidationStatus === 'success' ? 'pointer' : 'not-allowed',
                  }}
                >
                  <ZoomIn className="w-3 h-3" />사용하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 촬영 가이드 + AI 검증 상태 */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* AI 검증 상태 패널 */}
          <ValidationPanel />

          {/* 촬영 조건 가이드 */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 text-xs">
            <div>
              <p className="font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <span className="text-green-500">✓</span> 좋은 사진
              </p>
              <ul className="space-y-1">
                {TIPS_GOOD.map((t) => (
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
                {TIPS_BAD.map((t) => (
                  <li key={t} className="text-gray-500 flex items-start gap-1.5">
                    <span className="text-red-300 mt-0.5 flex-shrink-0">·</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 카메라 사용 안내 (idle 상태에서만) */}
          {mode === 'idle' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[10px] text-blue-600 leading-relaxed">
                <span className="font-semibold">📸 카메라 촬영 추천</span><br/>
                카메라를 사용하면 MediaPipe가 전신 인식을 실시간으로 안내합니다.
                인식이 완료되면 자동으로 촬영 버튼이 활성화됩니다.
              </p>
            </div>
          )}

          {/* 카메라 활성 시 상태 가이드 */}
          {mode === 'camera' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">인식 단계</p>
              {Object.entries(DETECT_MSGS).map(([key, val]) => (
                <div key={key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: detectState === key ? `${val.color}15` : 'transparent',
                    border: detectState === key ? `1px solid ${val.color}40` : '1px solid transparent',
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                       style={{ backgroundColor: detectState === key ? val.color : '#d1d5db' }} />
                  <span className="text-[11px] font-medium"
                        style={{ color: detectState === key ? val.color : '#9ca3af' }}>
                    {val.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 숨김 캔버스 (촬영 캡처용) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileDrop(e.target.files?.[0])}
      />
    </div>
  )
}
