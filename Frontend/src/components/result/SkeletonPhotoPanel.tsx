/**
 * SkeletonPhotoPanel — 전신사진 + MediaPipe 스켈레톤 포인트 표시
 * 가상 피팅(VirtualFitting) 대체용 컴포넌트
 */
interface Props {
  fullBodyImageUrl: string | null
}

// Mock MediaPipe 관절 포인트 (9:16 300x533 뷰박스 기준)
const SKELETON_POINTS = [
  { x: 150, y: 55,  label: '코' },
  { x: 142, y: 60,  label: '왼눈' },
  { x: 158, y: 60,  label: '오른눈' },
  { x: 136, y: 66,  label: '왼귀' },
  { x: 164, y: 66,  label: '오른귀' },
  { x: 150, y: 88,  label: '목' },
  { x: 90,  y: 115, label: '왼어깨' },
  { x: 210, y: 115, label: '오른어깨' },
  { x: 68,  y: 175, label: '왼팔꿈치' },
  { x: 232, y: 175, label: '오른팔꿈치' },
  { x: 55,  y: 228, label: '왼손목' },
  { x: 245, y: 228, label: '오른손목' },
  { x: 115, y: 225, label: '왼엉덩이' },
  { x: 185, y: 225, label: '오른엉덩이' },
  { x: 108, y: 330, label: '왼무릎' },
  { x: 192, y: 330, label: '오른무릎' },
  { x: 103, y: 430, label: '왼발목' },
  { x: 197, y: 430, label: '오른발목' },
]

// 연결선 정의 (포인트 인덱스 쌍)
const CONNECTIONS: [number, number][] = [
  [0, 5],   // 코-목
  [5, 6],   // 목-왼어깨
  [5, 7],   // 목-오른어깨
  [6, 8],   // 왼어깨-왼팔꿈치
  [7, 9],   // 오른어깨-오른팔꿈치
  [8, 10],  // 왼팔꿈치-왼손목
  [9, 11],  // 오른팔꿈치-오른손목
  [6, 12],  // 왼어깨-왼엉덩이
  [7, 13],  // 오른어깨-오른엉덩이
  [12, 13], // 왼엉덩이-오른엉덩이
  [12, 14], // 왼엉덩이-왼무릎
  [13, 15], // 오른엉덩이-오른무릎
  [14, 16], // 왼무릎-왼발목
  [15, 17], // 오른무릎-오른발목
]

export default function SkeletonPhotoPanel({ fullBodyImageUrl }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2"/><path d="M12 7v5m0 0l-3 3m3-3l3 3M9 17H7a2 2 0 00-2 2v1h14v-1a2 2 0 00-2-2h-2"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">체형 분석 사진</h3>
          <p className="text-xs text-gray-400 mt-0.5">MediaPipe 기반 관절 포인트 분석</p>
        </div>
      </div>

      {/* 사진 + 스켈레톤 캔버스 */}
      <div className="p-5">
        <div
          className="relative mx-auto bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-100"
          style={{ aspectRatio: '9/16', maxWidth: 300 }}
        >
          {/* 전신사진 */}
          {fullBodyImageUrl ? (
            <img
              src={fullBodyImageUrl}
              alt="전신사진"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 200" className="h-48 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="50" cy="16" rx="11" ry="13"/>
                <path d="M39 29 Q30 35 26 52 L22 90 Q36 94 50 94 Q64 94 78 90 L74 52 Q70 35 61 29 Z"/>
                <path d="M26 54 L14 82 Q12 88 16 90 L20 88 L24 70"/>
                <path d="M74 54 L86 82 Q88 88 84 90 L80 88 L76 70"/>
                <path d="M38 94 L34 150 Q33 158 38 160 L44 160 L46 120 L54 120 L56 160 L62 160 Q67 158 66 150 L62 94"/>
                <path d="M34 160 L32 190 Q31 196 38 196 L42 196 L44 160"/>
                <path d="M62 160 L60 190 Q62 196 68 196 L72 196 L66 160"/>
              </svg>
              <p className="text-xs text-gray-400 mt-3 text-center px-6 leading-relaxed">
                전신 사진을 업로드하면<br />여기에 표시됩니다
              </p>
            </div>
          )}

          {/* MediaPipe 스켈레톤 포인트 오버레이 */}
          {fullBodyImageUrl && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 300 533"
            >
              {/* 연결선 */}
              {CONNECTIONS.map(([a, b], i) => (
                <line
                  key={i}
                  x1={SKELETON_POINTS[a].x} y1={SKELETON_POINTS[a].y}
                  x2={SKELETON_POINTS[b].x} y2={SKELETON_POINTS[b].y}
                  stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" strokeLinecap="round"
                />
              ))}
              {/* 관절 포인트 */}
              {SKELETON_POINTS.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x} cy={pt.y} r="4.5"
                  fill="#3b82f6" opacity="0.85"
                  stroke="white" strokeWidth="1.5"
                />
              ))}
            </svg>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-3 leading-relaxed">
          MediaPipe 기반 관절 포인트(18점) 분석으로<br />신체 비율을 측정합니다
        </p>
      </div>
    </div>
  )
}
