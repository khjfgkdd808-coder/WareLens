import { Routes, Route, Navigate } from 'react-router-dom'
import Header      from '@/components/common/Header'
import Toast       from '@/components/common/Toast'
import HomePage    from '@/pages/HomePage'
import LoadingPage from '@/pages/LoadingPage'
import ResultPage  from '@/pages/ResultPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route path="/"                element={<HomePage />}   />
        <Route path="/upload"          element={<Navigate to="/" replace />} />
        <Route path="/loading/:taskId" element={<LoadingPage />} />
        <Route path="/result/:taskId"  element={<ResultPage />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </div>
  )
}
