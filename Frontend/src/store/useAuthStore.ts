/**
 * useAuthStore.ts
 * 인증 상태 전역 관리 (Zustand)
 * 로그인/로그아웃/회원가입 상태를 앱 전체에서 공유합니다.
 */
import { create } from 'zustand'
import type { UserProfile } from '@/types'

interface AuthStore {
  isLoggedIn:  boolean
  user:        UserProfile | null
  isLoading:   boolean

  setUser:     (user: UserProfile) => void
  clearUser:   () => void
  setLoading:  (v: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  user:       null,
  isLoading:  false,

  setUser:    (user) => set({ user, isLoggedIn: true }),
  clearUser:  ()     => set({ user: null, isLoggedIn: false }),
  setLoading: (v)    => set({ isLoading: v }),
}))
