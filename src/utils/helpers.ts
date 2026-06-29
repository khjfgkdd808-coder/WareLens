export const formatPrice      = (p: number) => `₩ ${p.toLocaleString('ko-KR')}`
export const formatSimilarity = (s: number) => `${Math.round(s)}%`

export const getBMIInfo = (bmi: number) => {
  if (bmi < 18.5) return { label: '저체중', color: 'text-blue-600',   bg: 'bg-blue-50'   }
  if (bmi < 25.0) return { label: '정상',   color: 'text-green-600',  bg: 'bg-green-50'  }
  if (bmi < 30.0) return { label: '과체중', color: 'text-yellow-600', bg: 'bg-yellow-50' }
  return                  { label: '비만',   color: 'text-red-600',    bg: 'bg-red-50'    }
}

export const validateImageFile = (file: File): string | null => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'JPG, PNG, WebP 형식만 업로드 가능합니다.'
  if (file.size > 10 * 1024 * 1024)
    return '이미지 크기는 10MB 이하여야 합니다.'
  return null
}
