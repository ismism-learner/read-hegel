// Print every scraped comment that actually discusses the translation, with book context.
//   node scripts/douban-quotes.mjs [--min 1]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/_research/douban';
const RE = /译|版本|读起来|拗|生硬|晦涩|错|漏|删|术语|译名|原文|德文|对照|勘|编辑|排版|字/;
const NEG = /错译|误译|译错|硬伤|讹误|漏译|删节|阉割|拗口|生硬|艰涩|不通|病句|读不懂|看不懂|天书|太差|糟糕|失望|不推荐|别买|毁|难读|折磨|难受|机翻/;

const rows = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^\d+\.json$/.test(x))) {
  const b = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const seen = new Set();
  for (const [bucket, list] of [['差评', b.comments.N || []], ['好评', b.comments.P || []], ['全部', b.comments.all || []]]) {
    for (const c of list) {
      if (seen.has(c.text)) continue;
      seen.add(c.text);
      if (!RE.test(c.text)) continue;
      rows.push({ book: b.title, year: b.year, translator: b.translator, id: b.id, bucket, neg: NEG.test(c.text), text: c.text });
    }
  }
}

rows.sort((a, b) => Number(b.neg) - Number(a.neg));
console.log(`comments mentioning translation: ${rows.length} (negative-sounding: ${rows.filter((r) => r.neg).length})\n`);
for (const r of rows) {
  const tag = `${r.neg ? '‼' : ' '} [${r.book}${r.year ? ' ' + r.year : ''}${r.translator ? ' · ' + String(r.translator).split(' ')[0] : ''}]`;
  console.log(`${tag} ${r.text}`);
}
