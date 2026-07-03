import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Header         from '@/components/common/Header'
import Toast          from '@/components/common/Toast'
import ErrorModal     from '@/components/common/ErrorModal'
import HomePage       from '@/pages/HomePage'
import LoadingPage    from '@/pages/LoadingPage'
import ResultPage     from '@/pages/ResultPage'   // Option 1 레이아웃

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
        <Route path="/"                element={<HomePage />} />
        <Route path="/upload"          element={<Navigate to="/" replace />} />
        <Route path="/loading/:taskId" element={<LoadingPage />} />
        <Route path="/result"          element={<ResultIndexRedirect />} />
        <Route path="/result/:taskId"  element={<ResultPage />} />
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
