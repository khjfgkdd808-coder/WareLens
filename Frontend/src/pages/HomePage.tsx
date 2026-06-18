import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    emoji: '🔍',
    title: '취향 분석',
    desc: '업로드한 의류 이미지의 스타일·색상·패턴을 분석합니다.',
    disabled: false,
  },
  {
    emoji: '👤',
    title: '체형 분석',
    desc: '전신 사진 기반 체형 분석 기능입니다.',
    disabled: true,
  },
  {
    emoji: '✨',
    title: '정확한 추천',
    desc: '취향과 체형을 종합한 AI 추천 기능입니다.',
    disabled: true,
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      {/* 히어로 */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          AI 패션 추천 서비스
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          AI 체형 분석 &amp;<br className="sm:hidden" /> 패션 추천
        </h1>
        <p className="text-lg text-gray-500 mb-8">나에게 딱 맞는 핏과 스타일을 찾아보세요!</p>
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-base"
        >
          지금 시작하기
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {/* 기능 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`rounded-2xl border p-6 text-center transition
            ${
              f.disabled
                ? 'bg-[#F5F5F5] border-gray-200 opacity-60 cursor-not-allowed'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            }`}
          >
            <div className={`text-4xl mb-4 ${f.disabled ? 'grayscale' : ''}`}>
              {f.emoji}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
            {f.disabled && (
              <span className="inline-block mb-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-500">
                개발 예정
              </span>
            )}
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* 사용 방법 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-8">이용 방법</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {[
            { step: '01', title: '이미지 업로드', desc: '선호 의류 이미지 최대 5장 + 전신 사진' },
            { step: '02', title: '신체 정보 입력', desc: '키 · 몸무게 · 성별 입력' },
            { step: '03', title: 'AI 분석', desc: 'CLIP + MediaPipe 체형 분석' },
            { step: '04', title: '추천 결과 확인', desc: '맞춤 의류 및 사이즈 추천' },
          ].map((item, i) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">{item.step}</div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">{item.title}</h4>
              <p className="text-xs text-gray-500">{item.desc}</p>
              {i < 3 && <div className="hidden sm:block absolute" />}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
