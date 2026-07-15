import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 300000,
});

export const validateBodyPhoto = async (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  
  try {
    const response = await apiClient.post('/api/recommendations/validate/body', fd);
    return response.data;
  } catch (error: any) {
    // 백엔드에서 전달한 에러 메시지(JSON)가 있다면 추출하여 던집니다.
    if (error.response && error.response.data) {
      throw error.response.data; 
    }
    throw new Error("서버와의 연결이 원활하지 않습니다.");
  }
};

export const getAnalysisResult = async (taskId: string) => {
  const response = await apiClient.get(`/api/recommendations/analysis/${taskId}`);
  return response.data;
};

export const fetchRecommendations = async (params: any) => {
  const response = await apiClient.get(`/api/recommendations`, { params });
  return response.data;
};

export const toggleWishlistApi = async (id: string) => {
  const response = await apiClient.post(`/api/wishlist/toggle/${id}`);
  return response.data;
};

export const uploadImages = async (formData: FormData) => {
  const response = await apiClient.post('/api/recommendations/upload', formData);
  console.log("=== 백엔드 /upload 응답 확인 ===", response.data);
  return response.data;
};

// [신규] 상품 단위 온디맨드 가상피팅 요청 (POST /api/recommendations/tryon)
// 백엔드는 garmentInfo.image_name 만으로 캐시 키를 만들어 동일 상품 재요청 시
// 캐시된 결과를 반환하므로, 프론트에서도 이미 피팅된 상품은 재요청하지 않습니다.
export const requestVirtualTryOn = async (taskId: string, garmentInfo: Record<string, unknown>) => {
  const response = await apiClient.post('/api/recommendations/tryon', {
    taskId,
    garment_info: garmentInfo,
  });
  return response.data;
};

// [신규] 가상피팅 결과 이미지 갤러리 저장 (POST /api/recommendations/gallery/save-fitting)
export const saveFittingToGallery = async (taskId: string, file: File) => {
  const formData = new FormData();
  formData.append('taskId', taskId);
  formData.append('file', file);
  const response = await apiClient.post('/api/recommendations/gallery/save-fitting', formData);
  return response.data;
};