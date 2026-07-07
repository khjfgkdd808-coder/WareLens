import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 300000,
});

// 모든 API 함수를 명시적으로 export
export const validateBodyPhoto = async (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  const response = await apiClient.post('/api/recommendations/validate/body', fd);
  return response.data;
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
  
  // [디버깅 코드 추가]
  console.log("=== 백엔드 /upload 응답 확인 ===", response.data);
  
  return response.data;
};