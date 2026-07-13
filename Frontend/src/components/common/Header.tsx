/**
 * Header.tsx
 * 헤더 메뉴: 홈 / 추천 결과
 * 로그인 상태 및 회원가입 기능 포함
 */

import { Link, NavLink } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'

export default function Header() {
  const { isLoggedIn, authUser, logout, addToast } = useAppStore()

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors pb-0.5 whitespace-nowrap ${
      isActive
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-500 hover:text-gray-900'
    }`

  const handleLogout = () => {
    logout()
    addToast('success', '로그아웃됐습니다.')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* 로고 */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight select-none flex-shrink-0"
        >
          <span className="text-blue-600">Ware</span>
          <span className="text-gray-900">Lens</span>
        </Link>


        {/* 네비게이션 */}
        <nav className="hidden sm:flex items-center gap-7 flex-1 justify-center">

          <NavLink to="/" end className={navCls}>
            홈
          </NavLink>

          <NavLink to="/result" className={navCls}>
            추천 결과
          </NavLink>

        </nav>


        {/* 우측 로그인 / 회원가입 */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {isLoggedIn ? (
            <>
              <span className="hidden sm:inline text-sm text-gray-600 font-medium">
                {authUser?.nickname}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="
                  text-sm font-medium text-gray-500
                  border border-gray-200
                  px-3 py-1.5
                  rounded-lg
                  hover:bg-gray-50
                  transition
                "
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/signup"
              className="
                text-sm font-semibold text-white
                px-4 py-1.5
                rounded-lg
                transition
              "
              style={{ backgroundColor: '#2563eb' }}
            >
              회원가입
            </Link>
          )}

        </div>

      </div>


      {/* 모바일 네비게이션 */}
      <nav className="sm:hidden flex items-center justify-around border-t border-gray-100 px-2 py-2">

        <NavLink to="/" end className={navCls}>
          홈
        </NavLink>

        <NavLink to="/result" className={navCls}>
          추천 결과
        </NavLink>

        

      </nav>

    </header>
  )
}