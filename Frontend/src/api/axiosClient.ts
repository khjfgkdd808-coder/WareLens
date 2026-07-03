/**
 * axiosClient.ts
 * Spring Boot 백엔드 연동용 Axios 인스턴스
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:8080'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 - 토큰 자동 주입
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('warelens_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// 응답 인터셉터 - 공통 에러 처리
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('warelens_token')
      window.location.href = '/'
    }

    return Promise.reject(error)
  }
)

export default axiosClient