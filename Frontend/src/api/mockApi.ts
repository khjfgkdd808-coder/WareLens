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