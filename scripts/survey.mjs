// Survey the raw corpus: per-directory extent, heading levels, tags, classes.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'data/_raw/gh/HEGEL';
const dirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => Number(a) - Number(b));

const tagCount = new Map();
const classCount = new Map();

const titleOf = (html) => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};

for (const d of dirs) {
  const dir = path.join(ROOT, d);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  const nums = files.map((f) => Number((f.match(/(\d+)\.html$/) || [])[1] ?? 0));
  let bytes = 0;
  const levels = new Map();
  const heads = [];
  for (const f of files) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '');
    bytes += Buffer.byteLength(html);
    for (const m of html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      levels.set(m[1], (levels.get(m[1]) || 0) + 1);
    }
    for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
      const tag = m[1].toLowerCase();
      if (['meta', 'html', 'head', 'body', 'title', 'link', 'script'].includes(tag)) continue;
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      const cm = m[2].match(/class="([^"]*)"/);
      if (cm) for (const c of cm[1].split(/\s+/)) classCount.set(c, (classCount.get(c) || 0) + 1);
    }
    const t = titleOf(html);
    if (nums[heads.length] !== undefined) heads.push(t);
  }
  const firstTitles = files.slice(0, 3).map((f) => titleOf(fs.readFileSync(path.join(dir, f), 'utf8')));
  const lastTitles = files.slice(-3).map((f) => titleOf(fs.readFileSync(path.join(dir, f), 'utf8')));
  const lv = [...levels.entries()].sort().map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`\n### ${d}  files=${files.length} MB=${(bytes / 1048576).toFixed(2)}  first#${nums[0]} last#${nums.at(-1)}`);
  console.log(`    levels: ${lv}`);
  console.log(`    START: ${firstTitles.map((t) => t.slice(0, 60)).join(' | ')}`);
  console.log(`    END  : ${lastTitles.map((t) => t.slice(0, 60)).join(' | ')}`);
}

console.log('\n=== tags ===');
console.log([...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
console.log('\n=== classes ===');
console.log([...classCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
