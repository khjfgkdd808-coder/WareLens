import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Header      from '@/components/common/Header'
import Toast       from '@/components/common/Toast'
import ErrorModal  from '@/components/common/ErrorModal'
import HomePage    from '@/pages/HomePage'
import LoadingPage from '@/pages/LoadingPage'
import ResultPage  from '@/pages/ResultPage'
import SignupPage  from '@/pages/SignupPage'
import MyPage      from '@/pages/MyPage'

export default function App() {
  const { errorModalCode, errorModalRetry, closeErrorModal } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        {/* 기존 */}
        <Route path="/"                element={<HomePage />}   />
        <Route path="/upload"          element={<Navigate to="/" replace />} />
        <Route path="/loading/:taskId" element={<LoadingPage />} />
        <Route path="/result/:taskId"  element={<ResultPage />} />
        {/* 신규 */}
        <Route path="/signup"          element={<SignupPage />} />
        <Route path="/mypage"          element={<MyPage />} />
        {/* fallback */}
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>

      {/* 전역 Toast */}
      <Toast />

      {/* 전역 ErrorModal */}
      <ErrorModal
        isOpen={errorModalCode !== null}
        errorCode={errorModalCode}
        onClose={closeErrorModal}
        onRetry={errorModalRetry ?? undefined}
      />
    </div>
  )
}
