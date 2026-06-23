import type { BodyAnalysisResult, AIExplanationResult, Product } from '@/types'

export const MOCK_BODY_ANALYSIS: BodyAnalysisResult = {
  bmi: 21.3,
  bodyType: '보통 체형',
  recommendedSize: { top: 'M', topNumeric: '55', bottom: '27-28 (M)' },
  bodyMeasurements: {
    shoulderWidth: 42, chestCircumference: 98,
    waistCircumference: 78, hipCircumference: 96, legLength: 102,
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
  recommendedSize: 'M',
  confidenceScore: 89,
  reasons: ['업로드 이미지와 높은 스타일 유사도', '체형 분석 결과와 적합', '선호 색상 패턴 반영'],
}

// 상의 중심 Mock 상품 (overlayImageUrl = 가상피팅 PNG 자리)
export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1', name: '린넨 오버핏 셔츠', category: '셔츠/블라우스',
    imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80',
    price: 29000, colors: ['#B0C4DE', '#FFFFFF'],
    similarityScore: 94, recommendBadges: ['어깨 비율 보완', '스타일 유사'],
    fitPosition: { top: '18%', left: '12%', width: '76%' },
  },
  {
    id: '2', name: '베이직 라운드 반팔', category: '반팔 티셔츠',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
    price: 19000, colors: ['#FFFFFF', '#000000', '#6B7280'],
    similarityScore: 91, recommendBadges: ['체형 적합', '스타일 유사'],
    fitPosition: { top: '18%', left: '14%', width: '72%' },
  },
  {
    id: '3', name: '스트라이프 긴팔 티셔츠', category: '긴팔 티셔츠',
    imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80',
    price: 24000, colors: ['#1C1C1C', '#FFFFFF'],
    similarityScore: 88, recommendBadges: ['상체 밸런스 조절'],
    fitPosition: { top: '18%', left: '12%', width: '76%' },
  },
  {
    id: '4', name: '케이블 니트 스웨터', category: '니트/스웨터',
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80',
    price: 45000, colors: ['#F5F5DC', '#C8A882'],
    similarityScore: 85, recommendBadges: ['어깨 비율 보완', '색상 유사'],
    fitPosition: { top: '17%', left: '10%', width: '80%' },
  },
  {
    id: '5', name: '옥스퍼드 버튼다운 셔츠', category: '셔츠/블라우스',
    imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&q=80',
    price: 38000, colors: ['#87CEEB', '#FFFFFF'],
    similarityScore: 82, recommendBadges: ['체형 적합', '스타일 유사'],
    fitPosition: { top: '18%', left: '12%', width: '76%' },
  },
  {
    id: '6', name: '드롭숄더 반팔 티셔츠', category: '반팔 티셔츠',
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80',
    overlayImageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80',
    price: 22000, colors: ['#708090', '#4A5568'],
    similarityScore: 79, recommendBadges: ['상체 밸런스 조절'],
    fitPosition: { top: '18%', left: '10%', width: '80%' },
  },
]

// 체형 분석용 Mock 전신사진 (placeholder)
export const MOCK_FULLBODY_IMAGE = 'https://images.unsplash.com/photo-1594938298603-c8148c4b4d8a?w=400&q=80'
