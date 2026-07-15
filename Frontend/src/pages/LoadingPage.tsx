import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { uploadImages } from '@/api/mockApi'
import { ANALYSIS_ERROR_MESSAGES } from '@/utils/constants'
import LoadingProgress from '@/components/loading/LoadingProgress'
import type { AnalysisStatus } from '@/types'

// 연출용 진행 단계 (마지막 DONE 은 실제 업로드 응답이 도착했을 때만 반영)
const STEP_SEQUENCE: AnalysisStatus[] = [
  'UPLOADING', 'BODY_ANALYZING', 'STYLE_ANALYZING', 'GENERATING', 'DONE',
]

// body_analysis.data.size_analysis.final_size(숫자 사이즈) → 라벨 매핑
const SIZE_LABEL_MAP: Record<number, string> = {
  90: 'S', 95: 'M', 100: 'L', 105: 'XL', 110: '2XL',
}

export default function LoadingPage() {
  const navigate = useNavigate()
  const {
    clothingPreviews, fullBodyPreview, userInfo,
    analysisStatus, analysisErrorCode,
    setAnalysisStatus, setAnalysisError,
    setTaskId, setBodyAnalysis, setProducts, setTryOnImages, setTryOnClothing,
    setRecommendStatus,
    addToast, openErrorModal,
  } = useAppStore()

  const startedRef = useRef(false)
  // 취소 여부를 effect 호출마다 새로 만들어지는 지역 변수가 아니라 ref로 관리합니다.
  // → StrictMode가 mount→cleanup→mount를 동기적으로 두 번 실행해도, 실제로 살아있는
  //   인스턴스(마지막 mount)가 cancelledRef.current를 false로 되돌려 놓기 때문에,
  //   먼저 시작된 run()의 완료 콜백(setAnalysisStatus/navigate 등)이 항상 최신 취소 상태를
  //   올바르게 참조합니다.
  const cancelledRef = useRef(false)

  useEffect(() => {
    // HomePage를 거치지 않고 바로 진입한 경우 (필수 데이터 없음) → 홈으로
    if (!fullBodyPreview) { navigate('/', { replace: true }); return }

    // 이 effect 인스턴스는 "살아있다" → 직전(StrictMode 시뮬레이션) cleanup이
    // 세팅했을 수도 있는 취소 플래그를 취소합니다.
    cancelledRef.current = false

    let stepTimer: ReturnType<typeof setTimeout> | null = null
    let stepIndex = 0

    // 실제 완료 전까지 단계만 순차적으로 보여주는 연출 타이머 (DONE 직전까지만 진행)
    // 타이머는 매 effect 호출마다 새로 예약합니다. StrictMode의 1차 mount에서 예약된
    // 타이머는 곧바로 이어지는 cleanup에서 취소되고, 실제로 남는(2차) mount의 타이머만
    // 살아남아 화면 진행률을 정상적으로 갱신합니다.
    const advanceStep = () => {
      if (cancelledRef.current) return
      if (stepIndex < STEP_SEQUENCE.length - 1) {
        setAnalysisStatus(STEP_SEQUENCE[stepIndex])
        stepIndex += 1
        stepTimer = setTimeout(advanceStep, 1300)
      }
    }
    stepTimer = setTimeout(advanceStep, 500)

    // 실제 네트워크 요청(run)은 컴포넌트 생애주기 전체에서 단 한 번만 실행합니다.
    // (StrictMode 이중 mount에도 백엔드로 중복 업로드가 나가지 않도록 startedRef로 가드)
    if (!startedRef.current) {
      startedRef.current = true

      const run = async () => {
        try {
          const fd = new FormData()
          clothingPreviews.forEach((p) => fd.append('clothingImages', p.file))
          fd.append('fullBodyImage', fullBodyPreview.file)
          fd.append('userInfo', JSON.stringify(userInfo))

          // ── 실제 AI 처리(CLIP 추천 + MediaPipe 체형 분석 + Try-On)를
          //    여기서 기다립니다. 백엔드가 모든 결과를 한 번에 반환합니다. ──
          const res = await uploadImages(fd)
          if (cancelledRef.current) return

          if (stepTimer) clearTimeout(stepTimer)
          setAnalysisStatus('DONE')

          const taskId: string | undefined = res?.taskId
          if (taskId) setTaskId(taskId)

          // 1) 체형 분석 → 추천 사이즈
          const finalSize = res?.body_analysis?.data?.size_analysis?.final_size
          if (finalSize) {
            // NOTE: SIZE_LABEL_MAP은 '2XL'도 반환할 수 있는데, types/index.ts의
            // SizeLabel 유니온에는 '2XL'이 없어 타입이 어긋납니다 (기존 코드에도
            // 있던 사전 존재 불일치라 여기서는 캐스팅만 하고 타입 정의는 건드리지 않습니다).
            setBodyAnalysis({
              recommendedSize: {
                topNumeric: finalSize,
                top: SIZE_LABEL_MAP[finalSize] ?? '-',
              },
            } as any)
          }

          // 2) Try-On 원본 5장 (ResultPage에서 imageName으로 매칭해 사용)
          // [진단 로그] 백엔드가 실제로 몇 개의 사전 피팅 결과를 내려주는지 확인 (신규)
          console.log('[LoadingPage] top5_tryon_images.length:', res?.top5_tryon_images?.length ?? 0)
          console.log(
            '[LoadingPage] top5_tryon_images의 garment_info.image_name 목록:',
            (res?.top5_tryon_images ?? []).map((t: any) => t?.garment_info?.image_name),
          )
          console.log(
            '[LoadingPage] clip_recommendations의 image_name 목록(순서대로):',
            (res?.clip_recommendations?.recommendations ?? []).map((r: any) => r?.image_name),
          )
          setTryOnImages(res?.top5_tryon_images ?? [])

          // 3) CLIP 추천 → 상품 카드 데이터로 매핑
          const mappedProducts = (res?.clip_recommendations?.recommendations || []).map(
            (item: any, index: number) => ({
              id: String(index),
              name: item.article_type,
              imageUrl: `http://localhost:8080/fashion_images/${item.image_name}`,
              imageName: item.image_name,
              category: item.article_type,
              season: item.season?.toLowerCase(),
              similarityScore: item.clip_score * 100,
              color: item.color,
              fabric: item.fabric,
              fit: item.fit,
              usage: item.usage,
              reason: item.reason,
              isWishlisted: false,
            }),
          )
          setProducts(mappedProducts, mappedProducts.length, false)

          // 기본으로 보여줄 가상 피팅 = AI 추천률(similarityScore) 최고 상품
          if (mappedProducts.length > 0) {
            const top1 = mappedProducts.reduce(
              (best: any, cur: any) => (cur.similarityScore > best.similarityScore ? cur : best),
              mappedProducts[0],
            )
            setTryOnClothing(top1)
          }

          setRecommendStatus('success')
          setTimeout(() => {
            if (cancelledRef.current) return
            navigate(taskId ? `/result/${taskId}` : '/result')
          }, 600)
        } catch {
          if (cancelledRef.current) return
          if (stepTimer) clearTimeout(stepTimer)
          setAnalysisError('분석 중 오류가 발생했습니다.', 'UNKNOWN')
          setRecommendStatus('error')
          addToast('error', 'AI 분석 중 오류가 발생했습니다.')
          openErrorModal('ANALYSIS_FAILED', () => navigate('/'))
        }
      }

      run()
    }

    return () => {
      cancelledRef.current = true
      if (stepTimer) clearTimeout(stepTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isError = analysisStatus === 'ERROR'
  const errInfo = ANALYSIS_ERROR_MESSAGES[analysisErrorCode ?? 'UNKNOWN']

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* 카드 헤더 */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isError ? 'bg-red-50' : 'bg-blue-50'}`}>
              {isError ? (
                <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2a10 10 0 010 20" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{isError ? '분석 실패' : '스타일 분석 중'}</h1>
            <p className="text-sm text-gray-500 mt-1">{isError ? errInfo.desc : '잠시만 기다려 주세요.'}</p>
          </div>

          <LoadingProgress/>

          {/* 에러 시 재시도 버튼 */}
          {isError && (
            <button onClick={() => navigate('/')}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              {errInfo.action} →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}