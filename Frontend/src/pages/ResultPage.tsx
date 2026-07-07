import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Shirt, X } from "lucide-react";
import { useAppStore } from '@/store/useAppStore'
import { fetchRecommendations } from '@/api/mockApi'

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [tryOnImages, setTryOnImages] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);

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

  const handleTryOn = (item: any) => {
    const newTryOn = {
        data: { tryon_image_base64: "..." }, 
        garment_info: item
    };
    setTryOnImages(prev => [...prev, newTryOn]); 
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {tryOnImages.map((item, index) => (
            <div key={index} className="relative flex-none w-64 bg-white p-2 rounded-xl border shadow-sm">
              <button onClick={() => handleDelete(index)} className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"><X className="w-4 h-4" /></button>
              <img src={`data:image/png;base64,${item.data.tryon_image_base64}`} className="w-full aspect-[3/4] object-cover rounded-lg" />
              <p className="text-xs mt-2 font-bold text-center">{item.garment_info?.article_type}</p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="text-xl font-bold mb-6">추천 상품 목록</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {products.slice(0, visibleCount).map((item: any, index: number) => (
          <div key={index} className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all">
            <img src={`http://localhost:8080/fashion_images/${item.image_name}`} className="w-full aspect-square object-cover rounded-lg mb-3" />
            
            {/* [수정: 상품 정보 상세 표시] */}
            <div className="space-y-1 mb-3">
              <p className="font-bold text-sm truncate">{item.article_type}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.color} / {item.fabric}</p>
              <p className="text-[10px] text-gray-400">{item.season} • {item.fit} Fit</p>
            </div>

            <button onClick={() => handleTryOn(item)} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
              <Shirt className="w-4 h-4" /> 피팅해보기
            </button>
          </div>
        ))}
      </div>

      {visibleCount < products.length && (
        <div className="text-center mt-12 mb-20">
          <button onClick={() => setVisibleCount(prev => prev + 5)} className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full font-bold transition-colors">
            더보기
          </button>
        </div>
      )}
    </main>
  )
}