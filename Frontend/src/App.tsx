import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Header         from '@/components/common/Header'
import Toast          from '@/components/common/Toast'
import ErrorModal     from '@/components/common/ErrorModal'
import HomePage       from '@/pages/HomePage'
import LoadingPage    from '@/pages/LoadingPage'
import ResultPage     from '@/pages/ResultPage'
import SignupPage     from '@/pages/SignupPage'


function ResultIndexRedirect() {
  const taskId = useAppStore((s) => s.taskId)
  return <Navigate to={taskId ? `/result/${taskId}` : '/'} replace />
}


export default function App() {
  const { errorModalCode, errorModalRetry, closeErrorModal } = useAppStore()

  return (
    /*
     * ── 앱 전체 높이 기준점 ──
     * min-h-screen(최소 높이)이 아니라 h-screen(확정된 뷰포트 높이)을 사용해야
     * 아래 자식들의 h-full/flex-1이 실제로 의미를 가짐.
     * overflow-hidden: 문서(body) 레벨 스크롤은 없애고, 아래 래퍼가 유일한 스크롤 주체가 됨.
     */
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      <Header />

      {/*
       * ── 앱의 유일한 스크롤 소유자 ──
       * flex-1: Header를 제외한 남은 높이를 모두 차지 (확정된 높이)
       * min-h-0: flex 아이템 기본값(min-height:auto)을 무력화해 실제로 줄어들 수 있게 함
       * overflow-y-auto: 이 래퍼 안에서 페이지별로 스크롤
       *
       * HomePage/SignupPage 등 기존에 페이지 전체가 길어서 스크롤되던 페이지는
       * 이 래퍼가 대신 스크롤되므로 겉보기 동작은 동일하게 유지됨.
       * ResultPage처럼 내부에서 자체적으로 높이를 100% 채우는 페이지는
       * 이 래퍼 안에서 자체 스크롤(우측 리스트)만 동작하고 래퍼 자체는 스크롤되지 않음.
       */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Routes>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/upload"           element={<Navigate to="/" replace />} />
          <Route path="/loading"          element={<LoadingPage />} />
          <Route path="/result"           element={<ResultIndexRedirect />} />
          <Route path="/result/:taskId"   element={<ResultPage />} />

          {/* 회원가입 */}
          <Route path="/signup"           element={<SignupPage />} />

          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Toast />

      <ErrorModal
        isOpen={errorModalCode !== null}
        errorCode={errorModalCode}
        onClose={closeErrorModal}
        onRetry={errorModalRetry ?? undefined}
      />

    </div>
  )
}