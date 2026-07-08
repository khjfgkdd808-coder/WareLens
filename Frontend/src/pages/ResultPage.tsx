import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Shirt, X, Save } from "lucide-react";
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'
import axios from 'axios';
// Toast 알림을 위한 라이브러리 (설치 필요: npm install react-hot-toast)
import toast from 'react-hot-toast'; 

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [tryOnImages, setTryOnImages] = useState<any[]>([]);
  // [수정] 초기값 5로 설정
  const [visibleCount, setVisibleCount] = useState(5);
  // [추가] 피팅 요청 진행 상태 관리
  const [isFitting, setIsFitting] = useState(false); 

  const {
    bodyAnalysis, products, setBodyAnalysis, setProducts, 
    setRecommendStatus, recommendStatus, openErrorModal
  } = useAppStore()

  useEffect(() => {
    if (!taskId || taskId === 'undefined') { navigate('/', { replace: true }); return; }
    setRecommendStatus('loading');
    fetchRecommendations({ taskId })
      .then((res) => {
        if (res.body_analysis) setBodyAnalysis(res.body_analysis);
        if (res.top5_tryon_images) setTryOnImages(res.top5_tryon_images);
        setProducts(res.clip_recommendations?.recommendations || [], 0, false);
        setRecommendStatus('success');
      })
      .catch(() => { setRecommendStatus('error'); openErrorModal('RECOMMENDATION_FAILED'); });
  }, [taskId]);

  const handleTryOn = async (item: any) => {
    // 중복 피팅 방지
    const isAlreadyInGallery = tryOnImages.some(
        (img) => img.garment_info?.image_name === item.image_name
    );
    if (isAlreadyInGallery) {
        toast.error("이미 피팅된 상품입니다.");
        return;
    }

    setIsFitting(true); // [추가] 로딩 시작
    
    try {
        const res = await axios.post('http://localhost:8080/api/recommendations/tryon', {
            taskId: taskId,
            garment_info: item
        });
        
        const newTryOn = { 
            data: res.data.data, 
            garment_info: item 
        };
        
        setTryOnImages(prev => [...prev, newTryOn]);
        // [수정] alert 대신 toast 메시지로 변경
        toast.success("가상 피팅이 완료되었습니다.", { duration: 2000 });
    } catch (error) {
        console.error(">>> [LOG] 피팅 요청 실패", error);
        // [수정] alert 대신 toast 에러 메시지로 변경
        toast.error("피팅 요청에 실패했습니다.");
    } finally {
        setIsFitting(false); // [추가] 로딩 종료
    }
  };

  const handleSave = async (item: any) => {
    const saveLoadingToast = toast.loading('저장 중...');
    try {
        const base64Data = item.data?.tryon_image_base64;
        if (!base64Data) {
            toast.error("저장할 이미지가 없습니다.", { id: saveLoadingToast });
            return;
        }

        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const file = new File([ab], `fitting_${Date.now()}.png`, { type: 'image/png' });
        
        const formData = new FormData();
        formData.append("taskId", taskId || "unknown");
        formData.append("file", file);

        await axios.post('http://localhost:8080/api/recommendations/gallery/save-fitting', formData);
        toast.success("성공적으로 저장되었습니다!", { id: saveLoadingToast });
    } catch (error) {
        console.error(">>> [LOG] 갤러리 저장 실패", error);
        toast.error("저장에 실패했습니다.", { id: saveLoadingToast });
    }
  };

  const handleDelete = (indexToDelete: number) => {
    setTryOnImages(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  if (recommendStatus === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-600"><ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기</button>

      <section className="bg-white p-8 rounded-2xl shadow-sm border mb-10">
        <h1 className="text-2xl font-bold mb-6">분석 결과 리포트</h1>
        <p className="text-4xl font-extrabold text-blue-600 mb-4">{bodyAnalysis?.data?.size_analysis?.final_size}</p>
        <p className="text-gray-700">{bodyAnalysis?.data?.size_analysis?.fit_desc}</p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6">나의 가상 피팅 갤러리</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[350px]"> {/* [수정] 최소 높이 설정으로 카드 유지 */}
          {tryOnImages.map((item, index) => (
            <div key={index} className="relative flex-none w-64 bg-white p-2 rounded-xl border shadow-sm">
              <button onClick={() => handleDelete(index)} className="absolute top-4 right-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="w-4 h-4" /></button>
              <button onClick={() => handleSave(item)} className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-1 hover:bg-green-600"><Save className="w-4 h-4" /></button>
              <img 
                src={item.data?.tryon_image_base64 ? `data:image/png;base64,${item.data.tryon_image_base64}` : ''} 
                className="w-full aspect-[3/4] object-cover rounded-lg" 
              />
              <p className="text-xs mt-2 font-bold text-center">{item.garment_info?.article_type}</p>
            </div>
          ))}

          {/* [추가] 피팅 중일 때 보여줄 로딩 카드 */}
          {isFitting && (
            <div className="flex-none w-64 bg-gray-50 p-2 rounded-xl border border-dashed flex flex-col items-center justify-center animate-pulse">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-600">가상 피팅 중입니다...</p>
              <p className="text-[10px] text-gray-400">잠시만 기다려주세요</p>
            </div>
          )}
        </div>
      </section>

      <h2 className="text-xl font-bold mb-6">추천 상품 목록</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {products.slice(0, visibleCount).map((item: any, index: number) => (
          <div key={index} className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all">
            <img src={`http://localhost:8080/fashion_images/${item.image_name}`} className="w-full aspect-square object-cover rounded-lg mb-3" />
            <div className="space-y-1 mb-3">
              <p className="font-bold text-sm truncate">{item.article_type}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.score}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.sub_category}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.pattern}</p>
            </div>
            <button 
                onClick={() => handleTryOn(item)} 
                className={`w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 ${isFitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isFitting}
            >
              <Shirt className="w-4 h-4" /> {isFitting ? '피팅 중...' : '피팅해보기'}
            </button>
          </div>
        ))}
      </div>

      {products.length > visibleCount && (
        <div className="text-center mt-12 mb-20">
          <button 
            onClick={() => setVisibleCount(prev => prev + 5)} 
            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold transition-colors"
          >
            더보기
          </button>
        </div>
      )}
    </main>
  )
}