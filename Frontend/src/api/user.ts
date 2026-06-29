/**
 * user.ts
 * 마이페이지 관련 API 모듈
 *
 * 현재: Mock 데이터 기반 구현
 * 실제 연동 시: Mock 섹션 제거 → axiosClient 주석 해제
 */
import type { UserProfile, MyRecommendation, MyFavorite, MyFitting, MyPageData } from '@/types'
// import axiosClient from './axiosClient'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Mock 데이터 ────────────────────────────────────────────────

const MOCK_PROFILE: UserProfile = {
  userId:   'user_000',
  email:    'test@warelens.io',
  nickname: '테스터',
  createdAt: '2026-01-15',
  bodyInfo: { height: 175, weight: 65, gender: 'male' },
}

const MOCK_RECOMMENDATIONS: MyRecommendation[] = [
  { id: 'rec_1', productId: '1', name: '린넨 오버핏 셔츠', imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80', category: '셔츠/블라우스', score: 94, reason: '선택한 스타일과 체형 정보를 기반으로 추천', recommendedAt: '2026-06-20' },
  { id: 'rec_2', productId: '2', name: '베이직 라운드 반팔', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', category: '반팔 티셔츠', score: 91, reason: '체형 비율과 취향 이미지 유사도 기반 추천', recommendedAt: '2026-06-20' },
  { id: 'rec_3', productId: '3', name: '스트라이프 긴팔 티셔츠', imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80', category: '긴팔 티셔츠', score: 88, reason: '어깨 비율 보완에 적합한 스타일', recommendedAt: '2026-06-18' },
  { id: 'rec_4', productId: '4', name: '케이블 니트 스웨터', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80', category: '니트/스웨터', score: 85, reason: '색상 및 패턴이 선호 스타일과 유사', recommendedAt: '2026-06-15' },
]

const MOCK_FAVORITES: MyFavorite[] = [
  { id: 'fav_1', productId: '5', name: '옥스퍼드 버튼다운 셔츠', imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&q=80', category: '셔츠/블라우스', savedAt: '2026-06-19' },
  { id: 'fav_2', productId: '7', name: '플리스 집업 스웨터', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80', category: '니트/스웨터', savedAt: '2026-06-17' },
]

const MOCK_FITTINGS: MyFitting[] = [
  { id: 'fit_1', clothingName: '린넨 오버핏 셔츠', clothingImage: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80', resultImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4d8a?w=400&q=80', fittedAt: '2026-06-20' },
  { id: 'fit_2', clothingName: '베이직 라운드 반팔', clothingImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', resultImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4d8a?w=400&q=80', fittedAt: '2026-06-18' },
]

// ── API 함수 ───────────────────────────────────────────────────

/**
 * 내 프로필 조회
 * GET /users/me
 */
export const getMe = async (): Promise<UserProfile> => {
  await delay(400)
  return MOCK_PROFILE
  // const { data } = await axiosClient.get<UserProfile>('/users/me')
  // return data
}

/**
 * 최근 추천 상품 목록
 * GET /mypage/recommendations
 */
export const getMyRecommendations = async (): Promise<MyRecommendation[]> => {
  await delay(350)
  return MOCK_RECOMMENDATIONS
  // const { data } = await axiosClient.get<MyRecommendation[]>('/mypage/recommendations')
  // return data
}

/**
 * 찜한 상품 목록
 * GET /mypage/favorites
 */
export const getMyFavorites = async (): Promise<MyFavorite[]> => {
  await delay(300)
  return MOCK_FAVORITES
  // const { data } = await axiosClient.get<MyFavorite[]>('/mypage/favorites')
  // return data
}

/**
 * 가상 피팅 기록
 * GET /mypage/fittings
 */
export const getMyFittings = async (): Promise<MyFitting[]> => {
  await delay(300)
  return MOCK_FITTINGS
  // const { data } = await axiosClient.get<MyFitting[]>('/mypage/fittings')
  // return data
}

/**
 * 마이페이지 전체 데이터 (병렬 로딩)
 */
export const getMyPageData = async (): Promise<MyPageData> => {
  const [profile, recommendations, favorites, fittings] = await Promise.all([
    getMe(),
    getMyRecommendations(),
    getMyFavorites(),
    getMyFittings(),
  ])
  return { profile, recommendations, favorites, fittings }
}

/**
 * 프로필 수정
 * PUT /users/me
 */
export const updateProfile = async (patch: Partial<Pick<UserProfile, 'nickname'>>): Promise<UserProfile> => {
  await delay(500)
  return { ...MOCK_PROFILE, ...patch }
  // const { data } = await axiosClient.put<UserProfile>('/users/me', patch)
  // return data
}

/**
 * 찜 해제
 * DELETE /mypage/favorites/:id
 */
export const removeFavorite = async (id: string): Promise<void> => {
  await delay(200)
  const idx = MOCK_FAVORITES.findIndex((f) => f.id === id)
  if (idx !== -1) MOCK_FAVORITES.splice(idx, 1)
  // await axiosClient.delete(`/mypage/favorites/${id}`)
}
