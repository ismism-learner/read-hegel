// Fetch Douban review bodies politely: long delays, 429 backoff, resumable.
//   node scripts/douban-reviews2.mjs [--max 25] [--delay 6000]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/_research/douban';
const OUT = path.join(DIR, 'reviews');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const MAX = Number(opt('max', 25));
const DELAY = Number(opt('delay', 6000));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const H = { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9', referer: 'https://book.douban.com/' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();

// drop the empty (throttled) files so they get retried
for (const f of fs.readdirSync(OUT).filter((x) => /^\d+\.json$/.test(x))) {
  const r = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  if (!r.text || r.text.length < 100) fs.unlinkSync(path.join(OUT, f));
}

const books = fs.readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const want = [];
for (const b of books) for (const r of b.reviews || []) want.push({ ...r, book: b.title, year: b.year, translator: b.translator });
const todo = want.filter((r) => !fs.existsSync(path.join(OUT, `${r.id}.json`))).slice(0, MAX);
console.log(`todo ${todo.length} reviews (delay ${DELAY}ms)`);

let ok = 0, blocked = 0;
for (const r of todo) {
  let done = false;
  for (let attempt = 0; attempt < 3 && !done; attempt++) {
    try {
      const resp = await fetch(`https://m.douban.com/book/review/${r.id}/`, { headers: { ...H, 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
      if (resp.status === 429 || resp.status === 403) { blocked++; await sleep(20000 * (attempt + 1)); continue; }
      const html = await resp.text();
      let body = (html.match(/<div class="review-content[^"]*">([\s\S]*?)<\/div>\s*<div/) || html.match(/<section[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/section>/) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/) || [, ''])[1];
      const text = clean(body);
      if (text.length < 100) {
        const fallback = clean(html).replace(/^[\s\S]*?正文/, '');
        if (fallback.length > text.length) { body = fallback; }
      }
      const finalText = clean(body) || clean(html).slice(0, 4000);
      const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [, r.title])[1]);
      fs.writeFileSync(path.join(OUT, `${r.id}.json`), JSON.stringify({ ...r, title, text: finalText, source: 'm.douban.com' }, null, 1), 'utf8');
      ok++; done = true;
    } catch (e) { await sleep(5000 * (attempt + 1)); }
  }
  await sleep(DELAY);
}
console.log(`fetched ${ok}, throttled attempts ${blocked}, on disk ${fs.readdirSync(OUT).length}`);
