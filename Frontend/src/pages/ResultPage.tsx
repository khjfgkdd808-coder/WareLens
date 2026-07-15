import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Share2,
  CheckCircle2,
  Loader2,
  Heart,
  X,
  Trash2,
  Save
} from "lucide-react";

import { useAppStore } from '@/store/useAppStore'
import { requestVirtualTryOn, saveFittingToGallery } from '@/api/mockApi'

import type { Product } from '@/types'
import NoticeCard from '@/components/common/NoticeCard'
import RecommendationCard from '@/components/recommendation/RecommendationCard'


//const LIST_MAX_H = 560
const CARD_G = 12

/* ── 찜 Floating ─────────────────────────────────────────────── */
function WishlistFloating() {
  const { products, wishlistIds } = useAppStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const wishlisted = products.filter((p) => wishlistIds.has(p.id))

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="fixed z-40" style={{ right: 20, top: '50%', transform: 'translateY(-50%)' }}>
      <button type="button" onClick={() => setOpen(v => !v)} aria-label="찜한 상품"
        className="relative w-12 h-12 rounded-full bg-white border border-gray-200 shadow-lg
                   flex items-center justify-center hover:shadow-xl transition-shadow">
        <Heart className={`w-5 h-5 ${wishlisted.length > 0 ? 'text-red-500' : 'text-gray-400'}`}
               fill={wishlisted.length > 0 ? 'currentColor' : 'none'} />
        {wishlisted.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white
                           text-[10px] font-bold flex items-center justify-center">
            {wishlisted.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-2xl
                        border border-gray-200 shadow-2xl overflow-hidden" style={{ width: 260 }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">찜한 상품</p>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {wishlisted.length === 0
              ? <p className="text-xs text-gray-400 text-center py-8">아직 찜한 상품이 없습니다</p>
              : wishlisted.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.category}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  const {
  bodyAnalysis,
  products,
  recommendStatus,

  fullBodyPreview,
  tryOnSelectedClothing,
  tryOnStatus,
  setTryOnClothing,
  setTryOnStatus,
  setTryOnResult,
  setTryOnError,

  tryOnImages,
  setTryOnImages,

  addToast,
  removeToast,
  toggleWishlist,
  wishlistIds,

} = useAppStore()

console.log("TRYON:", tryOnImages);

const fullBodyUrl =
  fullBodyPreview?.previewUrl ?? ''

  // 선택된 상품(tryOnSelectedClothing)의 imageName과
  // tryOnImages[i].garment_info.image_name을 비교해서
  // "그 상품에 해당하는" 가상피팅 이미지 1개를 찾습니다.
  // (기존: tryOnImages 배열의 마지막 요소를 무조건 고정 참조하던 버그 수정)
  // image_name 비교 시 공백/대소문자 차이로 인한 오매칭 가능성을 배제하기 위한 정규화 (신규 — 원인 조사 #3)
  const normalizeImageName = (name: unknown) =>
    typeof name === 'string' ? name.trim().toLowerCase() : name

  const selectedImageName = (tryOnSelectedClothing as any)?.imageName

  const matchedTryOnImage = selectedImageName
    ? tryOnImages.find(
        (img) => normalizeImageName(img?.garment_info?.image_name) === normalizeImageName(selectedImageName)
      )
    : undefined

  // 삭제(handleDeleteFitting) 시 store의 tryOnImages 배열에서 정확한 인덱스를 찾기 위해 사용 (신규)
  const matchedTryOnImageIndex = selectedImageName
    ? tryOnImages.findIndex(
        (img) => normalizeImageName(img?.garment_info?.image_name) === normalizeImageName(selectedImageName)
      )
    : -1

  const tryOnImageUrl = matchedTryOnImage?.data?.tryon_image_base64
    ? `data:image/png;base64,${matchedTryOnImage.data.tryon_image_base64}`
    : ''

  // ── 진단 로그 (원인 분석용, 신규) ────────────────────────────
  // #2 Store의 tryOnImages 실제 개수
  console.log('[ResultPage] tryOnImages.length (Store):', tryOnImages.length)
  // #3 추천 상품(top5) image_name 목록 vs tryOnImages의 image_name 목록 비교
  console.log('[ResultPage] top5 상품 image_name 목록:', (products?.slice(0, 5) ?? []).map((p: any) => p?.imageName))
  console.log(
    '[ResultPage] tryOnImages의 garment_info.image_name 목록:',
    tryOnImages.map((img) => img?.garment_info?.image_name)
  )
  console.log('[TryOn] 클릭한 상품 imageName:', selectedImageName)
  console.log('[TryOn] 매칭된 tryOn 이미지 존재 여부:', !!matchedTryOnImage)

  const top5 = products?.slice(0,5) ?? []

  // AI 처리(POST /upload)와 그 결과의 store 반영(products/bodyAnalysis/tryOnImages 등)은
  // 이미 LoadingPage에서 끝난 상태로 이 페이지에 진입합니다.
  // 여기서는 GET으로 다시 조회하지 않고, store에 데이터가 실제로 있는지만 확인합니다.
  useEffect(() => {
    if (!taskId || taskId === 'undefined') {
      navigate('/', { replace: true });
      return;
    }
    // LoadingPage를 거치지 않고 URL로 바로 진입한 경우 등 결과 데이터가 없으면 홈으로
    if (recommendStatus !== 'success' && products.length === 0) {
      navigate('/', { replace: true });
    }
  }, [taskId, recommendStatus, products.length]);

  const handleDelete = (indexToDelete: number) => {
    setTryOnImages(prev => prev.filter((_, index) => index !== indexToDelete));
  };


  const [isCopied, setIsCopied] = useState(false)

  // 가상피팅(POST /api/recommendations/tryon) 요청 진행 상태 (신규)
  // — 버튼 비활성화 및 로딩 표시에 사용
  const [isFitting, setIsFitting] = useState(false)

const handleShare = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)

    setIsCopied(true)

    addToast('success', '링크가 복사됐습니다!')

    setTimeout(() => {
      setIsCopied(false)
    }, 2500)

  } catch {
    addToast('error', '링크 복사에 실패했습니다.')
  }
}

const handleSelect = async (product: Product) => {
  // 기존 선택 로직은 그대로 유지 (사이즈 표시, 원본↔가상피팅 토글 전환 트리거 등)
  setTryOnClothing(product)

  if (isFitting) return // 피팅 요청이 이미 진행 중이면 중복 요청 방지 (신규)

  const productImageName = (product as any)?.imageName
  if (!productImageName || !taskId) return

  // 이미 피팅된 상품이면(=tryOnImages에 매칭되는 이미지가 이미 있으면) 절대 다시 호출하지 않음 (#4, #5)
  const alreadyFitted = tryOnImages.some(
    (img) => normalizeImageName(img?.garment_info?.image_name) === normalizeImageName(productImageName)
  )
  console.log('[ResultPage] handleSelect - image_name:', productImageName, '/ alreadyFitted:', alreadyFitted, alreadyFitted ? '→ /tryon 호출 생략' : '→ /tryon 신규 호출')
  if (alreadyFitted) return

  setIsFitting(true)
  try {
    const garmentInfo = {
      image_name: productImageName,
      article_type: product.category,
      color: (product as any)?.color,
      fabric: (product as any)?.fabric,
      fit: (product as any)?.fit,
      season: (product as any)?.season,
    }

    const res = await requestVirtualTryOn(taskId, garmentInfo)
    if (!res || res.status === 'ERROR' || !res.data) {
      throw new Error(res?.message || '가상 피팅 생성에 실패했습니다.')
    }

    const newTryOnImage = { data: res.data, garment_info: garmentInfo }
    setTryOnImages((prev) => [...prev, newTryOnImage])
    addToast('success', '가상 피팅이 완료되었습니다.')
  } catch {
    addToast('error', '피팅 요청에 실패했습니다.')
  } finally {
    setIsFitting(false)
  }
}


const handleWishlist = (id: string) => {
  toggleWishlist(id)
}

  // ── 원본 사진 / 가상 피팅 비교 탭 (신규 추가, 프레젠테이션 전용 상태) ──
  // 기존 데이터 흐름(fullBodyUrl, tryOnImageUrl)은 그대로 사용하고,
  // "어떤 이미지를 보여줄지"만 로컬 state로 관리합니다.
  //
  // (버그 원인 재수정)
  // 이전에는 photoView 자체를 'original' | 'tryon' state로 두고, 마운트 시
  // useState 초기값 또는 useEffect가 나중에 'tryon'으로 "전환"해주는 방식이었습니다.
  // 이 방식은 초기값이 평가되는 시점에 store 값이 이미 반영되어 있다는 가정에
  // 의존하기 때문에 타이밍에 따라 여전히 원본 사진이 먼저 보일 수 있었습니다.
  //
  // 이제는 사용자가 탭을 직접 클릭했는지 여부만 state(userPhotoView)로 저장하고,
  // 실제 화면에 쓰는 photoView는 "매 렌더마다" 아래 규칙으로 다시 계산합니다.
  //   - 사용자가 아직 탭을 클릭한 적이 없다면(userPhotoView === null)
  //     → tryOnImageUrl이 있으면 'tryon', 없으면 'original' (파생 상태, 항상 최신값)
  //   - 사용자가 탭을 클릭했다면 → 그 선택을 그대로 사용
  // 이렇게 하면 마운트 타이밍과 무관하게, 가상피팅 이미지가 준비돼 있는 렌더에서는
  // 무조건 'tryon'이 계산되므로 원본 사진이 먼저 그려질 수 없습니다.
  const [userPhotoView, setUserPhotoView] = useState<'original' | 'tryon' | null>(null)

  const photoView: 'original' | 'tryon' =
    userPhotoView ?? (tryOnImageUrl ? 'tryon' : 'original')

  const setPhotoView = (v: 'original' | 'tryon') => setUserPhotoView(v)

  useEffect(() => {
    // 사용자가 다른 상품을 선택(tryOnSelectedClothing 변경)하면, 이전 상품에 대해
    // 사용자가 눌러뒀던 원본/가상피팅 "수동 선택"은 더 이상 유효하지 않으므로 초기화합니다.
    // 초기화 후에는 위 파생 규칙(tryOnImageUrl 유무)에 따라 자동으로 최적의 화면이 계산됩니다.
    setUserPhotoView(null)
  }, [tryOnSelectedClothing])

  // 가상피팅 결과 이미지를 서버 갤러리에 저장 (신규 — B의 handleSave 로직을 addToast 방식으로 이식)
  const handleSaveFitting = async (item: any) => {
    const base64Data = item?.data?.tryon_image_base64
    if (!base64Data) {
      addToast('error', '저장할 이미지가 없습니다.')
      return
    }
    if (!taskId) return

    const toastId = addToast('info', '저장 중...', 0)
    try {
      const byteString = atob(base64Data)
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
      const file = new File([ab], `fitting_${Date.now()}.png`, { type: 'image/png' })

      const res = await saveFittingToGallery(taskId, file)
      if (res?.status === 'ERROR') throw new Error(res.message || '저장에 실패했습니다.')

      removeToast(toastId)
      addToast('success', '성공적으로 저장되었습니다!')
    } catch {
      removeToast(toastId)
      addToast('error', '저장에 실패했습니다.')
    }
  }

  // 가상피팅 결과 이미지 삭제 (신규 — 기존 handleDelete 로직 그대로 사용, 삭제 후 원본 사진으로 전환)
  const handleDeleteFitting = (indexToDelete: number) => {
    handleDelete(indexToDelete)
    if (indexToDelete === matchedTryOnImageIndex) {
      setPhotoView('original')
    }
  }

  const displayedPhotoUrl =
    photoView === 'tryon' && tryOnImageUrl ? tryOnImageUrl : fullBodyUrl

  if (recommendStatus === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <main className="min-h-full lg:h-full flex flex-col max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-10">
      <WishlistFloating />

      {/* 페이지 헤더 (고정) */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-shrink-0">
        <div>
          <p className="text-xs text-blue-500 font-semibold tracking-wide uppercase mb-0.5">AI 추천 완료</p>
          <h1 className="text-xl font-bold text-gray-900">오늘의 추천 스타일</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200
                       px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
            {isCopied
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />복사됨</>
              : <><Share2 className="w-3.5 h-3.5" />공유</>
            }
          </button>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200
                       px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
            <RotateCcw className="w-3.5 h-3.5" />다시 분석
          </button>
        </div>
      </div>

      {/*
       * ── 1:1 메인 레이아웃 ──
       *
       * ⚠️ 이전 CSS Grid(grid-cols-2) 기반 구현의 근본 문제:
       *   CSS Grid에서 명시적 grid-template-rows 없이 자동(auto) 행은
       *   "내용물 크기(content-based)"로 정해지고, 그리드 컨테이너 자체의
       *   높이(lg:flex-1로 확보된 높이)를 자동으로 채우지 않습니다.
       *   그 결과 자식 카드들의 h-full / flex-1 이 퍼센트 높이를 계산할
       *   기준(정의된 높이)을 찾지 못해 "auto"로 되돌아가고, 내부 <img>가
       *   원본 비율대로 커지면서 카드 박스 자체가 사진 높이만큼 늘어나
       *   PC에서 하단 콘텐츠(추천 사이즈 배지, 안내 카드)를 덮는 오버플로우가
       *   발생했습니다.
       *
       *   Flexbox(lg:flex-row)는 부모가 확정된 높이를 가지면 그 안의
       *   flex-1 자식에게 실제 픽셀 높이를 계산해서 내려주므로, 아래로 이어지는
       *   h-full / flex-1 / min-h-0 체인이 전부 의도대로 동작합니다.
       *   → 그리드를 flex로 교체한 것이 이번 수정의 핵심입니다.
       *
       * flex-1 min-h-0: main(h-full)이 확보한 높이 중 남는 공간을 모두 차지하되,
       *                  flex 기본 min-height:auto를 무력화해서 실제로 줄어들 수 있게 함
       * items-stretch: 두 컬럼이 항상 동일 높이 (flex의 align-items 기본값)
       * h-full: 각 카드가 컬럼 전체 높이를 채움
       */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:flex-1 lg:min-h-[720px]">

        {/* ══ 좌측 50%: 전신사진 + 추천 사이즈 ══════════════ */}
        <div className="flex flex-col min-h-0 lg:flex-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col h-auto lg:h-full min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">체형 분석 결과</h2>

              {/* 원본 사진 / 가상 피팅 탭 (기존 데이터는 그대로, 표시 방식만 전환) */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPhotoView('original')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    photoView === 'original' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'
                  }`}
                >
                  원본 사진
                </button>
                <button
                  type="button"
                  disabled={!tryOnImageUrl}
                  onClick={() => setPhotoView('tryon')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    photoView === 'tryon' && tryOnImageUrl ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'
                  } ${!tryOnImageUrl ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  가상 피팅
                </button>
              </div>
            </div>

            {/*
             * 사진 영역 — 전신(머리~발끝)이 항상 보이도록 표시
             *
             * 원본 사진 / 가상피팅 사진이 완전히 동일한 영역(width/height/object-fit/
             * border-radius)을 쓰도록 고정 박스를 사용합니다.
             * <img>는 항상 1개만 렌더링되며(src만 displayedPhotoUrl로 교체),
             * photoView가 바뀌어도 박스 크기 자체는 절대 변하지 않습니다.
             *
             * 반응형 처리:
             *  - 모바일(기본, ~sm) : aspect-[3/4]
             *  - sm~md        : aspect-[2/3]
             *  - md~lg        : aspect-[9/16]로 세로 여유를 더 줌.
             *  - PC(lg~)      : 고정 aspect-ratio를 쓰지 않고 lg:flex-1 lg:min-h-0로
             *                  부모(카드)의 남은 높이만큼만 채우도록 유지.
             *                  부모 카드가 flex 체인을 통해 실제 확정된 높이를
             *                  가지므로(위 flex 레이아웃 수정 참고), 사진이 그 높이를
             *                  절대 넘지 않음.
             *  - object-contain으로 이미지 전체(머리~발끝)가 잘리지 않고 박스 안에
             *    항상 온전히 보이도록 함 (object-cover는 박스를 꽉 채우기 위해
             *    이미지의 위/아래를 잘라내므로 전신 노출 목적에 맞지 않아 제거).
             *  - overflow-hidden은 이중 안전장치로 유지.
             */}
            <div
              className="relative w-full flex-shrink-0 rounded-xl overflow-hidden bg-gray-100
                         aspect-[3/4] sm:aspect-[2/3] md:aspect-[9/16]
                         lg:aspect-auto lg:flex-1 lg:min-h-0"
            >
              <img
                src={displayedPhotoUrl}
                alt={photoView === 'tryon' ? 'AI 착용 결과' : '원본 사진'}
                className="absolute inset-0 w-full h-full object-contain"
              />
              {tryOnStatus === 'loading' && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-white text-xs font-semibold">AI 착용 생성 중...</p>
                </div>
              )}
              {tryOnStatus === 'success' && photoView === 'tryon' && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-bold text-white bg-green-500 px-2 py-1 rounded-full shadow">
                    ✓ AI 착용 결과
                  </span>
                </div>
              )}

              {/* 가상피팅 요청 진행 중 로딩 오버레이 (신규 — isFitting 연동) */}
              {isFitting && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-white text-xs font-semibold">AI 착용 생성 중...</p>
                </div>
              )}

              {/* 가상피팅 결과 저장/삭제 버튼 (신규 — B의 handleSave / handleDelete 연동) */}
              {photoView === 'tryon' && matchedTryOnImage && !isFitting && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveFitting(matchedTryOnImage)}
                    aria-label="가상피팅 결과 저장"
                    className="w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center transition-colors"
                  >
                    <Save className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFitting(matchedTryOnImageIndex)}
                    aria-label="가상피팅 결과 삭제"
                    className="w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 shadow flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              )}
            </div>

            {/* 추천 사이즈 */}
            <div className="mt-3 bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-[10px] text-gray-400">추천 사이즈</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {bodyAnalysis?.recommendedSize?.topNumeric ?? '-'}
{bodyAnalysis?.recommendedSize?.top && bodyAnalysis.recommendedSize.top !== '-' && (
  <span className="text-sm text-gray-400 ml-1">
    ({bodyAnalysis.recommendedSize.top})
  </span>
)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">체형 분석 기반</p>
                {tryOnSelectedClothing && (
                  <p className="text-[10px] text-blue-400 mt-0.5 truncate max-w-[120px]">
                    {tryOnSelectedClothing.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ 우측 50%: AI 추천 상의 리스트 ══════════════════
         *
         * h-full: 좌측과 동일한 높이 유지
         * 내부 구조:
         *   - 헤더 (고정)
         *   - 카드 리스트 (flex-1, overflow-y-auto로 내부 스크롤)
         *   - 스크롤 힌트 (고정)
         ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col min-h-0 lg:flex-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-auto lg:h-full min-h-0">

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">
                 추천 상의
                <span className="text-xs text-gray-400 font-normal ml-1.5">TOP 5</span>
              </h2>
            </div>

            {top5.length === 0 ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                <p className="text-sm text-gray-400">추천 목록 불러오는 중...</p>
              </div>
            ) : (
              <>
                {/*
                 * 카드 리스트 스크롤 컨테이너
                 *
                 * flex-1 min-h-0: 남은 공간만큼만 차지 (min-h-0 없으면 flex 기본값 때문에
                 *                  카드 5개 내용물 크기만큼 계속 팽창해서 overflow가 발동 안 함)
                 * overflow-y: auto → 넘치는 카드부터 내부 스크롤
                 * outline/box-shadow: none → 반짝임 완전 제거
                 */}
                <div
                  className="flex-1 min-h-0"
                  style={{
                    overflowY:      'auto',
                    overflowX:      'hidden',
                    //maxHeight:      `${LIST_MAX_H}px`,
                    outline:        'none',
                    boxShadow:      'none',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#e5e7eb transparent',
                  }}
                  /* focus/tabIndex 없음 → 반짝임 없음 */
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: `${CARD_G}px` }}>
                    {top5.map((product, index) => (
                      <RecommendationCard
                        key={product.id}
                        product={product}
                        rank={index + 1}
                        isSelected={tryOnSelectedClothing?.id === product.id}
                        onSelect={handleSelect}
                        onWishlist={handleWishlist}
                        disabled={isFitting}
                      />
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      {/* 스크롤 컨테이너 outline/glow 전역 제거 */}
      <style>{`
        :focus { outline: none !important; }
        :focus-visible { outline: none !important; box-shadow: none !important; }
        [style*="overflow-y"]::-webkit-scrollbar { width: 4px; }
        [style*="overflow-y"]::-webkit-scrollbar-track { background: transparent; }
        [style*="overflow-y"]::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
      `}</style>

      <div className="mt-6 flex-shrink-0"><NoticeCard /></div>
    </main>
  )
}