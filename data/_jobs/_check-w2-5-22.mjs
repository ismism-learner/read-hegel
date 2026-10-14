import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const P = 'web/data/trans/w2/5.p22.json';
const buf = fs.readFileSync(P);
console.log('BOM:', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? 'YES' : 'no');
const out = JSON.parse(buf.toString('utf8'));
const c = JSON.parse(fs.readFileSync('web/data/vol/w2/5.json', 'utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w2-5-22.in.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w2.json', 'utf8'));
const famRaw = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const fh = famRaw.shift().split(',');
const FAMS = famRaw.map((l) => l.split(',')).filter((r) => r[fh.indexOf('sense')] === 'systematic')
  .map((r) => ({ family: r[fh.indexOf('family')], root: r[fh.indexOf('root_zh')], de: r[fh.indexOf('member_de')], zh: r[fh.indexOf('member_zh')] }));

console.log('unit:', out.unit, 'stage:', out.stage);
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const GREEK = /[\u0370-\u03ff\u1f00-\u1fff]+(?:[\u0300-\u036f]+)?/gu;
let blocks = 0, sents = 0, bad = 0;
const ratiosZh = [], ratiosEn = [];
const problems = [];

for (const blk of job.blocks) {
  const key = String(blk.bi);
  const val = out.blocks[key];
  const b = c.blocks[blk.bi];
  if (!val) { problems.push('MISSING ' + key); bad++; continue; }
  blocks++;
  if (val.h !== blk.hash) { problems.push('HASH-VS-JOB ' + key); bad++; }
  if (val.h !== b.hash) { problems.push('HASH-VS-VOL ' + key); bad++; }
  const de = sentencesFromMarked(b.x);
  if (JSON.stringify(de) !== JSON.stringify(blk.sents)) { problems.push('JOB-SENTS-DIFFER ' + key); bad++; }
  if (val.en.length !== blk.sents.length || val.zh.length !== blk.sents.length) { problems.push(`LEN ${key} ${val.en.length}/${val.zh.length} vs ${blk.sents.length}`); bad++; }
  blk.sents.forEach((src, i) => {
    sents++;
    const en = (val.en[i] || '').trim(), zh = (val.zh[i] || '').trim();
    if (!en || !zh) { problems.push(`EMPTY ${key}/${i}`); bad++; return; }
    if (CJK.test(en)) { problems.push(`EN-CJK ${key}/${i}`); bad++; }
    if (!CJK.test(zh) && zh.length > 12) { problems.push(`ZH-NOCJK ${key}/${i}`); bad++; }
    if (zh === src.trim()) { problems.push(`ECHO ${key}/${i}`); bad++; }
    // Greek fidelity: every Greek run in DE must appear verbatim in en and zh
    for (const g of src.match(GREEK) || []) {
      const g2 = g.replace(/[\u0300-\u036f\s]+/g, '');
      if (g2.length < 3) continue;
      const has = (t) => t.replace(/[\u0300-\u036f\s]+/g, '').includes(g2);
      if (!has(en)) problems.push(`GREEK-EN ${key}/${i} ${g2}`);
      if (!has(zh)) problems.push(`GREEK-ZH ${key}/${i} ${g2}`);
    }
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length, enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    if (deN > 40) {
      const rz = zhN / deN, re = deW > 8 ? enW / deW : null;
      ratiosZh.push(rz); if (re !== null) ratiosEn.push(re);
      if (rz < 0.22 || rz > 1.05) { problems.push(`RATIO-ZH ${key}/${i} ${rz.toFixed(2)} ${zhN}/${deN}`); bad++; }
      if (re !== null && (re < 0.45 || re > 1.6)) { problems.push(`RATIO-EN ${key}/${i} ${re.toFixed(2)} ${enW}/${deW}`); bad++; }
    }
    const enEnds = (en.match(/[.!?]["')\]]?(\s|$)/g) || []).length;
    if (enEnds !== 1) problems.push(`note EN-SENT-COUNT ${key}/${i} ${enEnds}`);
    for (const e of ctx.entries) {
      if (!e.source || !e.zh || e.source.length < 4) continue;
      if (!/^[A-ZÄÖÜ]/.test(e.source)) continue;
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${e.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && zh.length > 6 && !zh.includes(e.zh)) problems.push(`GLOSS ${key}/${i} ${e.source} -> ${e.zh}`);
    }
    for (const f of ctx.forbidden) {
      const srcRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${f.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (srcRe.test(src) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) problems.push(`FORBIDDEN ${key}/${i} ${f.source}: ${f.forbidden} -> ${f.prefer}`);
    }
    for (const fam of FAMS) {
      if (!fam.de) continue;
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${fam.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && !(zh.includes(fam.root) || zh.includes(fam.zh))) problems.push(`FAMILY ${key}/${i} ${fam.de} (${fam.family}) needs ${fam.zh}/${fam.root}`);
    }
  });
}
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length * p)].toFixed(2) : '-'; };
console.log(`zh/de ratio p5=${pct(ratiosZh, 0.05)} p50=${pct(ratiosZh, 0.5)} p95=${pct(ratiosZh, 0.95)}`);
console.log(`en/de ratio p5=${pct(ratiosEn, 0.05)} p50=${pct(ratiosEn, 0.5)} p95=${pct(ratiosEn, 0.95)}`);
console.log(`blocks=${blocks} sentences=${sents} hardProblems=${bad} notes=${problems.length}`);
for (const p of problems) console.log('  • ' + p);
