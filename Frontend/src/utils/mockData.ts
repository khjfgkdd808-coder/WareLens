import type { BodyAnalysisResult, AIExplanationResult, Product } from '@/types'

export const MOCK_BODY_ANALYSIS: BodyAnalysisResult = {
  bmi: 21.3,
  bodyType: '보통 체형',
  recommendedSize: { top: 'M', topNumeric: '55', bottom: '27-28 (M)' },
  bodyMeasurements: {
    shoulderWidth: 42,
    chestCircumference: 98,
    waistCircumference: 78,
    hipCircumference: 96,
    legLength: 102,
  },
  reasons: [
    'BMI 21.3으로 정상 범위에 해당합니다.',
    '어깨와 골반 비율이 균형에 가까운 체형입니다.',
    '키 175cm, 몸무게 65kg 기준 표준 체형에 적합한 사이즈를 추천합니다.',
    'KS 표준 사이즈 데이터를 기반으로 가장 적합한 사이즈를 계산했습니다.',
  ],
}

export const MOCK_AI_EXPLANATION: AIExplanationResult = {
  analyzedImageCount: 5,
  preferredCategories: [
    { category: '상의',   percentage: 40 },
    { category: '니트',   percentage: 30 },
    { category: '하의',   percentage: 20 },
    { category: '아우터', percentage: 10 },
  ],
  recommendedSize: 'M',
  confidenceScore: 89,
  reasons: [
    '업로드 이미지와 높은 스타일 유사도',
    '체형 분석 결과와 적합',
    '선호 색상 패턴 반영',
  ],
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1', name: '스트라이프 니트 원피스', category: '원피스',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80',
    price: 39000, colors: ['#3B3B3B', '#1A56DB'], similarityScore: 92,
    recommendBadges: ['색상 유사', '스타일 유사'],
  },
  {
    id: '2', name: '린넨 셔츠', category: '상의',
    imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80',
    price: 29000, colors: ['#B0C4DE'], similarityScore: 89,
    recommendBadges: ['스타일 유사', '체형 적합'],
  },
  {
    id: '3', name: '싱글 블레이저', category: '아우터',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    price: 79000, colors: ['#8B7355', '#2F4F4F'], similarityScore: 87,
    recommendBadges: ['체형 적합'],
  },
  {
    id: '4', name: '플레어 원피스', category: '원피스',
    imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80',
    price: 69000, colors: ['#1C1C1C', '#4169E1'], similarityScore: 85,
    recommendBadges: ['색상 유사', '체형 적합'],
  },
  {
    id: '5', name: '와이드 데님 팬츠', category: '하의',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
    price: 49000, colors: ['#4682B4'], similarityScore: 83,
    recommendBadges: ['스타일 유사'],
  },
  {
    id: '6', name: '라운드 니트', category: '니트',
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80',
    price: 35000, colors: ['#F5F5DC', '#2F4F4F'], similarityScore: 80,
    recommendBadges: ['색상 유사', '스타일 유사'],
  },
  {
    id: '7', name: '오버핏 코튼 티셔츠', category: '상의',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
    price: 25000, colors: ['#FFFFFF', '#000000'], similarityScore: 78,
    recommendBadges: ['체형 적합'],
  },
  {
    id: '8', name: '슬림 치노 팬츠', category: '하의',
    imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
    price: 45000, colors: ['#C8A882'], similarityScore: 76,
    recommendBadges: ['스타일 유사', '체형 적합'],
  },
  {
    id: '9', name: '크롭 가디건', category: '니트',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80',
    price: 42000, colors: ['#DEB887'], similarityScore: 74,
    recommendBadges: ['색상 유사'],
  },
  {
    id: '10', name: '트렌치코트', category: '아우터',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80',
    price: 125000, colors: ['#C8A882'], similarityScore: 72,
    recommendBadges: ['체형 적합'],
  },
  {
    id: '11', name: 'A라인 미니 스커트', category: '하의',
    imageUrl: 'https://images.unsplash.com/photo-1561861422-a549073e547a?w=400&q=80',
    price: 33000, colors: ['#1C1C1C'], similarityScore: 70,
    recommendBadges: ['스타일 유사'],
  },
  {
    id: '12', name: 'V넥 니트 베스트', category: '니트',
    imageUrl: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=400&q=80',
    price: 38000, colors: ['#708090'], similarityScore: 68,
    recommendBadges: ['색상 유사', '체형 적합'],
  },
]
