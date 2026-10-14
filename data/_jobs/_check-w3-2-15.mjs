import fs from 'node:fs';

const P = 'web/data/trans/w3/2.p15.json';
const buf = fs.readFileSync(P);
console.log('BOM:', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
const out = JSON.parse(buf.toString('utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w3-2-15.in.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w3.json', 'utf8'));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
let blocks = 0, sents = 0, bad = 0, notes = 0;
const ratiosZh = [], ratiosEn = [];

console.log('unit:', out.unit, '| stage:', out.stage, '| keys:', Object.keys(out.blocks).join(','));

for (const blk of job.blocks) {
  const key = String(blk.bi);
  const val = out.blocks[key];
  if (!val) { console.log('MISSING', key); bad++; continue; }
  blocks++;
  if (blk.k === 'h') { if (val.h !== blk.hash) { console.log('HASH', key); bad++; } continue; }
  if (val.h !== blk.hash) { console.log('HASH', key, val.h, blk.hash); bad++; }
  const deJob = blk.sents;
  if (val.en.length !== deJob.length || val.zh.length !== deJob.length) {
    console.log('LEN', key, val.en.length, val.zh.length, deJob.length); bad++;
  }
  deJob.forEach((src, i) => {
    sents++;
    const en = val.en[i], zh = val.zh[i];
    if (!en || !zh) { console.log('EMPTY', key, i); bad++; return; }
    if (CJK.test(en)) { console.log('EN-CJK', key, i); bad++; }
    if (!CJK.test(zh) && zh.length > 12) { console.log('ZH-NOCJK', key, i); bad++; }
    if (zh === src.trim()) { console.log('ECHO', key, i); bad++; }
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length, enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    if (deN > 40) {
      const rz = zhN / deN, re = deW > 8 ? enW / deW : null;
      ratiosZh.push(rz); if (re !== null) ratiosEn.push(re);
      if (rz < 0.22 || rz > 1.05) { console.log('RATIO-ZH', key, i, rz.toFixed(2), zhN, deN); bad++; }
      if (re !== null && (re < 0.45 || re > 1.6)) { console.log('RATIO-EN', key, i, re.toFixed(2), enW, deW); bad++; }
    }
    const enEnds = (en.match(/[.!?]["')\]]?(\s|$)/g) || []).length;
    if (enEnds !== 1) { console.log('EN-SENT-COUNT', key, i, enEnds, '::', en.slice(0, 70)); bad++; }
    const zhEnds = (zh.match(/[。！？]/g) || []).length;
    if (zhEnds !== 1) { console.log('ZH-SENT-COUNT', key, i, zhEnds, '::', zh.slice(0, 70)); bad++; }
  });
}

const entries = ctx.entries.filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh));
for (const blk of job.blocks) {
  const key = String(blk.bi);
  if (blk.k === 'h') continue;
  blk.sents.forEach((src, i) => {
    const zh = out.blocks[key].zh[i];
    for (const e of entries) {
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${e.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && zh.length > 6 && !zh.includes(e.zh)) { console.log('GLOSS-MISS', key, i, e.source, '->', e.zh, '::', zh.slice(0, 60)); notes++; }
    }
    for (const f of ctx.forbidden) {
      const srcRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${f.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (srcRe.test(src) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) { console.log('FORBIDDEN', key, i, f.source, f.forbidden, '->', f.prefer); bad++; }
    }
  });
}

const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length * p)].toFixed(2) : '-'; };
console.log(`zh/de ratio p5=${pct(ratiosZh, 0.05)} p50=${pct(ratiosZh, 0.5)} p95=${pct(ratiosZh, 0.95)}`);
console.log(`en/de ratio p5=${pct(ratiosEn, 0.05)} p50=${pct(ratiosEn, 0.5)} p95=${pct(ratiosEn, 0.95)}`);
console.log(`blocks=${blocks} sentences=${sents} problems=${bad} notes=${notes}`);
