// server/routes/law.js
const express = require('express');
const router  = express.Router();
const { searchLaw, getLawDetail, getLawArticle } = require('../lawApi');

// ── 법령 검색 ──
// GET /api/law/search?query=형법&page=1&display=20
router.get('/search', async (req, res) => {
  try {
    const { query = '', page = 1, display = 20, sort = 'lasc' } = req.query;
    if (!query.trim()) return res.json({ items: [], total: 0 });

    const raw  = await searchLaw({ query, page: +page, display: +display, sort });
    const root = raw?.LawSearch;

    if (!root) return res.json({ items: [], total: 0 });

    // 단일 결과도 배열로 통일
    const items = root.law
      ? Array.isArray(root.law) ? root.law : [root.law]
      : [];

    res.json({
      total:      parseInt(root.totalCnt || 0),
      page:       parseInt(root.page || 1),
      items: items.map(l => ({
        mst:          l.법령MST,
        id:           l.법령ID,
        name:         l.법령명한글,
        nameEng:      l.법령명영문 || '',
        type:         l.법령구분명,      // 법률 / 대통령령 / 부령 등
        department:   l.소관부처명,
        promulgDate:  l.공포일자,
        enforcDate:   l.시행일자,
      })),
    });
  } catch (err) {
    console.error('[법령 검색 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 법령 본문 ──
// GET /api/law/detail/:mst
router.get('/detail/:mst', async (req, res) => {
  try {
    const raw  = await getLawDetail(req.params.mst);
    const root = raw?.법령;

    if (!root) return res.status(404).json({ error: '법령을 찾을 수 없습니다.' });

    // 조문 파싱
    const articles = [];
    const 조문편장 = root?.조문?.조문단위;
    if (조문편장) {
      const arr = Array.isArray(조문편장) ? 조문편장 : [조문편장];
      arr.forEach(unit => {
        const 항 = unit?.항 ? (Array.isArray(unit.항) ? unit.항 : [unit.항]) : [];
        articles.push({
          num:     unit?.조문번호   || '',
          title:   unit?.조문제목   || '',
          content: unit?.조문내용   || '',
          items:   항.map(h => ({
            num:     h?.항번호  || '',
            content: h?.항내용  || '',
          })),
        });
      });
    }

    res.json({
      mst:         root?.기본정보?.법령MST    || '',
      name:        root?.기본정보?.법령명한글  || '',
      type:        root?.기본정보?.법령구분명  || '',
      department:  root?.기본정보?.소관부처명  || '',
      promulgDate: root?.기본정보?.공포일자    || '',
      enforcDate:  root?.기본정보?.시행일자    || '',
      articles,
    });
  } catch (err) {
    console.error('[법령 본문 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 특정 조문 팝업용 ──
// GET /api/law/article?mst=MST번호&jo=268
router.get('/article', async (req, res) => {
  try {
    const { mst, jo } = req.query;
    if (!mst || !jo) return res.status(400).json({ error: 'mst, jo 파라미터 필요' });

    const raw  = await getLawArticle(mst, jo);
    const unit = raw?.법령?.조문?.조문단위;

    if (!unit) return res.status(404).json({ error: '조문을 찾을 수 없습니다.' });

    const u = Array.isArray(unit) ? unit[0] : unit;
    const 항 = u?.항 ? (Array.isArray(u.항) ? u.항 : [u.항]) : [];

    res.json({
      num:     u?.조문번호  || jo,
      title:   u?.조문제목  || '',
      content: u?.조문내용  || '',
      items:   항.map(h => ({ num: h?.항번호 || '', content: h?.항내용 || '' })),
    });
  } catch (err) {
    console.error('[조문 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
