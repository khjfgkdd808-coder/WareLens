import { useAppStore } from '@/store/useAppStore'
import type { Gender } from '@/types'
import { Info } from 'lucide-react'

export default function BodyInfoForm() {
  const { userInfo, userInfoErrors, setUserInfo, setUserInfoError } = useAppStore()

  // e / + / - 등 숫자 외 키 완전 차단
  const blockNonNumeric = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
  }

  // 붙여넣기 시에도 숫자만 허용
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!/^\d+$/.test(pasted)) e.preventDefault()
  }

  const handleHeight = (raw: string) => {
    if (raw === '') { setUserInfo({ height: 0 }); return }
    const v = parseInt(raw, 10)
    if (isNaN(v)) return
    setUserInfo({ height: v })
  }

  const handleWeight = (raw: string) => {
    if (raw === '') { setUserInfo({ weight: 0 }); return }
    const v = parseInt(raw, 10)
    if (isNaN(v)) return
    setUserInfo({ weight: v })
  }

  const validateH = (v: number) => {
    if (!v)                  return setUserInfoError('height', '키를 입력해 주세요.')
    if (v < 100 || v > 250) return setUserInfoError('height', '100~250cm 사이로 입력해 주세요.')
    setUserInfoError('height', '')
  }

  const validateW = (v: number) => {
    if (!v)                 return setUserInfoError('weight', '몸무게를 입력해 주세요.')
    if (v < 30 || v > 200) return setUserInfoError('weight', '30~200kg 사이로 입력해 주세요.')
    setUserInfoError('weight', '')
  }

  const inputBase = [
    'flex-1 px-3 py-2.5 text-sm rounded-xl border transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
  ].join(' ')

  return (
    <div className="space-y-4">
      {/* 성별 */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">성별</p>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as Gender[]).map((g) => (
            <label key={g} className={[
              'flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none',
              userInfo.gender === g
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300',
            ].join(' ')}>
              <input type="radio" name="gender" className="sr-only" value={g}
                checked={userInfo.gender === g}
                onChange={() => setUserInfo({ gender: g })} />
              <span className="text-base">{g === 'male' ? '👔' : '👗'}</span>
              <span className="text-sm font-medium">{g === 'male' ? '남성' : '여성'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 키 */}
      <div>
        <label htmlFor="height" className="block text-xs font-semibold text-gray-700 mb-1.5">
          키 <span className="font-normal text-gray-400">(cm)</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            id="height"
            type="number"
            inputMode="numeric"
            placeholder="예: 175"
            value={userInfo.height || ''}
            onChange={(e) => handleHeight(e.target.value)}
            onBlur={(e)   => validateH(Number(e.target.value))}
            onKeyDown={blockNonNumeric}
            onPaste={handlePaste}
            className={`${inputBase} ${userInfoErrors.height ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
          />
          <span className="text-sm text-gray-500 w-6 flex-shrink-0">cm</span>
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

      {/* 몸무게 */}
      <div>
        <label htmlFor="weight" className="block text-xs font-semibold text-gray-700 mb-1.5">
          몸무게 <span className="font-normal text-gray-400">(kg)</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            id="weight"
            type="number"
            inputMode="numeric"
            placeholder="예: 65"
            value={userInfo.weight || ''}
            onChange={(e) => handleWeight(e.target.value)}
            onBlur={(e)   => validateW(Number(e.target.value))}
            onKeyDown={blockNonNumeric}
            onPaste={handlePaste}
            className={`${inputBase} ${userInfoErrors.weight ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
          />
          <span className="text-sm text-gray-500 w-6 flex-shrink-0">kg</span>
        </div>
        {userInfoErrors.weight && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {userInfoErrors.weight}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 bg-brand-50 rounded-xl">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-600 leading-relaxed">
          정확한 신체 정보를 입력할수록 사이즈 추천 정확도가 높아집니다.
        </p>
      </div>
    </div>
  )
}
