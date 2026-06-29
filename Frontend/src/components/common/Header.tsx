import { Link, NavLink, useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { logout as logoutApi } from '@/api/auth'

export default function Header() {
  const navigate     = useNavigate()
  const { isLoggedIn, authUser, logout, addToast } = useAppStore()

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors pb-0.5 ${
      isActive
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-500 hover:text-gray-900'
    }`

  const handleLogout = async () => {
    await logoutApi()
    logout()
    addToast('success', '로그아웃됐습니다.')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* 로고 */}
        <Link to="/" className="text-xl font-bold tracking-tight select-none flex-shrink-0">
          <span className="text-blue-600">Ware</span>
          <span className="text-gray-900">Lens</span>
        </Link>

        {/* 네비게이션 (PC) */}
        <nav className="hidden sm:flex items-center gap-7 flex-1 justify-center">
          <NavLink to="/" end className={navCls}>홈</NavLink>
          <NavLink to="/" className={navCls}
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            체형 분석
          </NavLink>
          {isLoggedIn && (
            <NavLink to="/mypage" className={navCls}>마이페이지</NavLink>
          )}
        </nav>

        {/* 우측 — 로그인 상태에 따라 분기 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLoggedIn ? (
            <>
              {/* 닉네임 + 마이페이지 버튼 */}
              <NavLink to="/mypage"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <span>{authUser?.nickname ?? '내 정보'}</span>
              </NavLink>
              {/* 모바일: 아이콘만 */}
              <NavLink to="/mypage"
                aria-label="마이페이지"
                className="sm:hidden w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <User className="w-4 h-4 text-gray-500" />
              </NavLink>
              {/* 로그아웃 */}
              <button
                onClick={handleLogout}
                aria-label="로그아웃"
                title="로그아웃"
                className="hidden sm:flex w-8 h-8 rounded-full bg-gray-100 items-center justify-center hover:bg-red-50 hover:text-red-500 transition text-gray-400"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* 회원가입 버튼 */}
              <Link to="/signup"
                className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition"
                style={{ backgroundColor: '#2563eb' }}>
                회원가입
              </Link>
              {/* 로그인 (아이콘 — 추후 로그인 페이지 연결) */}
              <button
                aria-label="로그인"
                title="로그인 (준비 중)"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition text-gray-500">
                <User className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
