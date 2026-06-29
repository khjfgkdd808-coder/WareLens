import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Target, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import ClothingImageGrid  from '@/components/upload/ClothingImageGrid'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import { uploadImages }   from '@/api/mockApi'

// ── 서비스 안내 카드 ──────────────────────────────────────────
const SERVICE_CARDS = [
  {
    available: true,
    title: '취향 분석',
    desc: '업로드한 이미지의 스타일·색상·패턴을 AI가 분석하여 나의 취향을 파악합니다.',
    icon: <Target className="w-6 h-6 text-brand-500" />,
    bg: 'bg-brand-50',
  },
  {
    available: false,
    title: '체형 분석',
    desc: '전신 사진과 신체 정보를 바탕으로 BMI·체형·추천 사이즈를 분석합니다.',
    icon: (
      // MediaPipe 스켈레톤 느낌 아이콘
      <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4" r="2"/>
        <line x1="12" y1="6" x2="12" y2="14"/>
        <line x1="12" y1="10" x2="8"  y2="13"/>
        <line x1="12" y1="10" x2="16" y2="13"/>
        <line x1="12" y1="14" x2="9"  y2="20"/>
        <line x1="12" y1="14" x2="15" y2="20"/>
      </svg>
    ),
    bg: 'bg-gray-100',
  },
  {
    available: false,
    title: '정확한 분석',
    desc: '취향과 체형 정보를 종합하여 나에게 가장 잘 어울리는 의류를 추천합니다.',
    icon: (
      // CLIP 매칭 그래프 느낌 아이콘
      <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 13 15 21 7"/>
        <line x1="3" y1="21" x2="21" y2="21"/>
        <line x1="3" y1="3"  x2="3"  y2="21"/>
      </svg>
    ),
    bg: 'bg-gray-100',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const {
    clothingPreviews, fullBodyPreview, userInfo,
    photoValidation,
    setUserInfoError, clearUserInfoErrors,
    setTaskId, showGlobalLoading, hideGlobalLoading,
    addToast, isUploadReady,
  } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const ready = isUploadReady()

  // 진행 단계 계산 (Sticky Bar용)
  const completedSteps = [
    clothingPreviews.length > 0,
    fullBodyPreview !== null && photoValidation.status === 'success',
    userInfo.height > 0 && userInfo.weight > 0,
  ]
  const stepCount = completedSteps.filter(Boolean).length

  const handleSubmit = async () => {
    clearUserInfoErrors()
    if (clothingPreviews.length === 0) { addToast('error', '의류 이미지를 1장 이상 업로드해 주세요.'); return }
    if (!fullBodyPreview)              { addToast('error', '전신 사진을 업로드해 주세요.'); return }
    if (photoValidation.status !== 'success') { addToast('warning', 'AI 사진 검증이 완료되지 않았어요.'); return }
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
    // pb-24: Sticky Bar 공간 확보
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-5 relative">

      {/* ── 은은한 배경 워터마크 ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <svg className="absolute -top-20 -right-20 w-96 h-96 text-brand-500 opacity-[0.03]" viewBox="0 0 100 100" fill="currentColor">
          <text x="10" y="80" fontSize="60" fontWeight="bold">W</text>
        </svg>
        <svg className="absolute bottom-10 -left-10 w-64 h-64 text-brand-500 opacity-[0.03]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}>
          <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
        </svg>
      </div>

      <div className="relative z-10 space-y-5">

        {/* ── Hero ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 leading-snug">
              AI 체형 분석 &amp; 패션 추천
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">나에게 딱 맞는 핏과 스타일을 찾아보세요!</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
            <svg className="w-11 h-11 text-brand-100" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
            </svg>
            <svg className="w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        {/* ── 메인 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">

          {/* 섹션 1: 선호 의류 이미지 업로드 */}
          <section className="p-6">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              1. 선호하는 의류 이미지 업로드
              <span className="font-normal text-gray-400 ml-1">(최대 5장)</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">평소 선호하는 스타일의 의류 이미지를 업로드해 주세요.</p>
            <ClothingImageGrid />
          </section>

          {/* 섹션 2+3: 전신사진 | 신체정보 — 좌우 Split Layout */}
          <section className="p-6">
            {/* PC: 2열 / 모바일: 1열 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* 전신사진 — 좌 */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">2. 전신 사진 업로드</p>
                <p className="text-xs text-gray-400 mb-4">정면이 잘 보이는 전신 사진을 업로드해 주세요.</p>
                <FullBodyUploadZone />
              </div>
              {/* 신체정보 — 우 */}
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
              {SERVICE_CARDS.map((card) => (
                card.available ? (
                  /* 활성 카드 */
                  <div key={card.title}
                    className="relative flex flex-col items-center text-center p-5 rounded-xl border bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm transition">
                    <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                      {card.icon}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-1.5">{card.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>
                ) : (
                  /* 비활성 카드 — 완전 차단 */
                  <div key={card.title}
                    aria-disabled="true"
                    tabIndex={-1}
                    className="card-disabled relative flex flex-col items-center text-center p-5 rounded-xl border bg-[#F5F5F5] border-gray-100 opacity-55 cursor-not-allowed"
                    style={{ pointerEvents: 'none' }}>
                    <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 text-[9px] font-bold uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                      <Lock className="w-2 h-2" /> Coming Soon
                    </span>
                    <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-3 grayscale`}>
                      {card.icon}
                    </div>
                    <p className="text-sm font-semibold text-gray-400 mb-1.5">{card.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                  </div>
                )
              ))}
            </div>
          </section>
        </div>

        <NoticeCard />
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">

          {/* 왼쪽: Step Indicator */}
          <div className="flex items-center gap-2 flex-1">
            {['의류 이미지', '전신 사진', '신체 정보'].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  completedSteps[i] ? 'bg-brand-600' : 'bg-gray-200'
                }`}>
                  {completedSteps[i]
                    ? <CheckCircle2 className="w-3 h-3 text-white" />
                    : <span className="text-[9px] font-bold text-gray-400">{i + 1}</span>
                  }
                </div>
                <span className={`text-xs hidden sm:inline ${completedSteps[i] ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < 2 && <span className="text-gray-200 text-xs">›</span>}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-1">({stepCount}/3)</span>
          </div>

          {/* 오른쪽: CTA 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !ready}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              ready && !isSubmitting
                ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />업로드 중...</>
              : <><span className="hidden sm:inline">분석 및 추천 받기</span><span className="sm:hidden">분석 시작</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </div>
      </div>
    </main>
  )
}
