/**
 * HomePage.tsx — AI 추천 시작 화면 (좌우 2컬럼)
 *
 * 변경 핵심 (이번 라운드):
 *  - 전신사진: "체형 분석" 보조설명 → "추천 정확도를 위한 체형 분석" 메인 카피로 변경
 *    + 촬영 가이드(좋은 사진/피해야 할 사진)를 오른쪽 별도 영역으로 배치
 *  - 취향 이미지: 보조 기능(접기/펼치기)이 아니라
 *    "나의 스타일 등록" 핵심 입력값으로 격상, 항상 노출, +1 +2 +3 슬롯 UI
 *  - 하단 진행 영역: 단순 점(dot) 표시 → STEP 1/2/3 카드형 진행 UI
 *
 * 기능 로직(업로드·검증·상태·API)은 기존 그대로 유지
 */
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, CheckCircle2, Plus, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import { validateImageFile } from '@/utils/helpers'

const GOOD_TIPS = ['정면', '전신 노출', '밝은 배경', '몸 형태가 보이는 옷']
const BAD_TIPS  = ['측면', '거울 셀카', '발끝 잘림', '배경과 인물 구분 어려움']

/* ── STEP 진행 카드 (1/3 2/3 3/3 영역 개선) ─────────────────── */
function StepProgress({ steps }: { steps: { label: string; sub: string; done: boolean }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => (
        <div
          key={s.label}
          className="rounded-xl px-3 py-2.5 transition-all"
          style={{
            backgroundColor: s.done ? '#eff6ff' : '#f9fafb',
            border: s.done ? '1.5px solid #93c5fd' : '1.5px solid #e5e7eb',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{
                backgroundColor: s.done ? '#2563eb' : '#e5e7eb',
                color:           s.done ? '#ffffff'  : '#9ca3af',
              }}
            >
              {s.done ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : i + 1}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: s.done ? '#2563eb' : '#9ca3af' }}>
              STEP {i + 1}
            </span>
          </div>
          <p className="text-xs font-semibold leading-tight"
             style={{ color: s.done ? '#1e3a8a' : '#6b7280' }}>
            {s.label}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: s.done ? '#3b82f6' : '#9ca3af' }}>
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── 나의 스타일 등록 (취향 이미지) — 핵심 입력 영역 ─────────── */
function StyleRegister() {
  const { clothingPreviews, addClothingImage, removeClothingImage, addToast } = useAppStore()
  const MAX = 3

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, MAX - clothingPreviews.length)
    for (const f of arr) {
      const err = validateImageFile(f)
      if (err) { addToast('error', err); return }
      addClothingImage(f)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-gray-50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
               style={{
                 backgroundColor: clothingPreviews.length > 0 ? '#dcfce7' : '#fef3c7',
               }}>
            {clothingPreviews.length > 0 ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />
            ) : (
              <Sparkles className="w-4 h-4" style={{ color: '#d97706' }} />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              나의 스타일 등록
              <span className="ml-2 text-xs font-semibold text-amber-600">추천 핵심 입력값</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              좋아하는 옷을 등록하면 AI가 비슷한 스타일을 추천합니다
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* + + + 슬롯 (최소 1 ~ 최대 3) */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: MAX }).map((_, i) => {
            const item = clothingPreviews[i]
            if (item) {
              return (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-200 group">
                  <img src={item.previewUrl} alt={`스타일 ${i + 1}`}
                    className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeClothingImage(item.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            }
            return (
              <label key={i}
                className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                style={{ borderColor: '#d1d5db', backgroundColor: '#fafafa' }}
              >
                <Plus className="w-5 h-5 text-gray-300" />
                <span className="text-[10px] text-gray-400 font-medium">{i + 1}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3 text-center">
          최소 1개 ~ 최대 3개 등록 가능 · 등록하지 않아도 추천은 가능합니다
        </p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const {
    clothingPreviews, fullBodyPreview, userInfo,
    photoValidationStatus,
    setUserInfoError, clearUserInfoErrors,
    addToast, isUploadReady,
  } = useAppStore()

  const ready = isUploadReady()

  const steps = [
    { label: '스타일 분석',  sub: clothingPreviews.length > 0 ? '완료' : '선택사항', done: clothingPreviews.length > 0 },
    { label: '체형 분석',    sub: photoValidationStatus === 'success' ? '완료' : '대기', done: photoValidationStatus === 'success' },
    { label: '추천 생성',    sub: ready ? '준비 완료' : '대기', done: ready },  ]

  // AI 처리(uploadImages 호출)는 더 이상 여기서 하지 않습니다.
  // 여기서는 입력값 검증만 하고, 실제 업로드+분석 대기는 LoadingPage에서 수행합니다.
  const handleSubmit = () => {
    clearUserInfoErrors()
    if (!fullBodyPreview)                       { addToast('error', '전신 사진을 등록해 주세요.'); return }
    if (photoValidationStatus === 'validating') { addToast('warning', 'AI 사진 검증이 완료될 때까지 기다려 주세요.'); return }
    if (photoValidationStatus !== 'success')    { addToast('error', '전신 사진 AI 검증을 통과해야 합니다.'); return }
    if (!userInfo.height) { setUserInfoError('height', '키를 입력해 주세요.'); return }

    navigate('/loading')
  }

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-32">

        {/* ── Hero ── */}
        <div className="text-center space-y-2 pb-8">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />AI 취향 + 체형 기반 추천
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
            나에게 어울리는 옷,<br/>
            <span style={{ color: '#2563eb' }}>AI가 찾아드립니다</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            좋아하는 스타일과 체형 정보를 등록하면<br/>
            AI가 취향과 체형에 맞는 의류를 추천합니다
          </p>
        </div>

        {/* ── 좌(전신사진) / 우(스타일 등록 + 신체정보) ──
             items-stretch: lg 2컬럼일 때 두 그리드 아이템의 높이를 같은 행(row) 기준으로 맞춤
             (grid-cols-1이 되는 모바일/태블릿에서는 각 아이템이 자기 행에 단독으로 배치되므로
              stretch가 자연 높이 그대로 적용되어 부작용 없음) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* ══ 왼쪽: 전신 사진 + 촬영 가이드 ══════════════════
               h-full + flex flex-col: 오른쪽 컬럼과 같은 높이로 늘어난 만큼을
               아래 content 영역(flex-1)이 흡수하도록 함 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                     style={{ backgroundColor: photoValidationStatus === 'success' ? '#dcfce7' : '#eff6ff' }}>
                  {photoValidationStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />
                  ) : (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
                <div>
                  {/* 체형분석 강조 → "추천 정확도를 위한 체형 분석"으로 변경 */}
                  <h2 className="text-base font-bold text-gray-900">
                    내 체형 분석
                    <span className="ml-2 text-xs font-semibold text-red-500">필수</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    추천 정확도를 위해 전신사진을 등록해주세요
                  </p>
                </div>
              </div>
            </div>

            {/* 본문: photo / guide / quality / actions 4개 영역을 가진 grid
                 (레이아웃 정의는 index.css의 .body-analysis-grid 참고)
                 - FullBodyUploadZone은 루트가 display:contents 라서
                   그 자식들(ga-photo/ga-quality/ga-actions)이 이 grid에 직접 배치됨
                 - flex-1: 카드가 오른쪽 컬럼 높이에 맞춰 늘어날 때 남는 공간을 흡수 */}
            <div className="px-6 py-5 body-analysis-grid flex-1">
              <FullBodyUploadZone />

              {/* 촬영 가이드 — 우측 상단 영역 */}
              <div className="ga-guide space-y-3 min-w-0">
                <div>
                  <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />좋은 사진
                  </p>
                  <ul className="space-y-1">
                    {GOOD_TIPS.map((tip) => (
                      <li key={tip} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />{tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-500 mb-1.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />피해야 하는 사진
                  </p>
                  <ul className="space-y-1">
                    {BAD_TIPS.map((tip) => (
                      <li key={tip} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-1 h-1 rounded-full bg-red-300 flex-shrink-0" />{tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ══ 오른쪽: 나의 스타일 등록(핵심) + 신체 정보 ════════
               h-full + justify-between: 왼쪽 카드가 더 커져 컬럼 전체 높이가 늘어나면
               두 카드 사이 간격(gap)이 넓어지며 여유 공간을 흡수 → 오른쪽 컬럼 하단이
               항상 왼쪽 카드 하단과 같은 위치에 맞춰짐 */}
          <div className="h-full flex flex-col gap-6 justify-between">

            {/* 나의 스타일 등록 — 핵심 입력값으로 격상, 항상 노출 */}
            <StyleRegister />

            {/* 신체 정보 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{
                         backgroundColor: userInfo.height > 0 && userInfo.weight > 0 ? '#dcfce7' : '#fafafa',
                         border: '1px solid #e5e7eb',
                       }}>
                    {userInfo.height > 0 && userInfo.weight > 0 ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      신체 정보<span className="ml-2 text-xs font-semibold text-red-500">필수</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">정확한 사이즈 추천을 위해 입력해 주세요</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <BodyInfoForm />
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 진행 (1/3 2/3 3/3 영역 개선) ── */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-700 mb-3">추천 준비 과정</p>
          <StepProgress steps={steps} />
        </div>

        <div className="mt-6">
          <NoticeCard />
        </div>
      </main>

      {/* ── Sticky CTA Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50"
           style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="h-0.5 bg-gray-100">
          <div className="h-full transition-all duration-500"
               style={{
                 width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%`,
                 backgroundColor: ready ? '#22c55e' : '#3b82f6',
               }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4"
             style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}>
          <p className="text-xs text-gray-500 font-medium">
            {!fullBodyPreview
              ? '전신 사진을 등록해 주세요'
              : photoValidationStatus !== 'success'
              ? '사진 AI 검증 중...'
              : !userInfo.height
              ? '신체 정보(키)를 입력해 주세요'
              : 'AI 추천 준비 완료!'}
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl font-bold transition-all duration-150"
            style={{
              padding: '12px 24px', fontSize: '14px', border: 'none',
              cursor: 'pointer',
              backgroundColor: ready ? '#2563eb' : '#e5e7eb',
              color:           ready ? '#ffffff'  : '#9ca3af',
              boxShadow: ready ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles className="w-4 h-4" />AI 추천 받기<ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom)', backgroundColor: 'rgba(255,255,255,0.96)' }} />
      </div>
    </>
  )
}