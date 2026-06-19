import { Link, NavLink } from 'react-router-dom'

const Header = () => {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors pb-0.5 ${
      isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'
    }`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-blue-600">Ware</span>
          <span className="text-gray-900">Lens</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-7">
          <NavLink to="/"       end className={cls}>홈</NavLink>
          <NavLink to="/upload"     className={cls}>체형 분석</NavLink>
          <NavLink to="/result"     className={cls}>추천 결과</NavLink>
        </nav>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition">
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/>
          </svg>
        </div>
      </div>
    </header>
  )
}

export default Header
