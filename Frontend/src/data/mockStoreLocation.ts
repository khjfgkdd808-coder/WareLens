// ── 매장 내 위치 안내 Mock 데이터 ───────────────────────────────
//
// 서비스 시나리오: 사용자는 "지금 이 오프라인 매장"에서 서비스를 이용 중이므로
// 여러 매장 목록을 보여줄 필요가 없습니다. 상품이 진열된 층/구역/진열대/동선
// 안내만 제공합니다.
//
// 실제 매장 위치 API가 아직 없어 시연용으로 하드코딩된 데이터를
// 별도 파일로 분리해 관리합니다. 나중에 실제 API가 준비되면
// 이 파일의 함수 `getStoreLocation` 내부 구현만 실제 axios 호출로
// 교체하면 됩니다. (호출부인 StoreLocationModal.tsx는 수정 불필요)

export interface StoreLocation {
  floorInfo: string    // 예: 2층 남성 캐주얼
  section: string      // 예: A-3 진열대
  direction: string    // 예: 입구에서 직진 후 오른쪽 두 번째 통로
}

/** 층/구역 정보 (Mock) */
const FLOOR_INFOS = ['2층 남성 캐주얼', '3층 여성 캐주얼', '1층 스트리트웨어'] as const

/** 진열대 코드 (Mock) */
const SECTIONS = ['A-3 진열대', 'B-1 진열대', 'C-2 진열대', 'D-4 진열대'] as const

/** 동선 안내 문구 (Mock) */
const DIRECTIONS = [
  '입구에서 직진 후 오른쪽 두 번째 통로',
  '입구에서 좌측 에스컬레이터 이용 후 정면',
  '입구에서 직진 후 왼쪽 첫 번째 통로',
  '엘리베이터에서 내려 오른쪽 코너',
] as const

/**
 * 상품 id를 기준으로 결정적(deterministic)인 Mock 매장 위치를 생성합니다.
 * 같은 상품은 새로고침해도 항상 같은 위치를 보여주기 위해
 * 랜덤 대신 id 기반 해시를 사용합니다.
 */
function hashSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * 상품 id 기준 매장 내 위치 조회 (Mock)
 *
 * 실제 매장 위치 API 연동 시:
 *   export async function getStoreLocation(productId: string): Promise<StoreLocation> {
 *     const res = await apiClient.get(`/api/store-location/${productId}`)
 *     return res.data
 *   }
 * 형태로 내부 구현만 교체하면 됩니다. (호출부 코드는 그대로 유지 가능)
 */
export async function getStoreLocation(productId: string): Promise<StoreLocation> {
  const seed = hashSeed(productId)

  return {
    floorInfo: FLOOR_INFOS[seed % FLOOR_INFOS.length],
    section:   SECTIONS[(seed >> 2) % SECTIONS.length],
    direction: DIRECTIONS[(seed >> 4) % DIRECTIONS.length],
  }
}
