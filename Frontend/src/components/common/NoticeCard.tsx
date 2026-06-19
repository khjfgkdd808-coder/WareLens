import { NOTICE_MESSAGES } from '@/utils/constants'

const NoticeCard = () => (
  <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <div>
      <p className="text-sm font-semibold text-orange-800 mb-1">주의사항</p>
      <ul className="space-y-0.5">
        {NOTICE_MESSAGES.map((m) => (
          <li key={m} className="text-xs text-orange-700">· {m}</li>
        ))}
      </ul>
    </div>
  </div>
)

export default NoticeCard
