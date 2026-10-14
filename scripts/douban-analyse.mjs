// Analyse the scraped Douban comments: which complaints recur, especially about translation.
//   node scripts/douban-analyse.mjs [--theme 错译] [--limit 20]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/_research/douban';
const files = fs.readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f));

const THEMES = [
  [/错译|误译|译错|翻错|错得|硬伤|讹误|错误百出|严重错误/g, '错译/硬伤'],
  [/漏译|删节|删掉|阉割|不全|缺失|节译|略去|跳译|不完整/g, '漏译/删节'],
  [/拗口|生硬|艰涩|诘屈|佶屈|不通|病句|别扭|读不下去|读不懂|看不懂|天书|啃不动|绕/g, '难读/文风'],
  [/术语|译名|名词|概念译|不统一|译法/g, '术语/译名'],
  [/排版|校对|错别字|印刷|装帧|纸质|编辑/g, '编校/印制'],
  [/句式|长句|语序|从句|直译|硬译|欧化/g, '句式/欧化'],
  [/注释|脚注|导读|句读|解读/g, '注释/入门'],
  [/贺麟|王玖兴|先刚|邓晓芒|杨一之|朱光潜|范扬|张企泰|王造时|梁志学|燕宏远/g, '译者相关'],
  [/原文|德文|德语|对照/g, '原文/德语'],
];

const seen = new Set();
const low = [], other = [];
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const add = (c, isLow) => {
    const key = `${s.id}|${c.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rec = { ...c, book: s.title, year: s.year, id: s.id, rating: s.rating, translator: s.translator };
    (isLow ? low : other).push(rec);
  };
  for (const c of s.comments.N || []) add(c, true);
  for (const c of s.comments.P || []) add(c, false);
  for (const c of s.comments.all || []) add(c, false);
}

const classify = (c) => {
  for (const [re, name] of THEMES) if (re.test(c.text)) return name;
  return '其他';
};

const lowByTheme = new Map(), cnt = new Map();
for (const c of low) { const t = classify(c); cnt.set(t, (cnt.get(t) || 0) + 1); if (!lowByTheme.has(t)) lowByTheme.set(t, []); lowByTheme.get(t).push(c); }
const allByTheme = new Map();
for (const c of [...low, ...other]) { const t = classify(c); allByTheme.set(t, (allByTheme.get(t) || 0) + 1); }

console.log(`deduped comments: ${low.length + other.length} (low-score ${low.length}, rest ${other.length}) from ${files.length} books\n`);
console.log('low-score comments by theme (and same theme across all comments):');
for (const [k, n] of [...cnt.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} (${String(allByTheme.get(k) || 0).padStart(4)})  ${k}`);

const themeArg = (() => { const i = process.argv.indexOf('--theme'); return i >= 0 ? process.argv[i + 1] : ''; })();
const limit = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? Number(process.argv[i + 1]) : 14; })();

for (const [name, list] of lowByTheme) {
  if (themeArg && !name.includes(themeArg)) continue;
  console.log(`\n===== ${name} · 低分评论 ${list.length} 条 =====`);
  for (const c of list.slice(0, limit)) {
    console.log(`• [${c.book}${c.year ? ' ' + c.year : ''}${c.translator ? ' · ' + c.translator : ''}] ${c.text.slice(0, 300)}`);
  }
}
