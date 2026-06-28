import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Target, Crosshair, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import ClothingImageGrid  from '@/components/upload/ClothingImageGrid'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import { uploadImages }   from '@/api/mockApi'

const SERVICE_CARDS = [
  { available: true,  title: '취향 분석', desc: '업로드한 이미지의 스타일, 색상, 패턴을 AI가 분석하여 나의 취향을 파악합니다.', Icon: Target },
  { available: false, title: '체형 분석', desc: '전신 사진과 신체 정보를 바탕으로 체형 특성, 추천 사이즈를 분석합니다.',        Icon: Crosshair },
  { available: false, title: '정확한 분석', desc: '취향과 체형 정보를 종합하여 나에게 가장 잘 어울리는 의류를 추천해 드립니다.',  Icon: Crosshair },
]

/* Step Indicator — Sticky Bar 안에 표시 */
function StepIndicator({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
              style={{
                backgroundColor: step.done ? '#22c55e' : '#e5e7eb',
                color:           step.done ? '#ffffff'  : '#9ca3af',
              }}
            >
              {step.done ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : i + 1}
            </div>
            <span
              className="text-[10px] font-medium hidden sm:inline whitespace-nowrap"
              style={{ color: step.done ? '#15803d' : '#9ca3af' }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-3 sm:w-5 h-px flex-shrink-0"
              style={{ backgroundColor: step.done ? '#86efac' : '#e5e7eb' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const {
    clothingPreviews, fullBodyPreview, userInfo,
    photoValidationStatus,
    setUserInfoError, clearUserInfoErrors,
    setTaskId, showGlobalLoading, hideGlobalLoading,
    addToast, isUploadReady, openErrorModal,
  } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const ready = isUploadReady()

  // Step Indicator 데이터
  const steps = [
    { label: '의류 이미지',   done: clothingPreviews.length > 0 },
    { label: '전신 사진',     done: photoValidationStatus === 'success' },
    { label: '신체 정보',     done: userInfo.height > 0 && userInfo.weight > 0 },
  ]

  const handleSubmit = async () => {
    clearUserInfoErrors()

    // ── Inline 검사 (즉시 수정 가능한 항목) ──
    if (clothingPreviews.length === 0) { addToast('error', '의류 이미지를 1장 이상 업로드해 주세요.'); return }
    if (!fullBodyPreview)              { addToast('error', '전신 사진을 업로드해 주세요.'); return }
    if (photoValidationStatus === 'validating') { addToast('warning', 'AI 검증이 완료될 때까지 기다려 주세요.'); return }
    if (photoValidationStatus !== 'success')    { addToast('error',   '전신 사진 AI 검증을 통과해야 합니다.'); return }
    if (!userInfo.height) { setUserInfoError('height', '키를 입력해 주세요.'); return }
    if (!userInfo.weight) { setUserInfoError('weight', '몸무게를 입력해 주세요.'); return }

    setIsSubmitting(true)
    showGlobalLoading('AI가 이미지를 분석 중입니다...')
    try {
      const fd = new FormData()
      clothingPreviews.forEach((p) => fd.append('clothingImages', p.file))
      fd.append('fullBodyImage', fullBodyPreview.file)
      fd.append('userInfo', JSON.stringify(userInfo))
      const { taskId } = await uploadImages(fd)
      setTaskId(taskId)
      navigate(`/loading/${taskId}`)
    } catch {
      // 업로드 실패 → Modal
      openErrorModal('UPLOAD_FAILED', () => handleSubmit())
    } finally {
      setIsSubmitting(false)
      hideGlobalLoading()
    }
  }

  return (
    <>
      {/* ── 콘텐츠 영역 (하단 Sticky Bar 높이만큼 패딩) ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-5">

        {/* Hero */}
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 leading-snug">
            AI 체형 분석 &amp; 패션 추천
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">나에게 딱 맞는 핏과 스타일을 찾아보세요!</p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible divide-y divide-gray-100">

          {/* 섹션 1 */}
          <section className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              1. 선호하는 의류 이미지 업로드
              <span className="font-normal text-gray-400 ml-1">(최대 5장)</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">평소 선호하는 스타일의 의류 이미지를 업로드해 주세요.</p>
            <ClothingImageGrid />
          </section>

          {/* 섹션 2 */}
          <section className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">2. 전신 사진 업로드</p>
            <p className="text-xs text-gray-400 mb-4">정면이 잘 보이는 전신 사진을 업로드해 주세요.</p>
            <FullBodyUploadZone />
          </section>

          {/* 섹션 3 */}
          <section className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">3. 신체 정보 입력</p>
            <p className="text-xs text-gray-400 mb-4">정확한 체형 분석을 위해 정보를 입력해 주세요.</p>
            <BodyInfoForm />
          </section>

          {/* 섹션 4 */}
          <section className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">4. 서비스 안내</p>
            <p className="text-xs text-gray-400 mb-4">WareLens가 제공하는 분석 서비스를 확인해 보세요.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SERVICE_CARDS.map(({ available, title, desc, Icon }) => (
                available ? (
                  <div key={title}
                    className="flex flex-col items-center text-center p-5 rounded-xl border bg-white border-blue-100 hover:border-blue-300 hover:shadow-sm transition">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                      <Icon className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1.5">{title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ) : (
                  <div key={title}
                    className="relative flex flex-col items-center text-center p-5 rounded-xl border bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed select-none">
                    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                      <Lock className="w-2 h-2" />Coming Soon
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                      <Icon className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400 mb-1.5">{title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                )
              ))}
            </div>
          </section>
        </div>

        <NoticeCard />
      </main>

      {/* ══ Sticky Bottom Bar ══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* 진행 상태 바 */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%`,
              backgroundColor: ready ? '#22c55e' : '#3b82f6',
            }}
          />
        </div>

        {/* 본문 */}
        <div
          className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
        >
          {/* Step Indicator */}
          <div className="flex-shrink-0">
            <StepIndicator steps={steps} />
          </div>

          {/* 분석하기 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl font-semibold transition-all duration-150"
            style={{
              padding:         '10px 20px',
              fontSize:        '14px',
              border:          'none',
              cursor:          isSubmitting ? 'not-allowed' : 'pointer',
              backgroundColor: ready && !isSubmitting ? '#2563eb' : '#e5e7eb',
              color:           ready && !isSubmitting ? '#ffffff'  : '#9ca3af',
              boxShadow:       ready && !isSubmitting ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
              whiteSpace:      'nowrap',
            }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />업로드 중...</>
            ) : (
              <>분석 및 추천 받기 <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* 홈 인디케이터 여백 (iOS Safari) */}
        <div style={{ height: 'env(safe-area-inset-bottom)', backgroundColor: 'rgba(255,255,255,0.95)' }} />
      </div>
    </>
  )
}
