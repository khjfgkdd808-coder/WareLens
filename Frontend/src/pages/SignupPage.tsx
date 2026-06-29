/**
 * SignupPage.tsx
 * 회원가입 페이지
 *
 * Validation:
 *  - 이메일 형식
 *  - 비밀번호 6자 이상 + 영문+숫자 조합
 *  - 비밀번호 확인 일치
 *  - 닉네임 2~12자
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { signup } from '@/api/auth'
import { useAppStore } from '@/store/useAppStore'
import type { SignupRequest } from '@/types'

// ── Validation ────────────────────────────────────────────────

const validateEmail = (v: string) => {
  if (!v) return '이메일을 입력해 주세요.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '올바른 이메일 형식을 입력해 주세요.'
  return ''
}

const validatePassword = (v: string) => {
  if (!v)          return '비밀번호를 입력해 주세요.'
  if (v.length < 6) return '비밀번호는 6자 이상이어야 합니다.'
  if (!/[A-Za-z]/.test(v)) return '영문자를 포함해야 합니다.'
  if (!/[0-9]/.test(v))    return '숫자를 포함해야 합니다.'
  return ''
}

const validateConfirm = (pw: string, confirm: string) => {
  if (!confirm)    return '비밀번호를 한 번 더 입력해 주세요.'
  if (pw !== confirm) return '비밀번호가 일치하지 않습니다.'
  return ''
}

const validateNickname = (v: string) => {
  if (!v)         return '닉네임을 입력해 주세요.'
  if (v.length < 2) return '닉네임은 2자 이상이어야 합니다.'
  if (v.length > 12) return '닉네임은 12자 이하여야 합니다.'
  return ''
}

// ── 인라인 에러 메시지 ─────────────────────────────────────────
function FieldError({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      {msg}
    </p>
  )
}

// ── 비밀번호 강도 표시 ────────────────────────────────────────
function PasswordStrength({ pw }: { pw: string }) {
  if (!pw) return null
  const checks = [
    { label: '6자 이상',   ok: pw.length >= 6    },
    { label: '영문 포함',  ok: /[A-Za-z]/.test(pw) },
    { label: '숫자 포함',  ok: /[0-9]/.test(pw)    },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400']
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0,1,2].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(({ label, ok }) => (
          <span key={label} className={`text-[10px] flex items-center gap-0.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
            {ok ? '✓' : '○'} {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function SignupPage() {
  const navigate    = useNavigate()
  const setAuthUser = useAppStore((s) => s.setAuthUser)
  const addToast    = useAppStore((s) => s.addToast)

  const [form, setForm] = useState({ email: '', password: '', confirm: '', nickname: '' })
  const [errors, setErrors] = useState({ email: '', password: '', confirm: '', nickname: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [showCf,  setShowCf]  = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: '' }))
  }

  const validate = () => {
    const e = {
      email:    validateEmail(form.email),
      password: validatePassword(form.password),
      confirm:  validateConfirm(form.password, form.confirm),
      nickname: validateNickname(form.nickname),
    }
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate() || isLoading) return
    setIsLoading(true)
    try {
      const req: SignupRequest = { email: form.email, password: form.password, nickname: form.nickname }
      const res = await signup(req)
      if (!res.success) {
        setErrors((e) => ({ ...e, email: res.message }))
        return
      }
      // 가입 성공 → 자동 로그인 (Mock)
      if (res.data) {
        setAuthUser({ userId: res.data.userId, email: res.data.email, nickname: res.data.nickname })
      }
      addToast('success', '회원가입이 완료됐습니다! 환영합니다 🎉')
      setIsDone(true)
      setTimeout(() => navigate('/'), 1800)
    } catch {
      addToast('error', '회원가입에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 가입 완료 화면
  if (isDone) {
    return (
      <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">가입 완료!</h2>
          <p className="text-sm text-gray-500">잠시 후 홈 화면으로 이동합니다.</p>
        </div>
      </main>
    )
  }

  const inputBase = [
    'w-full px-4 py-3 text-sm rounded-xl border transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  ].join(' ')

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500 mt-1.5">WareLens에 가입하고 AI 체형 분석을 시작하세요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* 닉네임 */}
            <div>
              <label htmlFor="nickname" className="block text-xs font-semibold text-gray-700 mb-1.5">
                닉네임
              </label>
              <input
                id="nickname" type="text" autoComplete="nickname"
                placeholder="2~12자 닉네임"
                value={form.nickname} onChange={set('nickname')}
                className={`${inputBase} ${errors.nickname ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
              <FieldError msg={errors.nickname} />
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                이메일
              </label>
              <input
                id="email" type="email" autoComplete="email"
                placeholder="example@email.com"
                value={form.email} onChange={set('email')}
                className={`${inputBase} ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
              <FieldError msg={errors.email} />
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="영문+숫자 조합 6자 이상"
                  value={form.password} onChange={set('password')}
                  className={`${inputBase} pr-11 ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength pw={form.password} />
              <FieldError msg={errors.password} />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold text-gray-700 mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  id="confirm" type={showCf ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="비밀번호를 한 번 더 입력"
                  value={form.confirm} onChange={set('confirm')}
                  className={`${inputBase} pr-11 ${errors.confirm ? 'border-red-400 bg-red-50' : form.confirm && !errors.confirm ? 'border-green-400' : 'border-gray-200 hover:border-gray-300'}`}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowCf((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirm && form.password === form.confirm && !errors.confirm && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 비밀번호가 일치합니다
                </p>
              )}
              <FieldError msg={errors.confirm} />
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: isLoading ? '#93c5fd' : '#2563eb', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />처리 중...</>
                : '회원가입'
              }
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="text-center text-sm text-gray-500 pt-2">
            이미 계정이 있으신가요?{' '}
            <Link to="/" className="text-blue-600 font-semibold hover:underline">
              홈으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
