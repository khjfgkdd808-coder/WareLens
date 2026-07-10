import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { getStoreLocation, type StoreLocation } from '@/data/mockStoreLocation'

/**
 * 📍 매장 위치 모달
 *
 * "매장에서 찾기" 버튼 클릭 시 뜨는 작은 다이얼로그.
 * 사용자가 이미 오프라인 매장에 있다는 시나리오이므로 매장명은 표시하지 않고
 * 층/구역, 진열대, 동선 안내만 보여줍니다. (Mock, src/data/mockStoreLocation.ts)
 */
export default function StoreLocationModal({
  productId, productName, onClose,
}: {
  productId: string
  productName: string
  onClose: () => void
}) {
  const [location, setLocation] = useState<StoreLocation | null>(null)

  useEffect(() => {
    let alive = true
    getStoreLocation(productId).then((res) => { if (alive) setLocation(res) })
    return () => { alive = false }
  }, [productId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.15s ease-out' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900 truncate pr-2">📍 매장 위치</p>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="flex-shrink-0 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-xs text-gray-400 mb-3 truncate">{productName}</p>

          {!location ? (
            <p className="text-xs text-gray-300">위치 확인 중...</p>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold text-gray-400">구역</p>
                <p className="text-sm font-bold text-gray-900">{location.floorInfo}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">진열대</p>
                <p className="text-sm font-bold text-gray-900">{location.section}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">가는 길</p>
                <p className="text-sm text-gray-700 leading-snug">{location.direction}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  )
}
