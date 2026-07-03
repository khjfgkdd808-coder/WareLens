/**
 * axiosClient.ts
 * Spring Boot API 공용 인스턴스
 */

import axios from 'axios'

const axiosClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 토큰 자동 주입 (선택)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('warelens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 공통 에러 처리
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('warelens_token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default axiosClient