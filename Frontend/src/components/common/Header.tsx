/**
 * Header.tsx
 * 헤더 메뉴: 홈 / 체형 분석 / 추천 결과
 * 회원가입 기능 제거 (서비스 흐름 집중)
 */
import { Link, NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function Header() {
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors pb-0.5 whitespace-nowrap ${
      isActive
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-500 hover:text-gray-900'
    }`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* 로고 */}
        <Link to="/" className="text-xl font-bold tracking-tight select-none flex-shrink-0">
          <span className="text-blue-600">Ware</span>
          <span className="text-gray-900">Lens</span>
        </Link>

        {/* 네비게이션 — 홈 / 체형 분석 / 추천 결과 */}
        <nav className="hidden sm:flex items-center gap-7 flex-1 justify-center">
          <NavLink to="/" end className={navCls}>홈</NavLink>
          <NavLink to="/" className={navCls}
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            체형 분석
          </NavLink>
          {/* 추천 결과 — 현재 활성 taskId가 있을 때 강조됨 (라우트: /result/:taskId) */}
          <NavLink to="/result" className={navCls}>추천 결과</NavLink>
        </nav>

        {/* 우측 — 서비스 핵심 안내 (회원가입 제거) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline text-xs text-gray-400 font-medium">
            AI 취향·체형 추천
          </span>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      <nav className="sm:hidden flex items-center justify-around border-t border-gray-100 px-2 py-2">
        <NavLink to="/" end className={navCls}>홈</NavLink>
        <NavLink to="/" className={navCls}
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          체형 분석
        </NavLink>
        <NavLink to="/result" className={navCls}>추천 결과</NavLink>
      </nav>
    </header>
  )
}
