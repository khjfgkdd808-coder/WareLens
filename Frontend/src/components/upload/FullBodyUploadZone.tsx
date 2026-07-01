/**
 * FullBodyUploadZone.tsx
 * AI 전신 사진 입력 — 카메라 + 업로드 통합 UX
 *
 * ─── 입력 방식 ────────────────────────────────────────────────
 *  idle   → 공통 가이드 프레임 + [카메라 촬영] / [사진 업로드] 선택
 *  camera → 실시간 카메라 + 전신 가이드 오버레이 + GOOD/OK/BAD 상태
 *  upload → 파일 선택 → AI 품질 검사 진행
 *  done   → 검사 결과 표시 (성공 / 실패) → 재촬영 / 재업로드 유도
 *
 * ─── 기존 데이터 흐름 유지 ────────────────────────────────────
 *  setFullBodyImage / removeFullBodyImage
 *  validateBodyPhoto / setPhotoValidating / setPhotoValidation
 *  openErrorModal
 *
 * ─── MediaPipe 확장 구조 ──────────────────────────────────────
 *  현재: Mock 인식 시뮬레이션 (scanState: GOOD/OK/BAD)
 *  추후: usePoseDetection() 훅 연결 → scanState 실시간 업데이트
 *  자동 촬영 로직: autoCapture prop (현재 false, 추후 확장)
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, Upload, RotateCcw, CheckCircle2, XCircle,
         Loader2, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { validateImageFile } from '@/utils/helpers'
import { validateBodyPhoto } from '@/api/mockApi'

// ── 타입 ──────────────────────────────────────────────────────────
type InputMode  = 'idle' | 'camera' | 'upload' | 'done'

/**
 * GOOD  → 촬영 가능 (전신 인식 완료)
 * OK    → 위치 조정 필요
 * BAD   → 전신 인식 불가
 */
type ScanState  = 'GOOD' | 'OK' | 'BAD'

/**
 * AI 이미지 품질 검사 결과
 * 카메라 / 업로드 모두 동일 기준 적용
 */
interface QualityResult {
  pass:      boolean
  label:     string             // "전신이 잘 보입니다" 등
  subLabel:  string             // "AI 추천 및 가상피팅 가능" 등
  checks: {
    fullBody:   boolean   // 전신 포함 여부
    centered:   boolean   // 사람 중심 정렬
    notCropped: boolean   // 좌우 잘림 여부
    ratio:      boolean   // 이미지 비율 적합
  }
}

// ── 상수 ──────────────────────────────────────────────────────────
const SCAN_CONFIG: Record<ScanState, {
  label: string; sub: string; color: string; bg: string; border: string
}> = {
  GOOD: {
    label: '🟢 GOOD — 촬영 가능',
    sub:   '전신이 가이드 안에 잘 들어왔습니다',
    color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
  },
  OK: {
    label: '🟡 OK — 위치 조정 필요',
    sub:   '조금 뒤로 물러서거나 카메라를 내려주세요',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
  },
  BAD: {
    label: '🔴 BAD — 전신 인식 불가',
    sub:   '전신이 모두 보이도록 위치를 조정해 주세요',
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
  },
}

// ── 공통 가이드 프레임 SVG ─────────────────────────────────────────
/**
 * 증명사진 업로드 방식 — 사람 실루엣 가이드 제거
 * 사진 영역 기준의 단순한 코너 프레임만 표시
 * (사용자가 특정 자세에 맞춰야 한다는 느낌 제거)
 */
function GuideFrame({
  scanState,
}: {
  scanState?: ScanState
}) {
  const borderColor = scanState
    ? SCAN_CONFIG[scanState].color
    : 'rgba(255,255,255,0.4)'

  return (
    <svg
      viewBox="0 0 300 500"
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 코너 프레임만 — 사진 영역 기준 가이드 */}
      {[
        { x: 24,  y: 24,  dx: 1,  dy: 1  },
        { x: 276, y: 24,  dx: -1, dy: 1  },
        { x: 24,  y: 476, dx: 1,  dy: -1 },
        { x: 276, y: 476, dx: -1, dy: -1 },
      ].map((c, i) => (
        <g key={i}>
          <line x1={c.x} y1={c.y} x2={c.x + c.dx * 32} y2={c.y}
            stroke={borderColor} strokeWidth="3" strokeLinecap="round"/>
          <line x1={c.x} y1={c.y} x2={c.x} y2={c.y + c.dy * 32}
            stroke={borderColor} strokeWidth="3" strokeLinecap="round"/>
        </g>
      ))}
    </svg>
  )
}

// ── AI 품질 검사 결과 패널 ─────────────────────────────────────────
function QualityPanel({ result }: { result: QualityResult }) {
  const CHECKS = [
    { key: 'fullBody',   label: '전신 포함' },
    { key: 'centered',   label: '사람 중심 정렬' },
    { key: 'notCropped', label: '좌우 잘림 없음' },
    { key: 'ratio',      label: '이미지 비율 적합' },
  ] as const

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: result.pass ? '#f0fdf4' : '#fef2f2',
        borderColor:     result.pass ? '#86efac' : '#fca5a5',
      }}
    >
      {/* 결과 헤더 */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: result.pass ? '#dcfce7' : '#fee2e2' }}
        >
          {result.pass
            ? <CheckCircle2 className="w-5 h-5" style={{ color: '#16a34a' }} />
            : <XCircle      className="w-5 h-5" style={{ color: '#dc2626' }} />
          }
        </div>
        <div>
          <p className="text-sm font-bold"
             style={{ color: result.pass ? '#15803d' : '#b91c1c' }}>
            {result.label}
          </p>
          <p className="text-xs mt-0.5"
             style={{ color: result.pass ? '#16a34a' : '#dc2626' }}>
            {result.subLabel}
          </p>
        </div>
      </div>

      {/* 검사 항목 */}
      <div className="grid grid-cols-2 gap-1.5">
        {CHECKS.map(({ key, label }) => {
          const ok = result.checks[key]
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: ok ? '#dcfce7' : '#fee2e2' }}>
                {ok
                  ? <svg className="w-2.5 h-2.5" style={{ color: '#16a34a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg className="w-2.5 h-2.5" style={{ color: '#dc2626' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <span className="text-[10px] font-medium"
                    style={{ color: ok ? '#15803d' : '#991b1b' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
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
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mode,       setMode]       = useState<InputMode>('idle')
  const [scanState,  setScanState]  = useState<ScanState>('BAD')
  const [cameraErr,  setCameraErr]  = useState('')
  const [quality,    setQuality]    = useState<QualityResult | null>(null)
  const [checking,   setChecking]   = useState(false)   // 업로드 후 품질 검사 중

  // ── 카메라 정리 ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  // ── 카메라 시작 ────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraErr('')
    setScanState('BAD')
    setMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }

      /**
       * TODO: MediaPipe Pose 연결 지점
       * 실제 연동 시 이 타이머를 제거하고
       * usePoseDetection(videoRef) 훅의 반환값으로 scanState를 업데이트합니다.
       *
       * 예시:
       *  const { poseQuality } = usePoseDetection(videoRef)
       *  useEffect(() => setScanState(poseQuality), [poseQuality])
       */
      let tick = 0
      scanTimerRef.current = setInterval(() => {
        tick++
        if      (tick < 2) setScanState('BAD')
        else if (tick < 4) setScanState('OK')
        else {
          setScanState('GOOD')
          clearInterval(scanTimerRef.current!)
          scanTimerRef.current = null
        }
      }, 1100)
    } catch (err) {
      stopCamera()
      setMode('idle')
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? '카메라 접근 권한이 없습니다. 브라우저 설정에서 허용해 주세요.'
        : '카메라를 시작할 수 없습니다. 사진 업로드를 이용해 주세요.'
      setCameraErr(msg)
      addToast('error', msg)
    }
  }

  // ── 촬영 ────────────────────────────────────────────────────────
  const capture = () => {
    if (!videoRef.current || !canvasRef.current || scanState !== 'GOOD') return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -canvas.width, 0); ctx.restore()
    canvas.toBlob(async (blob) => {
      if (!blob) return
      stopCamera()
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      await processFile(file)
    }, 'image/jpeg', 0.92)
  }

  // ── AI 이미지 품질 검사 (카메라/업로드 공통) ──────────────────────
  /**
   * TODO: 실제 MediaPipe/AI 서버 응답으로 교체
   * 현재: validateBodyPhoto Mock API 결과 기반으로 QualityResult 생성
   * 추후: 서버에서 { fullBody, centered, notCropped, ratio } 직접 반환
   */
  const runQualityCheck = async (file: File): Promise<QualityResult> => {
    const result = await validateBodyPhoto(file)
    const { isFrontFull, isFullBody, isBodyVisible } = result.checks
    const pass = result.status === 'success'
    return {
      pass,
      label:    pass ? '전신이 잘 보입니다' : '전신 일부가 잘렸습니다',
      subLabel: pass ? 'AI 추천 및 가상피팅 가능' : '다시 업로드해 주세요',
      checks: {
        fullBody:   isFullBody,
        centered:   isFrontFull,
        notCropped: isBodyVisible,
        ratio:      pass,
      },
    }
  }

  // ── 파일 처리 (카메라/업로드 공통 최종 처리) ──────────────────────
  const processFile = async (file: File) => {
    const err = validateImageFile(file)
    if (err) { addToast('error', err); return }

    setFullBodyImage(file)
    setMode('done')
    setChecking(true)
    setQuality(null)
    setPhotoValidating()

    try {
      const q = await runQualityCheck(file)
      setQuality(q)
      setPhotoValidation({
        status:  q.pass ? 'success' : 'error',
        message: q.pass ? '사진 확인 완료' : q.label,
        checks: {
          isFrontFull:   q.checks.centered,
          isFullBody:    q.checks.fullBody,
          isBodyVisible: q.checks.notCropped,
        },
      })
      if (!q.pass) openErrorModal('NOT_FULL_BODY', handleRetake)
    } catch {
      setPhotoValidation({ status: 'error', message: '네트워크 오류', checks: { isFrontFull: false, isFullBody: false, isBodyVisible: false } })
      openErrorModal('NETWORK_ERROR')
    } finally {
      setChecking(false)
    }
  }

  // ── 다시 시작 ────────────────────────────────────────────────────
  const handleRetake = () => {
    removeFullBodyImage()
    resetPhotoValidation()
    setCameraErr('')
    setQuality(null)
    setMode('idle')
    stopCamera()
  }

  // ── 업로드 파일 선택 ─────────────────────────────────────────────
  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return
    stopCamera()
    setMode('upload')
    processFile(file)
  }

  const sc = SCAN_CONFIG[scanState]

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3">

      {/* ─── IDLE: 사진 영역 기준 가이드 (증명사진 업로드 방식) ── */}
      {mode === 'idle' && (
        <div className="space-y-3">
          {/* 사진 영역 — 단순 박스 가이드 (사람 형태 강제 없음) */}
          <div
            className="relative w-full mx-auto rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '3/4',
              maxWidth: 280,
              background: '#f3f4f6',
              border: '2px dashed #d1d5db',
            }}
          >
            <GuideFrame />

            {/* 안내 아이콘 + 텍스트 (중앙) */}
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <Camera className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">정면 전신사진을 등록해주세요</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                사진 영역 안에 맞춰 촬영하거나<br/>가지고 있는 사진을 업로드하세요
              </p>
            </div>

            {/* 드래그&드롭 영역 */}
            <div
              className="absolute inset-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]) }}
            />
          </div>

          {/* 입력 방식 선택 — 작은 보조 버튼 (큰 카드 아님) */}
          <div className="flex items-center justify-center gap-2" style={{ maxWidth: 280, margin: '0 auto' }}>
            {/* 카메라 촬영 */}
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all hover:bg-blue-50"
              style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff', whiteSpace: 'nowrap' }}
            >
              <Camera className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-600">📷 카메라 촬영</span>
            </button>

            {/* 사진 업로드 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all hover:bg-gray-100"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb', whiteSpace: 'nowrap' }}
            >
              <Upload className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-600">🖼 사진 선택</span>
            </button>
          </div>

          {cameraErr && (
            <p className="text-[11px] text-red-500 text-center leading-relaxed max-w-[280px] mx-auto">
              {cameraErr}
            </p>
          )}
        </div>
      )}

      {/* ─── CAMERA: 실시간 카메라 + 가이드 오버레이 ─────────────── */}
      {mode === 'camera' && (
        <div className="space-y-2.5">
          <div
            className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black"
            style={{ aspectRatio: '9/16', maxWidth: 280 }}
          >
            {/* 카메라 프리뷰 */}
            <video
              ref={videoRef}
              playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* 가이드 프레임 오버레이 */}
            <GuideFrame scanState={scanState} />

            {/* GOOD/OK/BAD 상태 배지 — 상단 */}
            <div className="absolute top-4 inset-x-4 flex justify-center">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm"
                style={{ backgroundColor: `${sc.color}cc`, color: 'white' }}
              >
                {scanState === 'GOOD' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {scanState === 'OK'   && <AlertTriangle className="w-3.5 h-3.5" />}
                {scanState === 'BAD'  && <XCircle        className="w-3.5 h-3.5" />}
                {sc.label}
              </div>
            </div>

            {/* 촬영 버튼 영역 — 하단 */}
            <div
              className="absolute bottom-0 inset-x-0 pb-5 pt-10 flex flex-col items-center gap-2"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
            >
              {/* 위치 조정 안내 (GOOD 아닐 때) */}
              {scanState !== 'GOOD' && (
                <p className="text-[10px] text-white/80 font-medium px-4 text-center mb-1">
                  {sc.sub}
                </p>
              )}

              {/* 촬영 버튼 */}
              <button
                type="button"
                onClick={capture}
                disabled={scanState !== 'GOOD'}
                aria-label="촬영"
                className="transition-all"
                style={{
                  width:  56, height: 56,
                  borderRadius: '50%',
                  border: '3.5px solid white',
                  backgroundColor: scanState === 'GOOD' ? 'white' : 'rgba(255,255,255,0.25)',
                  cursor: scanState === 'GOOD' ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: scanState === 'GOOD' ? 'scale(1)' : 'scale(0.88)',
                  boxShadow: scanState === 'GOOD' ? '0 0 0 4px rgba(34,197,94,0.35)' : 'none',
                }}
              >
                {scanState === 'GOOD'
                  ? <Camera className="w-7 h-7 text-gray-800" />
                  : <Loader2 className="w-5 h-5 text-white animate-spin" />
                }
              </button>

              <button type="button" onClick={() => { stopCamera(); setMode('idle') }}
                className="text-white/60 text-[10px] hover:text-white transition mt-1">
                취소
              </button>
            </div>
          </div>

          {/* 스캔 상태 상세 */}
          <div
            className="rounded-xl border px-4 py-3 text-center"
            style={{ maxWidth: 280, margin: '0 auto', backgroundColor: sc.bg, borderColor: sc.border }}
          >
            <p className="text-xs font-semibold" style={{ color: sc.color }}>{sc.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: sc.color }}>{sc.sub}</p>
          </div>
        </div>
      )}

      {/* ─── UPLOAD: 파일 선택 → 품질 검사 진행 중 ──────────────── */}
      {mode === 'upload' && (
        <div
          className="w-full mx-auto flex flex-col items-center justify-center gap-4 rounded-2xl border border-blue-100 bg-blue-50"
          style={{ aspectRatio: '9/16', maxWidth: 280, maxHeight: 420 }}
        >
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <div className="text-center px-4">
            <p className="text-sm font-bold text-blue-800">AI 이미지 품질 검사 중</p>
            <p className="text-xs text-blue-500 mt-1 leading-relaxed">
              전신 포함 여부 · 정렬 · 비율 분석 중...
            </p>
          </div>
          {/* 검사 항목 진행 애니메이션 */}
          <div className="space-y-1.5 w-full px-8">
            {['전신 포함 확인', '사람 중심 정렬', '좌우 잘림 확인', '이미지 비율'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-200 animate-pulse flex-shrink-0"
                     style={{ animationDelay: `${i * 0.2}s` }} />
                <span className="text-[11px] text-blue-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── DONE: 결과 표시 ──────────────────────────────────────── */}
      {mode === 'done' && fullBodyPreview && (
        <div className="space-y-3" style={{ maxWidth: 280, margin: '0 auto' }}>

          {/* 사진 미리보기 */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
               style={{ aspectRatio: '9/16' }}>
            <img
              src={fullBodyPreview.previewUrl}
              alt="전신 사진"
              className="w-full h-full object-cover object-top"
            />

            {/* 검사 중 오버레이 */}
            {checking && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
                <p className="text-white text-xs font-semibold">품질 검사 중...</p>
              </div>
            )}

            {/* 검사 완료 뱃지 */}
            {!checking && quality && (
              <div className="absolute top-3 left-3">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-white text-[10px] font-bold shadow"
                  style={{ backgroundColor: quality.pass ? '#16a34a' : '#dc2626' }}
                >
                  {quality.pass
                    ? <CheckCircle2 className="w-3 h-3" />
                    : <XCircle      className="w-3 h-3" />
                  }
                  {quality.pass ? 'GOOD' : 'BAD'}
                </div>
              </div>
            )}
          </div>

          {/* 품질 검사 결과 패널 */}
          {!checking && quality && <QualityPanel result={quality} />}

          {/* 하단 액션 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {quality?.pass ? '다시 촬영' : '재업로드'}
            </button>
            <button
              type="button"
              disabled={!quality?.pass}
              className="py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
              style={{
                backgroundColor: quality?.pass ? '#2563eb' : '#d1d5db',
                cursor: quality?.pass ? 'pointer' : 'not-allowed',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {quality?.pass ? '사진 확정' : '검사 실패'}
            </button>
          </div>
        </div>
      )}

      {/* 숨김 파일 input & 캔버스 */}
      <canvas ref={canvasRef} className="hidden" />
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
