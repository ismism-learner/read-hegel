// Local check for w2-13-97 (same checks as scripts/qa-trans.mjs, scoped to this unit).
import fs from 'node:fs';

const inp = JSON.parse(fs.readFileSync('data/_jobs/w2-13-97.in.json', 'utf8'));
const raw = fs.readFileSync(inp.outFile);
const out = JSON.parse(raw.toString('utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w2.json', 'utf8'));

const bom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
console.log('BOM:', bom, '| unit:', out.unit, '| stage:', out.stage, '| outFile:', inp.outFile);

const problems = [];
let blocks = 0, sents = 0;
if (out.unit !== inp.id) problems.push(`unit ${out.unit} != ${inp.id}`);
for (const b of inp.blocks) {
  const key = String(b.bi);
  const o = out.blocks[key];
  if (!o) { problems.push(`missing block ${key}`); continue; }
  blocks++;
  if (o.h !== b.hash) problems.push(`hash mismatch ${key}: ${o.h} != ${b.hash}`);
  const n = b.sents.length;
  if (!Array.isArray(o.en) || o.en.length !== n) problems.push(`block ${key} en len ${o.en?.length} != ${n}`);
  if (!Array.isArray(o.zh) || o.zh.length !== n) problems.push(`block ${key} zh len ${o.zh?.length} != ${n}`);
  (o.en || []).forEach((s, i) => { if (!s || !s.trim()) problems.push(`block ${key} en[${i}] empty`); });
  (o.zh || []).forEach((s, i) => { if (!s || !s.trim()) problems.push(`block ${key} zh[${i}] empty`); });
  if ((o.zh || []).length === n && (o.en || []).length === n) sents += n;
}
const extra = Object.keys(out.blocks).filter((k) => !inp.blocks.some((b) => String(b.bi) === k));
if (extra.length) problems.push('extra blocks: ' + extra.join(','));

// glossary conformance (volume context package wins)
const rules = (ctx.entries || []).filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh));
const forb = (ctx.forbidden || []).filter((x) => x.source && x.forbidden && x.prefer)
  .map((x) => [x.source, x.forbidden, x.prefer]);
const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const notes = [];
for (const b of inp.blocks) {
  const o = out.blocks[String(b.bi)];
  if (!o || !Array.isArray(o.zh)) continue;
  b.sents.forEach((src, i) => {
    const zh = o.zh[i] || '';
    const en = o.en[i] || '';
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    if (deN > 40) {
      const rz = zhN / deN;
      if (rz < 0.22 || rz > 1.05) problems.push(`block ${b.bi} s${i}: zh/de ratio ${rz.toFixed(2)} (${zhN}/${deN})`);
      const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
      const enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
      if (deW > 8) { const re = enW / deW; if (re < 0.45 || re > 1.6) problems.push(`block ${b.bi} s${i}: en/de ratio ${re.toFixed(2)} (${enW}/${deW})`); }
    }
    if (CJK.test(en)) problems.push(`block ${b.bi} s${i}: English contains CJK`);
    if (DE_NEG.test(src) && !ZH_NEG.test(zh)) problems.push(`block ${b.bi} s${i}: dropped negation? “${zh}”`);
    for (const [term, bad, good] of forb) {
      if (new RegExp(`\\b${term}\\b`).test(src) && zh.includes(bad) && !zh.includes(good)) problems.push(`block ${b.bi} s${i}: forbidden “${bad}” for ${term}`);
    }
    for (const r of rules) {
      if (r.source.length < 4) continue;
      const esc = r.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cs = /^[A-ZÄÖÜ]/.test(r.source);
      if (new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`, cs ? '' : 'i').test(src) && zh.length > 6 && !zh.includes(r.zh)) {
        notes.push(`block ${b.bi} s${i}: “${r.source}” not rendered as “${r.zh}” → “${zh.slice(0, 40)}…”`);
      }
    }
  });
}

console.log('blocks:', blocks, '| sentences:', sents);
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'ALL CHECKS PASS');

// word-family conformance
const famLines = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const famHead = famLines.shift().split(',');
const fix = (n) => famHead.indexOf(n);
for (const l of famLines) {
  const c = l.split(',');
  if ((c[fix('sense')] || '') !== 'systematic') continue;
  const de = c[fix('member_de')], root = c[fix('root_zh')], zh0 = c[fix('member_zh')];
  const esc = de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const b of inp.blocks) {
    const o = out.blocks[String(b.bi)];
    if (!o || !Array.isArray(o.zh)) continue;
    b.sents.forEach((src, i) => {
      if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`).test(src)) return;
      const zh = o.zh[i] || '';
      if (!zh.includes(root) && !zh.includes(zh0)) problems.push(`FAMILY block ${b.bi} s${i}: “${de}” lost root “${root}” (${c[fix('family')]})`);
    });
  }
}
console.log('family check:', problems.filter((p) => p.startsWith('FAMILY')).length ? problems.filter((p) => p.startsWith('FAMILY')).join('\n') : 'ok');
console.log(notes.length ? 'GLOSSARY NOTES:\n' + notes.join('\n') : 'no glossary notes');
const all = Object.values(out.blocks).map((o) => (Array.isArray(o.zh) ? o.zh.join('\n') : o.zh)).join('\n');
for (const t of ['唯心主义', '唯心的', '唯心性', '唯心论', '理念', '理智', '直觉', '反映', '时刻', '理想的', '教条主义', '法律']) {
  if (all.includes(t)) console.log('NOTE forbidden term present:', t);
}
for (const t of ['观念', '实在', '概念', '表象', '知性', '理性', '精神', '绝对者', '认识', '教养']) {
  console.log('count', t, (all.match(new RegExp(t, 'g')) || []).length);
}
