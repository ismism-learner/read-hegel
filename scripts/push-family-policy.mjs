// Push the word-family policy into every volume context package (idempotent).
//   node scripts/push-family-policy.mjs
import fs from 'node:fs';

const LINES = [
  '词根一致：同一德文词根的不同形式必须共用一个中文词根——Idee/ideal/Idealität/Idealismus/das Ideelle 一律用“观念”（观念、观念性、观念论、观念物），严禁“唯心主义”；Realität/real/Realismus/das Reelle 一律用“实在”（实在性、实在论、实在物）；Begriff/begreifen 用“概念”（概念、以概念把握）；Vorstellung 用“表象”，不得占用“观念”。',
  '对偶成对：观念性／实在性、观念论／实在论、观念物／实在物必须成对出现，不许一边用“观念”、另一边用“唯物”。',
  '同源可见：若德文一句里同时出现同族词（如 Idee 与 Idealität），中文也要让读者看出其同源关系。',
  '日常义例外：同一词在非体系语境中的日常义可保留通用说法（ideal＝理想的、Ideal＝理想、realisieren＝实现），但体系义必须回到词族词根。',
];

let touched = 0;
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.styleGuide = c.styleGuide || [];
  let n = 0;
  for (const line of LINES) {
    const key = line.slice(0, 12);
    if (!c.styleGuide.some((s) => s.startsWith(key))) { c.styleGuide.push(line); n++; }
  }
  if (n) { fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8'); touched++; console.log(`${f}: +${n} style rules (now ${c.styleGuide.length})`); }
}
console.log(`context packages updated: ${touched}`);
