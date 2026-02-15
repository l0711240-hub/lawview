// public/js/app.js
import * as API from './api.js';

// ════════════════════════════
// 상태
// ════════════════════════════
let termDB    = {};
let homeType  = 'all';
let iMatches  = [], iIdx = 0, iLastQ = '';
let currentDetailType = null;
let currentDetailId   = null;

// ════════════════════════════
// 초기화
// ════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  termDB = await API.getTerms().catch(() => ({}));
  renderTermCount();
  // 페이지 상태 초기화
  document.getElementById('subpage').style.display = 'none';
  document.getElementById('detail').style.display  = 'none';
});

// ════════════════════════════
// 테마
// ════════════════════════════
window.toggleTheme = () => document.body.classList.toggle('light-mode');

// ════════════════════════════
// 페이지 전환
// ════════════════════════════
function showOnly(id) {
  ['home', 'subpage', 'detail'].forEach(p => {
    const el = document.getElementById(p);
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.classList.add('active');
  el.style.display = id === 'detail' ? 'flex' : 'block';
}

window.goHome = () => showOnly('home');

window.goSub = (tab) => {
  showOnly('subpage');
  ['cases', 'laws', 'guide'].forEach(t => {
    const n = document.getElementById('sn-' + t);
    if (n) n.classList.toggle('active', t === tab);
  });
  renderSubContent(tab);
};

// ── 서브 페이지 렌더 ──
function renderSubContent(tab) {
  const el = document.getElementById('subContent');
  if (tab === 'cases') {
    el.innerHTML = `
      <div class="sub-header"><h2>판례 검색</h2></div>
      <div class="sub-body">
        <div class="full-sb">
          <input id="cSrch" placeholder="판례번호, 키워드, 당사자명..." onkeydown="if(event.key==='Enter')window.doCaseSearch()">
          <select class="fsel" id="cCourt">
            <option value="">법원 전체</option>
            <option value="400">대법원</option>
            <option value="500">헌법재판소</option>
            <option value="300">고등법원</option>
            <option value="200">지방법원</option>
          </select>
          <button class="go-btn" onclick="window.doCaseSearch()">검색</button>
        </div>
        <div id="cRes"><div class="hint-text">검색어를 입력하세요</div></div>
      </div>`;
  } else if (tab === 'laws') {
    el.innerHTML = `
      <div class="sub-header"><h2>법령 데이터베이스</h2></div>
      <div class="sub-body">
        <div class="full-sb">
          <input id="lSrch" placeholder="법령명, 조문, 키워드..." onkeydown="if(event.key==='Enter')window.doLawSearch()">
          <button class="go-btn" onclick="window.doLawSearch()">검색</button>
        </div>
        <div class="law-cat-grid">
          ${['형법','민법','헌법','형사소송법','상법','근로기준법','의료법','저작권법'].map(n =>
            `<div class="lcat" onclick="window.doLawSearchByKw('${n}')">${n}</div>`).join('')}
        </div>
        <div id="lRes"><div class="hint-text">법령을 검색하거나 분야를 선택하세요</div></div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="sub-header"><h2>사용 가이드</h2></div>
      <div class="sub-body">
        <div class="guide-grid">
          <div class="gcard"><h3>판례 열람</h3>
            <div class="gstep"><div class="snum">1</div><p>판례번호 또는 키워드로 검색합니다.</p></div>
            <div class="gstep"><div class="snum">2</div><p>결과 클릭 → 상세 뷰어로 이동합니다.</p></div>
            <div class="gstep"><div class="snum">3</div><p>밑줄 용어 클릭 → 우측 패널 해설 확인.</p></div>
            <div class="gstep"><div class="snum">4</div><p>'연계 판례' 탭에서 상·하급심 이동.</p></div>
          </div>
          <div class="gcard"><h3>법령 열람</h3>
            <div class="gstep"><div class="snum">1</div><p>법령 DB에서 카테고리 또는 법령명 검색.</p></div>
            <div class="gstep"><div class="snum">2</div><p>판례 본문의 파란색 법령명 클릭 → 팝업 조문 확인.</p></div>
            <div class="gstep"><div class="snum">3</div><p>팝업의 '이동' 버튼 → 법령 전문 뷰어.</p></div>
          </div>
          <div class="gcard"><h3>용어 사전 편집</h3>
            <p>판례 뷰어 우측 '용어 해설' 탭 → ⊞ 버튼으로 용어 추가·삭제 가능. 서버에 저장됩니다.</p>
            <p style="margin-top:8px;">코드로 직접 추가: <code>data/terms.json</code> 파일 편집.</p>
          </div>
          <div class="gcard"><h3>API 연동 구조</h3>
            <p><code>server/lawApi.js</code> → 국가법령정보 API 호출 프록시<br>
            <code>server/routes/law.js</code> → 법령 엔드포인트<br>
            <code>server/routes/precedent.js</code> → 판례 엔드포인트<br>
            <code>.env</code> → OC 키 설정 파일</p>
          </div>
        </div>
      </div>`;
  }
}

// ════════════════════════════
// 홈 검색
// ════════════════════════════
window.hTab = (t) => {
  homeType = t;
  ['all','case','law'].forEach(x => document.getElementById('ht-'+x).classList.toggle('active', x===t));
};
window.setSearch = (q) => { document.getElementById('hSrch').value = q; doHomeSearch(); };

window.doHomeSearch = async () => {
  const q   = document.getElementById('hSrch').value.trim();
  const box = document.getElementById('homeResults');
  if (!q) { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; return; }

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const [cases, laws] = await Promise.allSettled([
      homeType !== 'law'  ? API.searchPrecedent(q) : Promise.resolve({ items: [] }),
      homeType !== 'case' ? API.searchLaw(q)       : Promise.resolve({ items: [] }),
    ]);
    let html = '';
    (cases.value?.items || []).slice(0,4).forEach(c => { html += caseCard(c, `window.goDetail('case','${c.id}')`); });
    (laws.value?.items  || []).slice(0,3).forEach(l => { html += lawCard(l,  `window.goDetail('law','${l.mst}')`); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
};

// ════════════════════════════
// 판례 검색 (서브 페이지)
// ════════════════════════════
window.doCaseSearch = async () => {
  const q     = (document.getElementById('cSrch')?.value || '').trim();
  const court = document.getElementById('cCourt')?.value || '';
  const box   = document.getElementById('cRes');
  if (!q) { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; return; }

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const data = await API.searchPrecedent(q, { court, display: 30 });
    let html = '';
    (data.items || []).forEach(c => { html += caseCardBig(c); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
};

// ════════════════════════════
// 법령 검색 (서브 페이지)
// ════════════════════════════
window.doLawSearch       = async () => doLawSearchByKw(document.getElementById('lSrch')?.value || '');
window.doLawSearchByKw   = doLawSearchByKw;

async function doLawSearchByKw(kw) {
  const inp = document.getElementById('lSrch');
  if (inp) inp.value = kw;
  const box = document.getElementById('lRes');
  if (!kw.trim()) return;

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const data = await API.searchLaw(kw, { display: 30 });
    let html = '';
    (data.items || []).forEach(l => { html += lawCardBig(l); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
}

// ════════════════════════════
// 상세 뷰어
// ════════════════════════════
window.goDetail = async (type, id) => {
  currentDetailType = type;
  currentDetailId   = id;
  showOnly('detail');
  clearInlineSearch();
  showTab('terms');

  const body = document.getElementById('caseBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span style="margin-left:10px;color:var(--text-muted);">불러오는 중...</span></div>';

  try {
    if (type === 'case') {
      const data = await API.getPrecedentDetail(id);
      renderCaseDetail(data);
    } else {
      const data = await API.getLawDetail(id);
      renderLawDetail(data);
    }
  } catch (e) {
    body.innerHTML = `<div class="hint-text error">불러오기 실패: ${e.message}</div>`;
  }
};

// ── 판례 본문 렌더 ──
function renderCaseDetail(d) {
  document.getElementById('dNum').textContent    = `${d.court || ''} ${d.caseNum || ''}`;
  document.getElementById('dChip1').textContent  = d.category || '판례';
  document.getElementById('dChip2').textContent  = d.result   || '';
  document.getElementById('dChip2').style.display = d.result ? '' : 'none';

  // 참조조문에서 법령 링크 생성
  const refLawsHtml = d.refLaws
    ? d.refLaws.replace(/([\w가-힣]+법\s*제\d+조[의\d조항호목]*)/g,
        m => `<span class="law-ref" onclick="window.openLawPopup('${m}')">${m}</span>`)
    : '';

  // 판례내용 정제 (API HTML 태그 처리)
  const fullText = (d.fullText || '본문을 불러올 수 없습니다.')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  document.getElementById('caseBody').innerHTML = `
    <div class="case-hd">
      <div class="case-court-badge">⚖ ${d.court || ''}</div>
      <h1 class="case-title">${d.caseName || d.caseNum || ''}</h1>
      <div class="case-meta">
        <span class="mi"><span class="ml">사건번호</span>${d.caseNum || ''}</span>
        <span class="mi"><span class="ml">선고일</span>${formatDate(d.date)}</span>
        <span class="mi"><span class="ml">결과</span>${d.result || ''}</span>
      </div>
    </div>
    ${d.summary ? `<div class="ls"><div class="lt">판시사항</div><div class="lbody">${d.summary}</div></div>` : ''}
    ${d.gist    ? `<div class="ls"><div class="lt">판결요지</div><div class="lbody">${d.gist}</div></div>`    : ''}
    ${refLawsHtml ? `<div class="ls"><div class="lt">참조조문</div><div class="lbody">${refLawsHtml}</div></div>` : ''}
    ${d.refCases  ? `<div class="ls"><div class="lt">참조판례</div><div class="lbody ref-cases">${d.refCases}</div></div>` : ''}
    <div class="ls" id="fullTextSection">
      <div class="lt">판례 전문</div>
      <div class="lbody" style="white-space:pre-wrap;">${fullText}</div>
    </div>
    <div style="height:80px;"></div>`;

  renderLeftPanel('case', d);
  setTimeout(() => { applyTermHighlighting(); buildAutoTermList(); }, 80);
}

// ── 법령 본문 렌더 ──
function renderLawDetail(d) {
  document.getElementById('dNum').textContent    = `법령 · ${d.name || ''}`;
  document.getElementById('dChip1').textContent  = d.type || '법령';
  document.getElementById('dChip1').className    = 'chip chip-b';
  document.getElementById('dChip2').style.display = 'none';

  const articlesHtml = (d.articles || []).map(a => `
    <div class="ls" id="art-${a.num}">
      <div class="lt"><span class="ln">제${a.num}조</span>${a.title ? ' ' + a.title : ''}</div>
      <div class="lbody">${a.content || ''}
        ${a.items.map(h => `<div style="padding-left:1.2em;">②${h.content}</div>`).join('')}
      </div>
    </div>`).join('');

  document.getElementById('caseBody').innerHTML = `
    <div class="case-hd">
      <div class="case-court-badge">📄 ${d.type || '법령'}</div>
      <h1 class="case-title">${d.name || ''}</h1>
      <div class="case-meta">
        <span class="mi"><span class="ml">소관부처</span>${d.department || ''}</span>
        <span class="mi"><span class="ml">공포일</span>${formatDate(d.promulgDate)}</span>
        <span class="mi"><span class="ml">시행일</span>${formatDate(d.enforcDate)}</span>
      </div>
    </div>
    ${articlesHtml || '<div class="hint-text">조문 정보를 불러올 수 없습니다.</div>'}
    <div style="height:80px;"></div>`;

  renderLeftPanel('law', d);
  setTimeout(() => { applyTermHighlighting(); buildAutoTermList(); }, 80);
}

// ── 좌측 패널 (TOC) 렌더 ──
function renderLeftPanel(type, d) {
  const el = document.getElementById('panelLeft');
  if (type === 'law') {
    const items = (d.articles || []).slice(0, 30).map(a =>
      `<div class="toc" onclick="scrollToArt('art-${a.num}',this)">제${a.num}조${a.title ? ' ' + a.title : ''}</div>`
    ).join('');
    el.innerHTML = `<div class="pst">조문 목차</div>${items}`;
  } else {
    el.innerHTML = `
      <div class="pst">정보</div>
      <div class="toc-info"><span class="ml">법원</span>${d.court || ''}</div>
      <div class="toc-info"><span class="ml">선고일</span>${formatDate(d.date)}</div>
      <div class="toc-info"><span class="ml">결과</span>${d.result || ''}</div>
      <div class="tdivider"></div>
      <div class="pst">섹션</div>
      ${d.summary ? '<div class="toc" onclick="scrollToSection(\'판시사항\',this)">판시사항</div>' : ''}
      ${d.gist    ? '<div class="toc" onclick="scrollToSection(\'판결요지\',this)">판결요지</div>' : ''}
      ${d.refLaws ? '<div class="toc" onclick="scrollToSection(\'참조조문\',this)">참조조문</div>' : ''}
      <div class="toc active" onclick="scrollToSection(\'판례 전문\',this)">판례 전문</div>`;
  }
}

// ════════════════════════════
// 법령 팝업
// ════════════════════════════
window.openLawPopup = async (lawName) => {
  document.getElementById('lmTitle').textContent = lawName;
  document.getElementById('lmSub').textContent   = '조문 불러오는 중...';
  document.getElementById('lmBody').innerHTML    = '<div class="loading-wrap"><div class="spinner"></div></div>';
  document.getElementById('lmRef').textContent   = '';
  document.getElementById('lawModal').classList.add('show');

  try {
    const data = await API.getLawArticleByName(lawName);
    if (!data) { document.getElementById('lmSub').textContent = '조문을 찾을 수 없습니다.'; return; }
    document.getElementById('lmSub').textContent = '';
    document.getElementById('lmRef').textContent = `제${data.num}조 ${data.title || ''}`;
    document.getElementById('lmBody').innerHTML  = `<div class="lbody">${data.content || ''}${
      (data.items || []).map(h => `<div style="padding-left:1.2em;margin-top:4px;">${h.num} ${h.content}</div>`).join('')
    }</div>`;

    // 해당 법률로 이동
    const matched = lawName.match(/^(.+?)\s+제\d+조/);
    if (matched) {
      document.getElementById('lmGoBtn').onclick = async () => {
        document.getElementById('lawModal').classList.remove('show');
        const srch = await API.searchLaw(matched[1], { display: 1 });
        if (srch.items?.length) window.goDetail('law', srch.items[0].mst);
      };
    }
  } catch (e) {
    document.getElementById('lmSub').textContent = `오류: ${e.message}`;
  }
};
window.closeLawModal = (e) => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); };

// ════════════════════════════
// 용어 사전
// ════════════════════════════
function applyTermHighlighting() {
  document.querySelectorAll('.lbody').forEach(el => {
    // 기존 term span 제거
    el.innerHTML = el.innerHTML.replace(/<span class="term"[^>]*>([^<]+)<\/span>/g, '$1');
    const sorted = Object.keys(termDB).sort((a, b) => b.length - a.length);
    walkAndMark(el, sorted);
  });
}

function walkAndMark(node, words) {
  if (node.nodeType === 3) {
    const text = node.textContent;
    if (!words.some(w => text.includes(w))) return;
    const positions = [];
    words.forEach(w => {
      let i = 0;
      while ((i = text.indexOf(w, i)) !== -1) { positions.push({ s: i, e: i + w.length, w }); i += w.length; }
    });
    positions.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
    const used = [], merged = [];
    positions.forEach(p => { if (!used.some(u => p.s < u.e && p.e > u.s)) { merged.push(p); used.push(p); } });
    merged.sort((a, b) => a.s - b.s);
    const frag = document.createDocumentFragment();
    let cur = 0;
    merged.forEach(p => {
      if (p.s > cur) frag.appendChild(document.createTextNode(text.slice(cur, p.s)));
      const sp = document.createElement('span');
      sp.className = 'term';
      sp.textContent = p.w;
      const ww = p.w;
      sp.onclick = () => showTermPanel(ww);
      frag.appendChild(sp);
      cur = p.e;
    });
    if (cur < text.length) frag.appendChild(document.createTextNode(text.slice(cur)));
    node.parentNode.replaceChild(frag, node);
  } else if (node.nodeType === 1 && !node.classList.contains('term') && !node.classList.contains('law-ref')) {
    Array.from(node.childNodes).forEach(c => walkAndMark(c, words));
  }
}

function buildAutoTermList() {
  const bodyText = document.getElementById('caseBody')?.textContent || '';
  const found = Object.keys(termDB).filter(w => bodyText.includes(w));
  document.getElementById('autoTerms').innerHTML = found.slice(0, 9).map(w =>
    `<div class="tcrd" onclick="window.showTermPanel('${w}')">
      <div class="tw">${w}</div>
      <div class="th">${termDB[w].hanja}</div>
      <div class="td ellipsis">${termDB[w].def.substring(0, 48)}...</div>
    </div>`
  ).join('');
}

window.showTermPanel = showTermPanel;
function showTermPanel(word) {
  showTab('terms');
  const d = termDB[word]; if (!d) return;
  document.getElementById('termHint').style.display = 'none';
  document.getElementById('termDetail').innerHTML = `
    <div class="tcrd selected">
      <div class="tw" style="font-size:15px;">${word}</div>
      <div class="th">${d.hanja}</div>
      <div class="td" style="white-space:pre-line;margin-bottom:6px;">${d.def}</div>
      <div class="tl2">${d.law}</div>
    </div>`;
}

// 용어 편집
window.openTermEdit = () => { renderTermList(); document.getElementById('termEditModal').classList.add('show'); };
window.closeTermEdit = (e) => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); };

function renderTermList() {
  renderTermCount();
  document.getElementById('termList').innerHTML = Object.entries(termDB).map(([w, d]) =>
    `<div class="teli">
      <div style="flex:1;"><div class="teliw">${w} <span style="font-size:10px;color:var(--text-dim);">${d.hanja}</span></div>
      <div class="telid">${d.def.substring(0, 50)}${d.def.length > 50 ? '...' : ''}</div></div>
      <button class="tdel" onclick="window.deleteTerm('${w}')">삭제</button>
    </div>`
  ).join('');
}
function renderTermCount() {
  const el = document.getElementById('termCount');
  if (el) el.textContent = `(${Object.keys(termDB).length}개)`;
}

window.submitAddTerm = async () => {
  const word = document.getElementById('nWord').value.trim();
  const def  = document.getElementById('nDef').value.trim();
  if (!word || !def) { showToast('용어와 정의는 필수입니다.'); return; }
  const data = { word, hanja: document.getElementById('nHanja').value.trim(), def, law: document.getElementById('nLaw').value.trim() };
  await API.addTerm(data);
  termDB[word] = { hanja: data.hanja, def: data.def, law: data.law };
  ['nWord','nHanja','nDef','nLaw'].forEach(id => document.getElementById(id).value = '');
  renderTermList(); applyTermHighlighting(); buildAutoTermList();
  showToast(`"${word}" 용어가 추가됐습니다.`);
};
window.deleteTerm = async (word) => {
  if (!confirm(`"${word}" 용어를 삭제하시겠습니까?`)) return;
  await API.deleteTerm(word);
  delete termDB[word];
  renderTermList(); applyTermHighlighting(); buildAutoTermList();
};

// ════════════════════════════
// 하이라이트 (드래그)
// ════════════════════════════
window.applyHighlight = () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) { showToast('하이라이트할 텍스트를 드래그하여 선택하세요.'); return; }
  const range = sel.getRangeAt(0);
  const span  = document.createElement('span');
  span.className = 'uhl';
  span.onclick   = function () { this.outerHTML = this.innerHTML; };
  try { range.surroundContents(span); } catch (e) {}
  sel.removeAllRanges();
};
window.clearHighlights = () => document.querySelectorAll('.uhl').forEach(el => { el.outerHTML = el.innerHTML; });

// ════════════════════════════
// 본문 내 검색
// ════════════════════════════
window.doInlineSearch = doInlineSearch;
function doInlineSearch() {
  const q = document.getElementById('iSrch').value.trim();
  if (q === iLastQ) return;
  iLastQ = q;
  document.querySelectorAll('.sh').forEach(el => { el.outerHTML = el.textContent; });
  iMatches = []; iIdx = 0;
  if (!q) { document.getElementById('iCnt').textContent = ''; return; }

  const center = document.getElementById('panelCenter');
  const walker = document.createTreeWalker(center, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentElement;
      if (!p || ['SCRIPT','STYLE','BUTTON'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (p.closest('.viewer-toolbar')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const ql = q.toLowerCase();
  nodes.forEach(node => {
    const text  = node.textContent;
    const lower = text.toLowerCase();
    let i = 0;
    while ((i = lower.indexOf(ql, i)) !== -1) {
      const range = document.createRange();
      range.setStart(node, i); range.setEnd(node, i + q.length);
      const sp = document.createElement('span');
      sp.className = 'sh';
      try { range.surroundContents(sp); iMatches.push(sp); } catch (e) {}
      i += q.length;
    }
  });

  const cntEl = document.getElementById('iCnt');
  cntEl.textContent = iMatches.length > 0 ? `1/${iMatches.length}` : '없음';
  if (iMatches.length) hlCurrent();
}

function hlCurrent() {
  iMatches.forEach((m, i) => m.classList.toggle('cur', i === iIdx));
  if (iMatches[iIdx]) iMatches[iIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('iCnt').textContent = `${iIdx + 1}/${iMatches.length}`;
}
window.nextMatch = () => { if (!iMatches.length) { doInlineSearch(); return; } iIdx = (iIdx + 1) % iMatches.length; hlCurrent(); };
window.prevMatch = () => { if (!iMatches.length) return; iIdx = (iIdx - 1 + iMatches.length) % iMatches.length; hlCurrent(); };
function clearInlineSearch() {
  const inp = document.getElementById('iSrch');
  if (inp) inp.value = '';
  document.getElementById('iCnt').textContent = '';
  document.querySelectorAll('.sh').forEach(el => { el.outerHTML = el.textContent; });
  iMatches = []; iIdx = 0; iLastQ = '';
}

// ════════════════════════════
// 뷰어 설정
// ════════════════════════════
window.setMode = (m) => {
  document.getElementById('panelCenter').classList.remove('code-mode');
  ['bDark','bLight','bCode'].forEach(id => document.getElementById(id).classList.remove('active'));
  if (m === 'dark')  { document.body.classList.remove('light-mode'); document.getElementById('bDark').classList.add('active'); }
  if (m === 'light') { document.body.classList.add('light-mode');    document.getElementById('bLight').classList.add('active'); }
  if (m === 'code')  { document.body.classList.remove('light-mode'); document.getElementById('panelCenter').classList.add('code-mode'); document.getElementById('bCode').classList.add('active'); }
};
window.setFontSize = (v) => document.querySelectorAll('.lbody').forEach(el => el.style.fontSize = v + 'px');

window.showTab = (tab) => {
  ['terms','related'].forEach(t => {
    document.getElementById('pt-'  + t).classList.toggle('active', t === tab);
    document.getElementById('pc-'  + t).style.display = t === tab ? 'block' : 'none';
  });
};

window.updateProgress = () => {
  const el = document.getElementById('panelCenter');
  const p  = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
  document.getElementById('readingProgress').style.width = p + '%';
};

window.scrollToArt = (id, el) => {
  const t = document.getElementById(id);
  if (t) document.getElementById('panelCenter').scrollTo({ top: t.offsetTop - 16, behavior: 'smooth' });
  document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
};
window.scrollToSection = (title, el) => {
  const all = document.querySelectorAll('.lt');
  for (const lt of all) {
    if (lt.textContent.includes(title)) {
      document.getElementById('panelCenter').scrollTo({ top: lt.parentElement.offsetTop - 16, behavior: 'smooth' });
      break;
    }
  }
  document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
};

// ════════════════════════════
// 카드 렌더 헬퍼
// ════════════════════════════
function caseCard(c, onclick) {
  return `<div class="ri" onclick="${onclick}">
    <div class="rc">${c.court} · ${c.caseNum} · ${formatDate(c.date)}</div>
    <div class="rt">${c.caseName || c.caseNum}</div>
    <div class="rtags"><span class="ts t형법">${c.category || '판례'}</span></div>
  </div>`;
}
function lawCard(l, onclick) {
  return `<div class="ri law-ri" onclick="${onclick}">
    <div class="rc">법령 · ${l.department || ''}</div>
    <div class="rt">${l.name}</div>
    <div class="rtags"><span class="ts tlaw">${l.type || '법률'}</span></div>
  </div>`;
}
function caseCardBig(c) {
  return `<div class="bri" onclick="window.goDetail('case','${c.id}')">
    <div>
      <div class="bri-court">${c.court}</div>
      <div class="bri-title">${c.caseName || c.caseNum}</div>
      <div class="rtags" style="margin-top:4px;">
        <span class="ts t형법">${c.category || '판례'}</span>
        <span class="badge badge-c">${c.caseNum}</span>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:16px;">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-dim);">${formatDate(c.date)}</div>
      <div class="badge badge-c" style="margin-top:4px;">${c.result || '판례'}</div>
    </div>
  </div>`;
}
function lawCardBig(l) {
  return `<div class="bri" onclick="window.goDetail('law','${l.mst}')">
    <div>
      <div class="bri-court">${l.department || ''}</div>
      <div class="bri-title">${l.name}</div>
      <div class="rtags" style="margin-top:4px;"><span class="badge badge-l">${l.type || '법률'}</span></div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:16px;">
      <div style="font-size:11px;color:var(--text-dim);">시행 ${formatDate(l.enforcDate)}</div>
    </div>
  </div>`;
}

function formatDate(d) {
  if (!d) return '';
  const s = String(d);
  if (s.length === 8) return `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}.`;
  return s;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
