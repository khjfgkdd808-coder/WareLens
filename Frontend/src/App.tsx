/**
 * App.tsx
 * 라우팅 구성
 *
 * 변경:
 *  - /result (taskId 없음): 진행 중인 분석이 있으면 해당 결과로, 없으면 홈으로 리다이렉트
 *  - /signup: 회원가입 기능 사용 예정 없음 → 홈으로 리다이렉트 (페이지/코드 파일은 유지)
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Header      from '@/components/common/Header'
import Toast       from '@/components/common/Toast'
import ErrorModal  from '@/components/common/ErrorModal'
import HomePage    from '@/pages/HomePage'
import LoadingPage from '@/pages/LoadingPage'
import ResultPage  from '@/pages/ResultPage'

/** /result (taskId 없는 경로) 진입 시 처리 */
function ResultIndexRedirect() {
  const taskId = useAppStore((s) => s.taskId)
  return <Navigate to={taskId ? `/result/${taskId}` : '/'} replace />
}

export default function App() {
  const { errorModalCode, errorModalRetry, closeErrorModal } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route path="/"                element={<HomePage />}   />
        <Route path="/upload"          element={<Navigate to="/" replace />} />
        <Route path="/loading/:taskId" element={<LoadingPage />} />
        <Route path="/result"          element={<ResultIndexRedirect />} />
        <Route path="/result/:taskId"  element={<ResultPage />} />
        {/* 회원가입: 현재 서비스 흐름에서 사용 예정 없음 → 홈으로 리다이렉트 */}
        <Route path="/signup"          element={<Navigate to="/" replace />} />
        <Route path="/mypage"          element={<Navigate to="/" replace />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>

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
