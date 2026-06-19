import { useAppStore } from '@/store/useAppStore'
import type { Gender } from '@/types'

const BodyInfoForm = () => {
  const { userInfo, userInfoErrors, setUserInfo, setUserInfoError } = useAppStore()

  const validateHeight = (v: number) => {
    if (!v) return setUserInfoError('height', '키를 입력해 주세요.')
    if (v < 100 || v > 250) return setUserInfoError('height', '100~250cm 사이로 입력해 주세요.')
    setUserInfoError('height', '')
  }
  const validateWeight = (v: number) => {
    if (!v) return setUserInfoError('weight', '몸무게를 입력해 주세요.')
    if (v < 30 || v > 200) return setUserInfoError('weight', '30~200kg 사이로 입력해 주세요.')
    setUserInfoError('weight', '')
  }

  return (
    <div className="space-y-4">
      {/* 성별 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1.5">성별</p>
        <div className="grid grid-cols-2 gap-2">
          {(['male','female'] as Gender[]).map((g) => (
            <label key={g} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer transition-all select-none
              ${userInfo.gender === g ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <input type="radio" name="gender" value={g} checked={userInfo.gender === g}
                onChange={() => setUserInfo({ gender: g })} className="sr-only"/>
              <span>{g === 'male' ? '👔' : '👗'}</span>
              <span className="text-sm font-medium">{g === 'male' ? '남성' : '여성'}</span>
              {userInfo.gender === g && (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* 키 */}
      <div>
        <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1.5">키</label>
        <div className="flex items-center gap-2">
          <input id="height" type="number" min={100} max={250} placeholder="175"
            value={userInfo.height || ''}
            onChange={(e) => setUserInfo({ height: Number(e.target.value) })}
            onBlur={(e) => validateHeight(Number(e.target.value))}
            className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${userInfoErrors.height ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}/>
          <span className="text-sm text-gray-500 w-6">cm</span>
        </div>
        {userInfoErrors.height && <p className="mt-1 text-xs text-red-500">{userInfoErrors.height}</p>}
      </div>

      {/* 몸무게 */}
      <div>
        <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1.5">몸무게</label>
        <div className="flex items-center gap-2">
          <input id="weight" type="number" min={30} max={200} placeholder="65"
            value={userInfo.weight || ''}
            onChange={(e) => setUserInfo({ weight: Number(e.target.value) })}
            onBlur={(e) => validateWeight(Number(e.target.value))}
            className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${userInfoErrors.weight ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}/>
          <span className="text-sm text-gray-500 w-6">kg</span>
        </div>
        {userInfoErrors.weight && <p className="mt-1 text-xs text-red-500">{userInfoErrors.weight}</p>}
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-xs text-blue-600 leading-relaxed">정확한 신체 정보를 입력할수록 사이즈 추천 정확도가 높아집니다.</p>
      </div>
    </div>
  )
}

export default BodyInfoForm
