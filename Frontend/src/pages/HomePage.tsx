import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Target, Crosshair, ArrowRight, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import ClothingImageGrid  from '@/components/upload/ClothingImageGrid'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import { uploadImages }   from '@/api/mockApi'

// ── 서비스 안내 카드 정의 ─────────────────────────────────────
// available: false → Coming Soon 완전 차단 (CSS + JS + tabIndex)
const SERVICE_CARDS = [
  {
    available: true,
    title: '취향 분석',
    desc: '업로드한 이미지의 스타일, 색상, 패턴을 AI가 분석하여 나의 취향을 파악합니다.',
    Icon: Target,
    iconColor: 'text-brand-500',
    bgColor:   'bg-brand-50',
  },
  {
    available: false,
    title: '체형 분석',
    desc: '전신 사진과 신체 정보를 바탕으로 BMI, 체형 특성, 추천 사이즈를 분석합니다.',
    Icon: Crosshair,
    iconColor: 'text-gray-300',
    bgColor:   'bg-gray-100',
  },
  {
    available: false,
    title: '정확한 분석',
    desc: '취향과 체형 정보를 종합하여 나에게 가장 잘 어울리는 의류를 추천해 드립니다.',
    Icon: Crosshair,
    iconColor: 'text-gray-300',
    bgColor:   'bg-gray-100',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const {
    clothingPreviews, fullBodyPreview, userInfo,
    bodyPhotoChecklist,
    setUserInfoError, clearUserInfoErrors,
    setTaskId, showGlobalLoading, hideGlobalLoading,
    addToast, isUploadReady, isChecklistDone,
  } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const ready     = isUploadReady()
  const checkDone = isChecklistDone()

  const requirementChecks = [
    { done: clothingPreviews.length > 0,                label: `의류 이미지 (${clothingPreviews.length}/1장 이상)` },
    { done: !!fullBodyPreview,                           label: '전신 사진'                                        },
    { done: checkDone,                                   label: '전신사진 체크리스트'                              },
    { done: userInfo.height > 0 && userInfo.weight > 0, label: '신체 정보 (키·몸무게)'                            },
  ]

  const handleSubmit = async () => {
    clearUserInfoErrors()
    if (clothingPreviews.length === 0) { addToast('error', '의류 이미지를 1장 이상 업로드해 주세요.'); return }
    if (!fullBodyPreview)              { addToast('error', '전신 사진을 업로드해 주세요.'); return }
    if (!checkDone)                    { addToast('warning', '전신사진 체크리스트를 모두 확인해 주세요.'); return }
    if (!userInfo.height)              { setUserInfoError('height', '키를 입력해 주세요.'); return }
    if (!userInfo.weight)              { setUserInfoError('weight', '몸무게를 입력해 주세요.'); return }

    setIsSubmitting(true)
    showGlobalLoading('이미지를 업로드하고 있습니다...')
    try {
      const fd = new FormData()
      clothingPreviews.forEach((p) => fd.append('clothingImages', p.file))
      fd.append('fullBodyImage', fullBodyPreview.file)
      fd.append('userInfo', JSON.stringify(userInfo))
      const { taskId } = await uploadImages(fd)
      setTaskId(taskId)
      navigate(`/loading/${taskId}`)
    } catch {
      addToast('error', '업로드에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
      hideGlobalLoading()
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* ── Hero ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 leading-snug">
            AI 체형 분석 &amp; 패션 추천
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">나에게 딱 맞는 핏과 스타일을 찾아보세요!</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-0.5">
          <svg className="w-12 h-12 text-brand-100" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
          </svg>
          <svg className="w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
      </div>

      {/* ── 메인 카드 ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">

        {/* 섹션 1: 의류 이미지 */}
        <section className="p-6">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">
            1. 선호하는 의류 이미지 업로드
            <span className="font-normal text-gray-400 ml-1">(최대 5장)</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">평소 선호하는 스타일의 의류 이미지를 업로드해 주세요.</p>
          <ClothingImageGrid />
        </section>

        {/* 섹션 2+3: 전신사진 | 신체정보 */}
        <section className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">2. 전신 사진 업로드</p>
              <p className="text-xs text-gray-400 mb-4">정면이 잘 보이는 전신 사진을 업로드해 주세요.</p>
              <FullBodyUploadZone />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">3. 신체 정보 입력</p>
              <p className="text-xs text-gray-400 mb-4">정확한 체형 분석을 위해 정보를 입력해 주세요.</p>
              <BodyInfoForm />
            </div>
          </div>
        </section>

        {/* 섹션 4: 서비스 안내 */}
        <section className="p-6">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">4. 서비스 안내</p>
          <p className="text-xs text-gray-400 mb-4">WareLens가 제공하는 분석 서비스를 확인해 보세요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICE_CARDS.map((card) => {
              const { Icon } = card

              if (card.available) {
                // ── 활성 카드 ──────────────────────────────────────
                return (
                  <div key={card.title}
                    className="relative flex flex-col items-center text-center p-5 rounded-xl border bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm transition">
                    <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center mb-3`}>
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1.5">{card.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>
                )
              }

              // ── 비활성 카드: CSS + tabIndex=-1 + onClick 완전 차단 ──
              return (
                <div
                  key={card.title}
                  aria-disabled="true"
                  tabIndex={-1}                      // 탭 포커스 차단
                  onClick={(e) => e.preventDefault()} // JS 클릭 차단
                  onKeyDown={(e) => e.preventDefault()} // 키보드 Enter 차단
                  className="card-disabled relative flex flex-col items-center text-center p-5 rounded-xl border bg-[#F5F5F5] border-gray-100 opacity-55 cursor-not-allowed"
                  style={{ pointerEvents: 'none' }}   // CSS 이벤트 차단
                >
                  {/* Coming Soon 배지 */}
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                    <Lock className="w-2 h-2" />
                    Coming Soon
                  </span>

                  <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center mb-3 grayscale`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-400 mb-1.5">{card.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA 영역 */}
        <div className="px-6 py-5 bg-gray-50/60">
          {/* 미완성 체크리스트 */}
          {!ready && (
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {requirementChecks.map((c) => (
                <span key={c.label}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                    c.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                  {c.done ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !ready}
            className={[
              'w-full py-4 rounded-xl text-[15px] font-semibold',
              'flex items-center justify-center gap-2 transition-all duration-150',
              ready && !isSubmitting
                ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" />업로드 중...</>
            ) : (
              <>분석 및 추천 받기 <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          {ready && !isSubmitting && (
            <p className="text-center text-xs text-gray-400 mt-2">분석에는 약 30초~1분이 소요됩니다.</p>
          )}
        </div>
      </div>

      <NoticeCard />
      <div className="h-2" />
    </main>
  )
}
