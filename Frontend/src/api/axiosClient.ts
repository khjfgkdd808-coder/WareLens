/**
 * axiosClient.ts
 * Spring Boot 백엔드 연동용 Axios 인스턴스
 * 현재는 Mock API(mockApi.ts)를 사용하고, 실제 연동 시 이 파일로 교체합니다.
 */
import axios from 'axios'

const BASE_URL = 'http://localhost:8080'

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// 요청 인터셉터 — 토큰 자동 주입 (추후 인증 연동)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('warelens_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터 — 공통 에러 처리
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('warelens_token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  },
)

export default axiosClient
