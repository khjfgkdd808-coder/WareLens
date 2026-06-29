/**
 * ErrorModal.tsx
 * 사용자가 반드시 확인해야 하는 오류를 모달로 표시합니다.
 *
 * 사용 기준 (Modal):
 * - 전신 사진이 아님, 여러 명 포함, 신체 인식 실패
 * - 의류 이미지 아님
 * - AI 분석 실패, 추천 결과 생성 실패
 * - 서버 오류
 *
 * 사용 예:
 *  const { errorModalCode, closeErrorModal } = useAppStore()
 *  <ErrorModal
 *    isOpen={errorModalCode !== null}
 *    errorCode={errorModalCode}
 *    onClose={closeErrorModal}
 *    onRetry={() => { closeErrorModal(); handleRetry() }}
 *  />
 */
import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { API_ERROR_CONFIG } from '@/utils/constants'
import type { ApiErrorCode } from '@/types'

interface Props {
  isOpen:    boolean
  errorCode: ApiErrorCode | null
  onClose:   () => void
  onRetry?:  () => void
}

/* 에러 타입별 아이콘 색상 */
const getIconColor = (code: ApiErrorCode | null) => {
  if (!code) return { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' }
  const imageErrors: ApiErrorCode[] = ['NOT_FULL_BODY', 'MULTIPLE_PERSON', 'POSE_DETECTION_FAIL', 'NOT_CLOTHING_IMAGE']
  if (imageErrors.includes(code)) return { bg: 'bg-orange-50', icon: 'text-orange-500', border: 'border-orange-100' }
  return { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' }
}

export default function ErrorModal({ isOpen, errorCode, onClose, onRetry }: Props) {
  const config = errorCode
    ? API_ERROR_CONFIG[errorCode] ?? API_ERROR_CONFIG['UNKNOWN']
    : API_ERROR_CONFIG['UNKNOWN']

  const colors = getIconColor(errorCode)

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // 바깥 스크롤 방지
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else        document.body.style.overflow = ''
    return ()  => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    /* 오버레이 */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      {/* 모달 본체 — 클릭 이벤트 전파 차단 */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
      >
        {/* 헤더 */}
        <div className={`px-6 pt-6 pb-4 flex items-start gap-4 ${colors.bg} border-b ${colors.border}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}
               style={{ border: `1.5px solid` }}>
            <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="error-modal-title"
              className="text-sm font-bold text-gray-900 leading-snug"
            >
              {config.title}
            </h2>
            {errorCode && (
              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{errorCode}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex-shrink-0 w-7 h-7 rounded-full bg-white/70 flex items-center justify-center hover:bg-white transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">{config.message}</p>

          {/* 이미지 오류 가이드 (전신사진 관련 오류에만 표시) */}
          {(errorCode === 'NOT_FULL_BODY' || errorCode === 'POSE_DETECTION_FAIL') && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[11px] font-semibold text-blue-700 mb-1.5">올바른 사진 가이드</p>
              <ul className="space-y-1">
                {[
                  '정면에서 전신이 모두 보이는 사진',
                  '밝은 배경, 단순한 옷차림 권장',
                  '양팔과 양다리를 살짝 벌린 자세',
                ].map((tip) => (
                  <li key={tip} className="flex items-center gap-1.5 text-[11px] text-blue-600">
                    <span className="text-blue-400">·</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errorCode === 'MULTIPLE_PERSON' && (
            <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-[11px] text-orange-600 leading-relaxed">
                혼자 촬영한 전신 사진만 업로드해 주세요. 여러 명이 포함된 사진은 분석이 불가합니다.
              </p>
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: '#2563eb' }}
            >
              {config.action}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            {onRetry ? '취소' : '확인'}
          </button>
        </div>
      </div>

      {/* 애니메이션 */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}
