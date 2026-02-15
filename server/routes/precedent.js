// server/routes/precedent.js
const express = require('express');
const router  = express.Router();
const { searchPrecedent, getPrecedentDetail } = require('../lawApi');

// ── 판례 검색 ──
// GET /api/precedent/search?query=업무상과실&page=1&display=20&court=
router.get('/search', async (req, res) => {
  try {
    const { query = '', page = 1, display = 20, court = '' } = req.query;
    if (!query.trim()) return res.json({ items: [], total: 0 });

    const raw  = await searchPrecedent({ query, page: +page, display: +display, court });
    const root = raw?.PrecSearch;

    if (!root) return res.json({ items: [], total: 0 });

    const items = root.prec
      ? Array.isArray(root.prec) ? root.prec : [root.prec]
      : [];

    res.json({
      total: parseInt(root.totalCnt || 0),
      page:  parseInt(root.page     || 1),
      items: items.map(p => ({
        id:         p.판례일련번호,
        caseNum:    p.사건번호,
        caseName:   p.사건명,
        court:      p.법원명,
        courtType:  p.법원종류코드,   // 대법원=400, 헌법재판소=500 등
        date:       p.선고일자,
        result:     p.판결유형,       // 파기환송, 기각, 인용 등
        category:   p.판례분야,
      })),
    });
  } catch (err) {
    console.error('[판례 검색 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 판례 본문 ──
// GET /api/precedent/detail/:id
router.get('/detail/:id', async (req, res) => {
  try {
    const raw  = await getPrecedentDetail(req.params.id);
    const root = raw?.PrecService;

    if (!root) return res.status(404).json({ error: '판례를 찾을 수 없습니다.' });

    res.json({
      id:          root.판례일련번호  || '',
      caseNum:     root.사건번호      || '',
      caseName:    root.사건명        || '',
      court:       root.법원명        || '',
      date:        root.선고일자      || '',
      result:      root.판결유형      || '',
      // 판시사항 / 판결요지 / 참조조문 / 참조판례 / 판례내용
      summary:     root.판시사항      || '',
      gist:        root.판결요지      || '',
      refLaws:     root.참조조문      || '',
      refCases:    root.참조판례      || '',
      // 전문 HTML (API 응답에 HTML 태그 포함됨)
      fullText:    root.판례내용      || '',
    });
  } catch (err) {
    console.error('[판례 본문 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
