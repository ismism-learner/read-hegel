// Fetch the full text of Douban long reviews for the Hegel translations and digest the ones
// that discuss translation quality.
//   node scripts/douban-reviews.mjs [--max 80] [--digest]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/_research/douban';
const OUT = path.join(DIR, 'reviews');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const MAX = (() => { const i = args.indexOf('--max'); return i >= 0 ? Number(args[i + 1]) : 80; })();
const DIGEST = args.includes('--digest');

const H = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'accept-language': 'zh-CN,zh;q=0.9',
  referer: 'https://book.douban.com/',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();

const KEY = /译|翻译|读|版本|勘|纠|错|比较|对照|推荐|吐槽|失望|吐槽|难|拗|删|注/;

const books = fs.readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const want = [];
for (const b of books) {
  for (const r of b.reviews || []) {
    if (!KEY.test(r.title)) continue;
    want.push({ ...r, book: b.title, year: b.year, bid: b.id, translator: b.translator });
  }
}
console.log(`candidate reviews: ${want.length} (fetching up to ${MAX})`);

let fetched = 0;
for (const r of want.slice(0, MAX)) {
  const f = path.join(OUT, `${r.id}.json`);
  if (fs.existsSync(f)) continue;
  try {
    const resp = await fetch(`https://book.douban.com/review/${r.id}/`, { headers: H, signal: AbortSignal.timeout(30000) });
    const html = await resp.text();
    const body = (html.match(/<div class="review-content clearfix">([\s\S]*?)<\/div>\s*<div class="review-footer/) || html.match(/<div class="content">([\s\S]*?)<\/div>/) || [, ''])[1];
    const text = clean(body);
    const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [, r.title])[1]);
    fs.writeFileSync(f, JSON.stringify({ ...r, title, text }, null, 1), 'utf8');
    fetched++;
    if (fetched % 10 === 0) console.log(`  … ${fetched} fetched (${r.title.slice(0, 30)})`);
  } catch (e) { console.log(`  ERR ${r.id}: ${e.message}`); }
  await sleep(900);
}
console.log(`fetched ${fetched} new reviews (total on disk: ${fs.readdirSync(OUT).length})`);

if (DIGEST) {
  const THEMES = [
    [/错译|误译|译错|硬伤|讹误|错误/g, '错译/硬伤'],
    [/漏译|删节|阉割|不全|节译|略去/g, '漏译/删节'],
    [/拗口|生硬|艰涩|不通|病句|读不懂|看不懂|天书/g, '难读/文风'],
    [/术语|译名|译法|不统一/g, '术语/译名'],
    [/勘误|纠错|商榷|校正|校对/g, '勘误/校订'],
    [/版本|对照|比较|哪本|推荐/g, '版本比较'],
  ];
  const files = fs.readdirSync(OUT).filter((f) => /^\d+\.json$/.test(f));
  const hits = [];
  for (const f of files) {
    const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    if ((r.text || '').length < 200) continue;
    const themes = THEMES.filter(([re]) => re.test(r.text)).map(([, n]) => n);
    if (!themes.length) continue;
    hits.push({ ...r, themes, score: themes.length * 1000 + r.text.length });
  }
  hits.sort((a, b) => b.score - a.score);
  console.log(`\nreviews discussing translation (${hits.length}):`);
  for (const h of hits.slice(0, 25)) {
    console.log(`\n▸ [${h.book}${h.year ? ' ' + h.year : ''}] ${h.title.slice(0, 70)}  (${h.themes.join('/')}, ${h.text.length}字)  https://book.douban.com/review/${h.id}/`);
    console.log('  ' + h.text.replace(/\n/g, ' ').slice(0, 320));
  }
}
