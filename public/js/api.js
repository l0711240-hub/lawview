// public/js/api.js
// 서버 프록시를 통해 법령정보 API를 호출하는 클라이언트 모듈

const BASE = '';  // 같은 서버이므로 경로만 사용

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(BASE + url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    console.error('[API 오류]', url, e.message);
    throw e;
  }
}

// ── 법령 ──
export async function searchLaw(query, { page = 1, display = 20 } = {}) {
  return apiFetch(`/api/law/search?query=${encodeURIComponent(query)}&page=${page}&display=${display}`);
}
export async function getLawDetail(mst) {
  return apiFetch(`/api/law/detail/${mst}`);
}
// 조문 팝업용: lawName = "형법 제268조" 형태를 분리해서 호출
export async function getLawArticleByName(lawName) {
  // "형법 제268조" → query=형법 으로 먼저 검색해서 mst 획득 후 조문 조회
  const matched = lawName.match(/^(.+?)\s+제(\d+)조/);
  if (!matched) return null;
  const [, name, jo] = matched;
  const srch = await searchLaw(name, { display: 1 });
  if (!srch.items?.length) return null;
  const mst = srch.items[0].mst;
  return apiFetch(`/api/law/article?mst=${mst}&jo=${jo}`);
}

// ── 판례 ──
export async function searchPrecedent(query, { page = 1, display = 20, court = '' } = {}) {
  return apiFetch(`/api/precedent/search?query=${encodeURIComponent(query)}&page=${page}&display=${display}&court=${court}`);
}
export async function getPrecedentDetail(id) {
  return apiFetch(`/api/precedent/detail/${id}`);
}

// ── 용어 사전 ──
export async function getTerms()          { return apiFetch('/api/term'); }
export async function addTerm(data)       { return apiFetch('/api/term', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }); }
export async function deleteTerm(word)    { return apiFetch(`/api/term/${encodeURIComponent(word)}`, { method:'DELETE' }); }
