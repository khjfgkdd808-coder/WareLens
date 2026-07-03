import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import ClothingImageGrid  from '@/components/upload/ClothingImageGrid'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import { uploadImages }   from '@/api/mockApi'

const GUIDE = [
  { emoji: '❤️', title: '취향 분석', desc: '업로드한 이미지의 스타일·색상을 AI가 분석합니다.' },
  { emoji: '👤', title: '체형 분석', desc: '전신 사진과 신체 정보로 BMI와 체형을 분석합니다.' },
  { emoji: '🎯', title: '정확한 분석', desc: '취향과 체형을 종합해 최적 의류를 추천합니다.' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const { clothingPreviews, fullBodyPreview, userInfo, userInfoErrors,
          setUserInfoError, clearUserInfoErrors, setTaskId,
          showGlobalLoading, hideGlobalLoading, addToast, isUploadReady } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    clearUserInfoErrors()
    if (clothingPreviews.length === 0) { addToast('error', '의류 이미지를 1장 이상 업로드해 주세요.'); return }
    if (!fullBodyPreview)              { addToast('error', '전신 사진을 업로드해 주세요.'); return }
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

  const ready = isUploadReady()

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI 체형 분석 &amp; 패션 추천</h1>
        <p className="text-sm text-gray-500 mt-1">나에게 딱 맞는 핏과 스타일을 찾아보세요!</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {/* 섹션 1: 의류 이미지 */}
        <section className="p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">1. 선호하는 의류 이미지 업로드 <span className="text-blue-600">(최대 5장)</span></h2>
            <p className="text-xs text-gray-400 mt-0.5">평소 선호하는 스타일의 의류 이미지를 업로드해 주세요.</p>
          </div>
          <ClothingImageGrid />
        </section>

        {/* 섹션 2+3: 전신사진 + 신체정보 */}
        <section className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">2. 전신 사진 업로드</h2>
                <p className="text-xs text-gray-400 mt-0.5">정면이 잘 보이는 전신 사진을 업로드해 주세요.</p>
              </div>
              <FullBodyUploadZone />
            </div>
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">3. 신체 정보 입력</h2>
                <p className="text-xs text-gray-400 mt-0.5">정확한 체형 분석을 위해 정보를 입력해 주세요.</p>
              </div>
              <BodyInfoForm />
            </div>
          </div>
        </section>

        {/* 섹션 4: 서비스 안내 */}
        <section className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">4. 서비스 안내</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GUIDE.map((g) => (
              <div key={g.title} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl">
                <span className="text-2xl mb-2">{g.emoji}</span>
                <p className="text-sm font-semibold text-gray-800 mb-1">{g.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 제출 버튼 */}
        <div className="px-6 py-5 bg-gray-50">
          {!ready && (
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {[
                { done: clothingPreviews.length > 0, label: `의류 이미지 (${clothingPreviews.length}/1장 이상)` },
                { done: !!fullBodyPreview,            label: '전신 사진' },
                { done: userInfo.height > 0 && userInfo.weight > 0, label: '신체 정보 (키·몸무게)' },
              ].map((c) => (
                <span key={c.label} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${c.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {c.done ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all
              ${ready && !isSubmitting ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-[0.99]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isSubmitting
              ? <><svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2a10 10 0 010 20" strokeLinecap="round"/></svg>업로드 중...</>
              : <>분석 및 추천 받기 →</>
            }
          </button>
          {ready && !isSubmitting && <p className="text-center text-xs text-gray-400 mt-2">분석에는 약 30초~1분이 소요됩니다.</p>}
        </div>
      </div>

      <div className="mt-4"><NoticeCard /></div>
    </main>
  )
}
