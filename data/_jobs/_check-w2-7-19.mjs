import fs from 'node:fs';

const inp = JSON.parse(fs.readFileSync('data/_jobs/w2-7-19.in.json', 'utf8'));
const raw = fs.readFileSync('web/data/trans/w2/7.p19.json');
const out = JSON.parse(raw.toString('utf8'));

const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
console.log('BOM:', bom, '| unit:', out.unit, '| stage:', out.stage);

let blocks = 0, sents = 0, problems = [];
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
const extra = Object.keys(out.blocks).filter(k => !inp.blocks.some(b => String(b.bi) === k));
if (extra.length) problems.push('extra blocks: ' + extra.join(','));
console.log('blocks:', blocks, '| sentences:', sents);
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL CHECKS PASS');

// forbidden-term audit on zh text
const zh = Object.values(out.blocks).map(o => Array.isArray(o.zh) ? o.zh.join('\n') : o.zh).join('\n');
const bad = ['唯心主义','唯心的','唯心性','唯心论','理念','理智','直觉','矛盾性','反映','时刻','实在性现实性'];
for (const t of bad) if (zh.includes(t)) console.log('NOTE term present:', t, '->', zh.split('\n').filter(l=>l.includes(t)).length, 'line(s)');
for (const t of ['观念','实在性','概念','表象','知性','理性','扬弃']) console.log('count', t, (zh.match(new RegExp(t,'g'))||[]).length);
