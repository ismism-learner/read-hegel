// Scrape Douban book pages for Chinese Hegel translations: rating, short comments (all/positive/negative)
// and the long-review list.
//   node scripts/douban-scrape.mjs
import fs from 'node:fs';
import path from 'node:path';

const H = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'accept-language': 'zh-CN,zh;q=0.9',
  'referer': 'https://book.douban.com/',
};
const OUT = 'data/_research/douban';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERIES = [
  '精神现象学', '精神现象学 句读', '小逻辑', '逻辑学 黑格尔', '逻辑学 先刚',
  '法哲学原理', '历史哲学 黑格尔', '美学 黑格尔', '哲学史讲演录',
  '黑格尔全集', '宗教哲学讲演录', '自然哲学 黑格尔', '哲学全书',
  '精神哲学 黑格尔', '黑格尔 早期著作', '耶拿 黑格尔', '黑格尔 邓晓芒', '黑格尔 先刚',
];

const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function get(u) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) });
      const text = await r.text();
      if (r.status === 200) return text;
      if (r.status === 403 || r.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
      return text;
    } catch (e) { await sleep(2000 * (attempt + 1)); }
  }
  return '';
}

/* ---------- 1. resolve subjects ---------- */
const subjects = new Map();
for (const q of QUERIES) {
  const text = await get('https://book.douban.com/j/subject_suggest?q=' + encodeURIComponent(q));
  try {
    for (const s of JSON.parse(text)) {
      if (s.type !== 'b' || !s.id) continue;
      if (!subjects.has(s.id)) subjects.set(s.id, { id: s.id, title: s.title, author: s.author_name, year: s.year, query: q });
    }
  } catch { }
  await sleep(700);
}
console.log(`subjects found: ${subjects.size}`);

/* ---------- 2. per subject: page + comments ---------- */
const parseComments = (html) => {
  const out = [];
  for (const block of html.split('comment-item').slice(1)) {
    const seg = block.slice(0, 4000);
    const text = clean((seg.match(/<span class="short">([\s\S]*?)<\/span>/) || [, ''])[1]);
    const user = clean((seg.match(/<a href="https:\/\/www\.douban\.com\/people\/[^"]+\/"[^>]*>([\s\S]*?)<\/a>/) || [, ''])[1]);
    const stars = (seg.match(/class="allstar(\d)0/) || [, ''])[1];
    const time = clean((seg.match(/<span class="comment-time"[^>]*>([\s\S]*?)<\/span>/) || [, ''])[1]);
    const votes = clean((seg.match(/<span class="vote-count">([\s\S]*?)<\/span>/) || [, ''])[1]);
    if (text) out.push({ user, stars: stars ? Number(stars) : null, time, votes: Number(votes) || 0, text });
  }
  return out;
};

const results = [];
for (const s of subjects.values()) {
  const page = await get(`https://book.douban.com/subject/${s.id}/`);
  const rec = {
    ...s,
    url: `https://book.douban.com/subject/${s.id}/`,
    rating: (page.match(/property="v:average"[^>]*>([\d.]+)</) || [, ''])[1],
    votes: Number((page.match(/property="v:votes"[^>]*>(\d+)</) || [, ''])[1] || 0),
    ratingCounts: {},
    publisher: clean((page.match(/出版社:<\/span>\s*([\s\S]*?)<\/div>/) || [, ''])[1]) || clean((page.match(/出版社<\/span>[\s\S]{0,200}?<a[^>]*>([\s\S]*?)<\/a>/) || [, ''])[1]),
    year: clean((page.match(/出版年:<\/span>\s*([\s\S]*?)<\/div>/) || [, ''])[1]),
    translator: clean((page.match(/译者:<\/span>\s*([\s\S]*?)<\/div>/) || [, ''])[1]) || clean((page.match(/译者<\/span>[\s\S]{0,400}?<a[^>]*>([\s\S]*?)<\/a>/) || [, ''])[1]),
    intro: clean((page.match(/<div class="intro">([\s\S]*?)<\/div>/) || [, ''])[1]).slice(0, 600),
    comments: { all: [], P: [], N: [] },
    reviews: [],
  };
  for (const m of page.matchAll(/<span class="rating_per">([\d.]+)%<\/span>/g)) {
    const keys = ['5', '4', '3', '2', '1'];
    rec.ratingCounts[keys[Object.keys(rec.ratingCounts).length]] = m[1];
  }
  for (const st of ['', 'P', 'N']) {
    const html = await get(`https://book.douban.com/subject/${s.id}/comments/?start=0&limit=40${st ? `&status=${st}` : ''}`);
    rec.comments[st || 'all'] = parseComments(html);
    await sleep(1200);
  }
  const rv = await get(`https://book.douban.com/subject/${s.id}/reviews`);
  for (const m of rv.matchAll(/href="https:\/\/book\.douban\.com\/review\/(\d+)\/"[^>]*>([\s\S]*?)<\/a>/g)) {
    const title = clean(m[2]);
    if (title && !rec.reviews.some((r) => r.id === m[1])) rec.reviews.push({ id: m[1], title });
  }
  results.push(rec);
  console.log(`${s.id} ${s.title} | 评分 ${rec.rating || '-'} (${rec.votes}) | 短评 ${rec.comments.all.length}/好评 ${rec.comments.P.length}/差评 ${rec.comments.N.length} | 长评 ${rec.reviews.length}`);
  fs.writeFileSync(path.join(OUT, `${s.id}.json`), JSON.stringify(rec, null, 1), 'utf8');
  await sleep(1500);
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(results.map((r) => ({ id: r.id, title: r.title, year: r.year, rating: r.rating, votes: r.votes, translator: r.translator, publisher: r.publisher, nShort: r.comments.all.length, nBad: r.comments.N.length, nReviews: r.reviews.length, url: r.url })), null, 1), 'utf8');
console.log(`\nsaved ${results.length} subjects to ${OUT}`);
