// src/utils/pokeapi.js
const BASE_URL = 'https://pokeapi.co/api/v2';

// 간단한 캐시 객체
const cache = {};

/**
 * 캐시 또는 네트워크를 통해 데이터 가져오기
 * @param {string} url - 가져올 API URL
 * @returns {Promise<any>} API 응답 데이터
 */
const fetchWithCache = async (url) => {
    if (cache[url]) {
        // console.log("Cache hit:", url);
        return cache[url];
    }
    // console.log("Fetching:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status} - ${url}`);
        }
        const data = await response.json();
        cache[url] = data; // 결과 캐싱
        return data;
    } catch (error) {
        console.error("fetchWithCache Error:", error);
        throw error; // 에러 다시 던지기
    }
};

/**
 * 모든 세대 목록 가져오기
 * @returns {Promise<Array<{name: string, url: string}>>} 세대 목록
 */
export const fetchGenerationList = async () => {
    const url = `${BASE_URL}/generation`;
    const data = await fetchWithCache(url);
    // count 제외하고 results만 반환
    return data.results || []; // 결과 없으면 빈 배열 반환
};

/**
 * 특정 세대의 상세 정보 가져오기 (포켓몬 종 목록 포함)
 * @param {string} url - 세대 상세 정보 URL
 * @returns {Promise<object>} 세대 상세 정보 (pokemon_species 포함)
 */
export const fetchGenerationDetails = async (url) => {
    const data = await fetchWithCache(url);
    // pokemon_species 배열이 있는지 확인
    if (!data.pokemon_species) {
        console.warn(`Generation details at ${url} does not contain 'pokemon_species'.`);
        data.pokemon_species = []; // 없으면 빈 배열로 설정
    }
    return data;
};

/**
 * 포켓몬 총 '종' 개수 가져오기 (엔드포인트 변경됨)
 * @returns {Promise<number>} 포켓몬 총 종 개수
 */
export const fetchPokemonCount = async () => {
    const url = `${BASE_URL}/pokemon-species?limit=1`; // species 엔드포인트 사용
    const data = await fetchWithCache(url);
    return data.count;
};

/**
 * 포켓몬 '종' 목록 가져오기 (엔드포인트 및 처리 로직 변경됨)
 * @param {number | null} limit - 가져올 개수 (null이면 전체)
 * @param {number} offset - 시작 위치
 * @returns {Promise<Array<object>>} 포켓몬 목록 (id, name, url, spriteUrl 포함)
 */
export const fetchPokemonList = async (limit = null, offset = 0) => {
  let actualLimit = limit;
  if (limit === null) { // limit이 null이면 전체 가져오기
      try {
          // species count 사용
          actualLimit = await fetchPokemonCount();
          console.log(`Workspaceing all ${actualLimit} Pokemon species...`);
          // 실제 데이터가 있는 ID 상한선 고려 (예: 1025) - API 변경 시 조정 필요
          // PokeAPI가 가끔 count보다 적은 species를 포함할 수 있으므로, 넉넉하게 요청
          // actualLimit = Math.min(actualLimit, 1025); // 필요 시 상한 설정
      } catch (error) {
          console.error("Failed to fetch Pokemon species count:", error);
          throw new Error("Could not determine total Pokemon species count.");
      }
  }
  if (actualLimit === 0) return [];

  // species 엔드포인트 사용
  const url = `${BASE_URL}/pokemon-species?limit=${actualLimit}&offset=${offset}`;
  const data = await fetchWithCache(url);

  // species 목록 처리: 이름, ID, 스프라이트 URL 추출
  console.log(`[fetchPokemonList from Species] API returned ${data.results?.length ?? 0} species results for limit=${actualLimit}`);
  if (!data.results) {
      console.error("No results array found in pokemon-species response:", data);
      return []; // 결과 없으면 빈 배열 반환
  }

  const processedResults = data.results.map(species => {
      // species.url에서 ID 추출
      const urlParts = species.url.split('/');
      const id = urlParts[urlParts.length - 2];
      const numId = parseInt(id, 10);

      // ID가 유효하지 않거나 너무 크면 제외 (예: 10000 초과는 다른 폼일 가능성 높음)
       if (isNaN(numId) || numId <= 0 || numId > 1025) { // 1025는 9세대 마지막 포켓몬 기준 (대략)
            // console.log(`Skipping species with invalid or high ID: ${id}`);
           return null;
       }

      // 기본 폼 스프라이트 URL 생성
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
      // 실제 포켓몬 데이터 URL 생성
      const detailUrl = `${BASE_URL}/pokemon/${id}/`;

      return {
          name: species.name, // 종 이름
          url: detailUrl,     // 상세 정보 URL (pokemon)
          id: numId,
          spriteUrl: spriteUrl
      };
  }).filter(p => p !== null); // null 제거 (필터링된 항목 제외)

  // ID 순서대로 정렬
  processedResults.sort((a, b) => a.id - b.id);
  return processedResults;
};


/**
 * 특정 포켓몬의 상세 정보 가져오기
 * @param {string|number} urlOrId - 포켓몬 URL 또는 ID
 * @returns {Promise<object>} 포켓몬 상세 정보
 */
export const fetchPokemonDetails = async (urlOrId) => {
    const url = typeof urlOrId === 'string' && urlOrId.startsWith('http') ? urlOrId : `${BASE_URL}/pokemon/${urlOrId}`;
    const data = await fetchWithCache(url);
    if (!data.stats || !data.moves || !data.sprites) {
        console.warn(`Pokemon details for ${urlOrId} might be incomplete.`);
    }
    return data;
};

/**
 * 특정 기술의 상세 정보 가져오기
 * @param {string|number} urlOrId - 기술 URL 또는 ID
 * @returns {Promise<object>} 기술 상세 정보
 */
export const fetchMoveDetails = async (urlOrId) => {
    const url = typeof urlOrId === 'string' && urlOrId.startsWith('http') ? urlOrId : `${BASE_URL}/move/${urlOrId}`;
    const data = await fetchWithCache(url);
    if (!data.type || data.accuracy === undefined) {
        console.warn(`Move details for ${urlOrId} might be incomplete.`);
    }
    return data;
};

/**
 * 특정 타입의 상세 정보 가져오기 (상성 관계 포함)
 * @param {string|number} urlOrId - 타입 URL 또는 ID
 * @returns {Promise<object>} 타입 상세 정보
 */
export const fetchTypeDetails = async (urlOrId) => {
    const url = typeof urlOrId === 'string' && urlOrId.startsWith('http') ? urlOrId : `${BASE_URL}/type/${urlOrId}`;
    const data = await fetchWithCache(url);
    if (!data.damage_relations) {
        console.warn(`Type details for ${urlOrId} does not contain 'damage_relations'.`);
        data.damage_relations = { double_damage_to: [], half_damage_to: [], no_damage_to: [] };
    }
    return data;
};

/**
 * 전체 타입 상성표 생성 및 반환 (캐싱)
 * @returns {Promise<object|null>} 타입 상성표 객체 또는 실패 시 null
 */
let typeChartCache = null;
export const getTypeChart = async () => {
    if (typeChartCache) return typeChartCache;
    console.log("타입 상성표 로딩 중...");
    try {
        const typeListUrl = `${BASE_URL}/type?limit=999`;
        const typeListResponse = await fetchWithCache(typeListUrl);
        if (!typeListResponse.results) throw new Error("No results in type list.");
        const typeDetailsPromises = typeListResponse.results.map(type => fetchTypeDetails(type.url));
        const typeDetailsList = await Promise.all(typeDetailsPromises);
        const chart = {};
        typeDetailsList.forEach(typeDetail => {
            if (typeDetail && typeDetail.name && typeDetail.damage_relations) {
                const typeName = typeDetail.name;
                chart[typeName] = {
                    double_damage_to: typeDetail.damage_relations.double_damage_to?.map(t => t.name) || [],
                    half_damage_to: typeDetail.damage_relations.half_damage_to?.map(t => t.name) || [],
                    no_damage_to: typeDetail.damage_relations.no_damage_to?.map(t => t.name) || [],
                };
            } else { console.warn(`Invalid type detail skipped: ${typeDetail?.name}`); }
        });
        typeChartCache = chart;
        console.log("타입 상성표 로딩 완료.");
        return chart;
    } catch (error) { console.error("타입 상성표 생성 실패:", error); return null; }
};

// 앱 시작 시 타입 상성표 미리 로드 (index.js 등에서 호출 권장)
// getTypeChart();