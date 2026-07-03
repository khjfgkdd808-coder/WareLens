import { useAppStore } from '@/store/useAppStore'
import type { Gender } from '@/types'
import { Info } from 'lucide-react'

export default function BodyInfoForm() {
  const { userInfo, userInfoErrors, setUserInfo, setUserInfoError } = useAppStore()

  const blockNonNumeric = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
  }
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d+$/.test(e.clipboardData.getData('text'))) e.preventDefault()
  }
  const handleHeight = (raw: string) => {
    if (raw === '') { setUserInfo({ height: 0 }); return }
    const v = parseInt(raw, 10)
    if (!isNaN(v)) setUserInfo({ height: v })
  }
  const validateH = (v: number) => {
    if (!v)                  return setUserInfoError('height', '키를 입력해 주세요.')
    if (v < 100 || v > 250) return setUserInfoError('height', '100~250cm 사이로 입력해 주세요.')
    setUserInfoError('height', '')
  }

  const GENDER_OPTIONS: { value: Gender; emoji: string; label: string }[] = [
    { value: 'male',   emoji: '👔', label: '남성' },
    { value: 'female', emoji: '👗', label: '여성' },
  ]

  return (
    <div className="space-y-4">
      {/* 가로 한 줄: 성별 | 키 (몸무게 제거됨) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── 성별 ── */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">성별</p>
          <div className="grid grid-cols-2 gap-1.5">
            {GENDER_OPTIONS.map(({ value, emoji, label }) => {
              const isActive = userInfo.gender === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setUserInfo({ gender: value })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', padding: '7px 6px', borderRadius: '10px',
                    border:          isActive ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
                    backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                    color:           isActive ? '#2563eb' : '#6b7280',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{emoji}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
                  {isActive && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 키 ── */}
        <div>
          <label htmlFor="height" className="block text-xs font-semibold text-gray-700 mb-2">
            키 <span className="font-normal text-gray-400">(cm)</span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              id="height" type="number" inputMode="numeric" placeholder="예: 175"
              value={userInfo.height || ''}
              onChange={(e) => handleHeight(e.target.value)}
              onBlur={(e)   => validateH(Number(e.target.value))}
              onKeyDown={blockNonNumeric} onPaste={handlePaste}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '12px',
                border: `1px solid ${userInfoErrors.height ? '#f87171' : '#e5e7eb'}`,
                backgroundColor: userInfoErrors.height ? '#fef2f2' : '#ffffff',
                fontSize: '14px', outline: 'none',
              }}
            />
            <span className="text-sm text-gray-500 flex-shrink-0">cm</span>
          </div>
          {userInfoErrors.height && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {userInfoErrors.height}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl"
           style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>
          정확한 신체 정보를 입력할수록 사이즈 추천 정확도가 높아집니다.
        </p>
      </div>
    </div>
  )
}
