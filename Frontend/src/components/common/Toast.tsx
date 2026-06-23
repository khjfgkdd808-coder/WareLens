import { useAppStore } from '@/store/useAppStore'

const COLORS = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' }

export default function Toast() {
  const { toasts, removeToast } = useAppStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`${COLORS[t.type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-64 animate-fade-in`}>
          <span className="text-sm flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
      ))}
    </div>
  )
}
