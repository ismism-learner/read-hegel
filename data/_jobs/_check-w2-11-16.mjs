import fs from 'node:fs';

const inp = JSON.parse(fs.readFileSync('data/_jobs/w2-11-16.in.json', 'utf8'));
const raw = fs.readFileSync('web/data/trans/w2/11.p16.json');
const out = JSON.parse(raw.toString('utf8'));

const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
console.log('BOM:', bom, '| unit:', out.unit, '| stage:', out.stage, '| outFile:', inp.outFile);

let blocks = 0, sents = 0;
const problems = [];
for (const b of inp.blocks) {
  const key = String(b.bi);
  const o = out.blocks[key];
  if (!o) { problems.push(`missing block ${key}`); continue; }
  blocks++;
  if (o.h !== b.hash) problems.push(`hash mismatch ${key}: ${o.h} != ${b.hash}`);
  const n = b.sents.length;
  if (b.k === 'h') {
    if (typeof o.en !== 'string' || typeof o.zh !== 'string') problems.push(`block ${key} h-type mismatch`);
  } else {
    if (!Array.isArray(o.en) || o.en.length !== n) problems.push(`block ${key} en len ${o.en?.length} != ${n}`);
    if (!Array.isArray(o.zh) || o.zh.length !== n) problems.push(`block ${key} zh len ${o.zh?.length} != ${n}`);
    (o.en || []).forEach((s, i) => { if (!s || !s.trim()) problems.push(`block ${key} en[${i}] empty`); });
    (o.zh || []).forEach((s, i) => { if (!s || !s.trim()) problems.push(`block ${key} zh[${i}] empty`); });
    sents += n;
  }
}
const extra = Object.keys(out.blocks).filter((k) => !inp.blocks.some((b) => String(b.bi) === k));
if (extra.length) problems.push('extra blocks: ' + extra.join(','));
console.log('blocks:', blocks, '| sentences:', sents);
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL CHECKS PASS');

const zh = Object.values(out.blocks).map((o) => (Array.isArray(o.zh) ? o.zh.join('\n') : o.zh)).join('\n');
const bad = ['唯心主义', '唯心的', '唯心性', '唯心论', '理念', '理智', '直觉', '反映', '时刻', '理想的', '教条主义'];
for (const t of bad) if (zh.includes(t)) console.log('NOTE forbidden term present:', t);
for (const t of ['观念', '观念性', '实在性', '实在的', '概念', '表象', '知性', '理性', '扬弃', '环节', '直观', '思辨', '绝对者', '同一性', '对立', '无差别', '差别', '伦理', '道德学', '道德']) {
  console.log('count', t, (zh.match(new RegExp(t, 'g')) || []).length);
}
Object.entries(out.blocks).forEach(([k, o]) => {
  (o.zh || []).forEach((s, i) => {
    const stops = (s.match(/。/g) || []).length;
    if (stops > 1) console.log(`WARN block ${k} zh[${i}] has ${stops} full stops`);
  });
});
// footnote markers preserved
for (const m of ['246)', '247)']) console.log('marker', m, zh.includes(m));
