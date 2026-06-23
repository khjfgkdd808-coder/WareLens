/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── WareLens 브랜드 컬러 시스템 ──────────────────────────
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',   // 메인 blue (bg-brand, text-brand 용도)
          600: '#2563eb',   // 기본 CTA 버튼
          700: '#1d4ed8',   // hover
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // ── 상태 컬러 ─────────────────────────────────────────
        status: {
          error:   '#ef4444',   // 에러
          warn:    '#f59e0b',   // 주의
          info:    '#3b82f6',   // 안내
          success: '#22c55e',   // 성공
        },
      },

      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },

      // ── 반응형 레이아웃 max-width ─────────────────────────────
      maxWidth: {
        'content': '1080px',
        'card':    '400px',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.4' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(1)',    opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'shimmer':    'shimmer 1.5s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
