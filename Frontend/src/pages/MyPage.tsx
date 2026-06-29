/**
 * MyPage.tsx
 * 마이페이지 — 내 추천 옷 관리 페이지
 *
 * 구성:
 *  A. 프로필 영역 (닉네임 / 이메일 / 체형 정보)
 *  B. 최근 추천 상품 (메인)
 *  C. 찜한 상품
 *  D. 가상 피팅 기록
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, Shirt, ChevronRight, RotateCcw, Loader2, Star, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getMyPageData, removeFavorite } from '@/api/user'
import type { MyPageData, MyRecommendation, MyFavorite, MyFitting } from '@/types'

// ── 섹션 헤더 ──────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-500" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 text-sm text-gray-400 font-normal">({count}개)</span>
      )}
    </div>
  )
}

// ── A. 프로필 카드 ─────────────────────────────────────────────
function ProfileCard({ data }: { data: MyPageData }) {
  const { profile } = data
  const navigate = useNavigate()
  const { logout, addToast } = useAppStore()

  const handleLogout = () => {
    logout()
    addToast('success', '로그아웃됐습니다.')
    navigate('/')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start gap-4">
        {/* 아바타 */}
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-blue-500" />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{profile.nickname}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>

          {profile.bodyInfo && (
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: '키',   value: `${profile.bodyInfo.height}cm` },
                { label: '몸무게', value: `${profile.bodyInfo.weight}kg` },
                { label: '성별', value: profile.bodyInfo.gender === 'male' ? '남성' : '여성' },
              ].map(({ label, value }) => (
                <span key={label} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold">{value}</span>
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mt-2">가입일: {profile.createdAt}</p>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
        <button
          type="button"
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
        >
          내 정보 수정
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}

// ── B. 추천 상품 카드 ──────────────────────────────────────────
function RecommendCard({ item }: { item: MyRecommendation }) {
  return (
    <div className="flex gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition">
      <img
        src={item.imageUrl} alt={item.name} loading="lazy"
        className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-50"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x64?text=No' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400">{item.category}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 font-medium">{item.score}% 일치</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug line-clamp-2">{item.reason}</p>
      </div>
      <div className="flex items-center flex-shrink-0">
        <span className="text-[10px] text-gray-400">{item.recommendedAt}</span>
      </div>
    </div>
  )
}

// ── C. 찜한 상품 카드 ─────────────────────────────────────────
function FavoriteCard({ item, onRemove }: { item: MyFavorite; onRemove: (id: string) => void }) {
  return (
    <div className="relative flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition group">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={item.imageUrl} alt={item.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=No' }}
        />
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50 transition shadow-sm"
          aria-label="찜 해제"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
      <div className="p-2.5">
        <p className="text-[9px] text-gray-400">{item.category}</p>
        <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
        <p className="text-[9px] text-gray-400 mt-0.5">{item.savedAt}</p>
      </div>
    </div>
  )
}

// ── D. 피팅 기록 카드 ─────────────────────────────────────────
function FittingCard({ item }: { item: MyFitting }) {
  const [showResult, setShowResult] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition">
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <div className="relative bg-white">
          <img
            src={item.clothingImage} alt={item.clothingName} loading="lazy"
            className="w-full aspect-square object-cover"
          />
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold bg-black/50 text-white px-1.5 py-0.5 rounded-full">의류</span>
        </div>
        <div className="relative bg-white">
          {showResult ? (
            <img
              src={item.resultImage} alt="피팅 결과" loading="lazy"
              className="w-full aspect-square object-cover object-top"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
              <button
                onClick={() => setShowResult(true)}
                className="flex flex-col items-center gap-1 text-blue-500 hover:text-blue-700 transition"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[10px] font-semibold">결과 보기</span>
              </button>
            </div>
          )}
          {showResult && (
            <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold bg-blue-600/80 text-white px-1.5 py-0.5 rounded-full">AI 결과</span>
          )}
        </div>
      </div>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-800 truncate">{item.clothingName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{item.fittedAt}</p>
        </div>
        {showResult && (
          <button
            onClick={() => setShowResult(false)}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition flex-shrink-0 ml-2"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MyPage() {
  const navigate    = useNavigate()
  const { isLoggedIn, addToast } = useAppStore()

  const [data,      setData]      = useState<MyPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')

  // 비로그인 → 홈으로
  useEffect(() => {
    if (!isLoggedIn) {
      addToast('warning', '로그인이 필요한 페이지입니다.')
      navigate('/')
    }
  }, [isLoggedIn])

  // 마이페이지 데이터 로딩
  useEffect(() => {
    if (!isLoggedIn) return
    setIsLoading(true)
    getMyPageData()
      .then(setData)
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn])

  const handleRemoveFavorite = async (id: string) => {
    if (!data) return
    try {
      await removeFavorite(id)
      setData((prev) => prev
        ? { ...prev, favorites: prev.favorites.filter((f) => f.id !== id) }
        : prev
      )
      addToast('success', '찜 목록에서 제거됐습니다.')
    } catch {
      addToast('error', '찜 해제에 실패했습니다.')
    }
  }

  // ── 로딩 ──
  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">내 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    )
  }

  // ── 오류 ──
  if (error || !data) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">{error || '데이터를 불러오지 못했습니다.'}</p>
          <button onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
            <RotateCcw className="w-4 h-4" /> 다시 시도
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* 페이지 제목 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-sm text-gray-500 mt-1">내 체형 분석과 추천 옷을 관리하세요</p>
      </div>

      {/* ── A. 프로필 ── */}
      <ProfileCard data={data} />

      {/* ── B. 최근 추천 상품 ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <SectionHeader icon={Shirt} title="최근 추천 상품" count={data.recommendations.length} />
        {data.recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">아직 추천받은 상품이 없습니다.</p>
            <button onClick={() => navigate('/')}
              className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
              체형 분석 받으러 가기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recommendations.map((item) => (
              <RecommendCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* ── C. 찜한 상품 ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <SectionHeader icon={Heart} title="찜한 상품" count={data.favorites.length} />
        {data.favorites.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">찜한 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.favorites.map((item) => (
              <FavoriteCard key={item.id} item={item} onRemove={handleRemoveFavorite} />
            ))}
          </div>
        )}
      </section>

      {/* ── D. 가상 피팅 기록 ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <SectionHeader icon={RotateCcw} title="가상 피팅 기록" count={data.fittings.length} />
        {data.fittings.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">피팅 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.fittings.map((item) => (
              <FittingCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <div className="h-4" />
    </main>
  )
}
