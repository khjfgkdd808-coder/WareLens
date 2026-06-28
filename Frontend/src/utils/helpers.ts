import type { ApiErrorCode, ApiErrorResponse } from '@/types'
import { API_ERROR_CONFIG, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from './constants'

export const formatPrice      = (p: number) => `₩ ${p.toLocaleString('ko-KR')}`
export const formatSimilarity = (s: number) => `${Math.round(s)}%`

export const getBMIInfo = (bmi: number) => {
  if (bmi < 18.5) return { label: '저체중', color: 'text-blue-600',   bg: 'bg-blue-50'   }
  if (bmi < 25.0) return { label: '정상',   color: 'text-green-600',  bg: 'bg-green-50'  }
  if (bmi < 30.0) return { label: '과체중', color: 'text-yellow-600', bg: 'bg-yellow-50' }
  return                  { label: '비만',   color: 'text-red-600',    bg: 'bg-red-50'    }
}

// ── 이미지 파일 검증 ──────────────────────────────────────────

/** 파일 확장자를 소문자로 추출 */
const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/**
 * 이미지 파일 유효성 검사
 * Toast용 짧은 메시지를 반환합니다.
 * 오류 없으면 null 반환.
 */
export const validateImageFile = (file: File): string | null => {
  if (!file) return '파일을 선택해 주세요.'

  // 1. MIME 타입 검사
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'JPG, PNG, WebP 형식만 업로드 가능합니다.'
  }

  // 2. 확장자 이중 검사 (MIME 스푸핑 방어)
  const ext = getExtension(file.name)
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return '지원하지 않는 파일 형식입니다. (.jpg .jpeg .png .webp)'
  }

  // 3. 파일 크기 검사
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return `이미지 크기(${sizeMB}MB)가 10MB를 초과합니다.`
  }

  // 4. 빈 파일 방어
  if (file.size === 0) return '파일이 비어 있습니다.'

  return null
}

/**
 * 여러 파일 한번에 검증
 * 첫 번째 오류 메시지만 반환
 */
export const validateImageFiles = (files: File[]): string | null => {
  for (const f of files) {
    const err = validateImageFile(f)
    if (err) return err
  }
  return null
}

// ── API 에러 처리 유틸 ────────────────────────────────────────

/**
 * API 응답에서 errorCode를 추출하여 표시 방식과 메시지를 반환합니다.
 *
 * Backend 연동 방법:
 *  const res = await axios.post('/api/v1/recommend', fd)
 *  if (!res.data.success) {
 *    const { displayType, title, message } = handleApiError(res.data.errorCode)
 *    if (displayType === 'modal') openErrorModal(res.data.errorCode)
 *    else addToast('error', message)
 *  }
 */
export const handleApiError = (errorCode: string): {
  displayType: 'modal' | 'toast'
  title:       string
  message:     string
  action:      string
} => {
  const code = errorCode as ApiErrorCode
  const config = API_ERROR_CONFIG[code] ?? API_ERROR_CONFIG['UNKNOWN']
  return config
}

/**
 * axios 에러 객체에서 ApiErrorCode를 안전하게 추출
 * Backend 연동 시 catch 블록에서 사용합니다.
 *
 * 사용 예:
 *  } catch (err) {
 *    const code = extractApiErrorCode(err)
 *    openErrorModal(code)
 *  }
 */
export const extractApiErrorCode = (err: unknown): ApiErrorCode => {
  if (err && typeof err === 'object') {
    // axios 에러 구조: err.response.data.errorCode
    const axiosErr = err as { response?: { data?: Partial<ApiErrorResponse> } }
    const code = axiosErr.response?.data?.errorCode
    if (code && code in API_ERROR_CONFIG) return code as ApiErrorCode
  }
  return 'UNKNOWN'
}

/**
 * API 응답이 성공인지 간단 체크
 * 사용 예: if (!isApiSuccess(res.data)) throw new Error(res.data.errorCode)
 */
export const isApiSuccess = (data: unknown): boolean => {
  if (data && typeof data === 'object' && 'success' in data) {
    return (data as { success: boolean }).success === true
  }
  return true // success 필드 없는 경우 성공으로 간주
}
