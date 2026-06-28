/**
 * TryOnButton.tsx
 * "이 옷 입어보기" 버튼 컴포넌트
 * ProductCard 하단에 삽입되며, 클릭 시 Try-On 흐름을 시작합니다.
 */
import { Shirt } from 'lucide-react'
import type { Product } from '@/types'

interface Props {
  product:   Product
  onTryOn:   (product: Product) => void
  isLoading: boolean
  isSelected: boolean
}

export default function TryOnButton({ product, onTryOn, isLoading, isSelected }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 선택 이벤트와 분리
    onTryOn(product)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={`${product.name} 입어보기`}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-b-xl text-xs font-semibold transition-all"
      style={{
        backgroundColor: isSelected && !isLoading ? '#1d4ed8' : isLoading ? '#e5e7eb' : '#2563eb',
        color:           isLoading ? '#9ca3af' : '#ffffff',
        cursor:          isLoading ? 'not-allowed' : 'pointer',
        borderTop:       '1px solid rgba(255,255,255,0.15)',
      }}
    >
      {isLoading ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          처리 중...
        </>
      ) : (
        <>
          <Shirt className="w-3.5 h-3.5" />
          이 옷 입어보기
        </>
      )}
    </button>
  )
}
