/**
 * auth.ts
 * 인증 관련 API 모듈 (회원가입 / 로그인 / 로그아웃)
 *
 * 현재: Mock 구조로 구현
 * 실제 연동 시: Mock 섹션 제거 → axiosClient 주석 해제
 */
import type { SignupRequest, SignupResponse, LoginRequest, LoginResponse } from '@/types'
// import axiosClient from './axiosClient'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Mock 사용자 저장소 (실제 연동 시 제거)
const MOCK_USERS: {
  email: string; password: string; nickname: string; userId: string
}[] = [
  // 기본 테스트 계정
  { email: 'test@warelens.io', password: 'test123', nickname: '테스터', userId: 'user_000' },
]

/**
 * 회원가입
 * POST /auth/signup
 */
export const signup = async (req: SignupRequest): Promise<SignupResponse> => {
  /* ── Mock ── */
  await delay(900)
  if (MOCK_USERS.some((u) => u.email === req.email)) {
    return { success: false, message: '이미 사용 중인 이메일입니다.' }
  }
  const userId = `user_${Date.now()}`
  MOCK_USERS.push({ ...req, userId })
  return { success: true, message: '회원가입이 완료됐습니다.',
    data: { userId, email: req.email, nickname: req.nickname } }
  /* ── Mock 끝 ──
  const { data } = await axiosClient.post<SignupResponse>('/auth/signup', req)
  return data
  */
}

/**
 * 로그인
 * POST /auth/login
 */
export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  /* ── Mock ── */
  await delay(700)
  const found = MOCK_USERS.find((u) => u.email === req.email && u.password === req.password)
  if (!found) return { success: false, accessToken: '', user: { userId: '', email: '', nickname: '' } }
  return { success: true, accessToken: `mock_token_${found.userId}`,
    user: { userId: found.userId, email: found.email, nickname: found.nickname } }
  /* ── Mock 끝 ──
  const { data } = await axiosClient.post<LoginResponse>('/auth/login', req)
  return data
  */
}

/**
 * 로그아웃
 * POST /auth/logout
 */
export const logout = async (): Promise<void> => {
  await delay(200)
  // axiosClient.post('/auth/logout')  ← 실제 연동 시 사용
}

/** 토큰 로컬 저장 유틸 */
export const saveToken  = (token: string) => localStorage.setItem('wl_token', token)
export const getToken   = ()               => localStorage.getItem('wl_token') ?? ''
export const clearToken = ()               => localStorage.removeItem('wl_token')
