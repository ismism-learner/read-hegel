import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const buf = fs.readFileSync('data/_ab/armA/w1-13-0.json');
console.log('BOM:', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
const out = JSON.parse(buf.toString('utf8'));
const c = JSON.parse(fs.readFileSync('web/data/vol/w1/13.json', 'utf8'));
const job = JSON.parse(fs.readFileSync('data/_ab/armA/w1-13-0.in.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w1.json', 'utf8'));

const CJK = /[\u3400-\u9fff]/;
const isProse = (s) => (s.match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).length >= 2;
const rules = (ctx.entries || []).filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh)).map((e) => ({ de: e.source, zh: e.zh }));
const forbidden = (ctx.forbidden || []).filter((x) => x.source && x.forbidden && x.prefer).map((x) => [x.source, x.forbidden, x.prefer]);

let blocks = 0, sents = 0, bad = 0;
const issues = [];
for (const blk of job.blocks) {
  const key = String(blk.bi), val = out.blocks[key];
  if (!val) { console.log('MISSING', key); bad++; continue; }
  const b = c.blocks[blk.bi];
  if (val.h !== b.hash) { console.log('HASH MISMATCH', key, val.h, b.hash); bad++; continue; }
  blocks++;
  if (b.k === 'h') { console.log('h-block', key, 'en=', JSON.stringify(val.en), 'zh=', JSON.stringify(val.zh)); continue; }
  const de = sentencesFromMarked(b.x);
  if (val.en.length !== de.length || val.zh.length !== de.length) { console.log('LEN', key, val.en.length, val.zh.length, de.length); bad++; continue; }
  de.forEach((src, i) => {
    const en = (val.en[i] || '').trim(), zh = (val.zh[i] || '').trim();
    sents++;
    if (!en || !zh) { console.log('EMPTY', key, i); bad++; return; }
    if (CJK.test(en)) { console.log('EN-CJK', key, i); bad++; }
    if (!CJK.test(zh) && isProse(src)) { console.log('ZH-NOCJK', key, i); bad++; }
    if (zh === src.trim() && isProse(src)) { console.log('ECHO', key, i); bad++; }
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    if (deN > 40 && (zhN / deN < 0.22 || zhN / deN > 1.05)) { console.log('RATIO-ZH', key, i, (zhN / deN).toFixed(2), zhN, deN); bad++; }
    const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length, enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    if (deW > 8 && (enW / deW < 0.45 || enW / deW > 1.6)) issues.push([key, i, 'RATIO-EN ' + (enW / deW).toFixed(2)]);
    for (const r of rules) {
      const esc = r.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && zh.length > 6 && !zh.includes(r.zh)) issues.push([key, i, `GLOSS "${r.de}" != "${r.zh}"`]);
    }
    for (const [term, badw, good] of forbidden) {
      if (new RegExp(`\\b${term}\\b`).test(src) && zh.includes(badw) && !zh.includes(good)) issues.push([key, i, `FORBIDDEN ${term} ${badw}`]);
    }
  });
}
console.log('blocks=' + blocks + ' sentences=' + sents + ' critical=' + bad);
console.log('flags (' + issues.length + '):');
issues.forEach((x) => console.log('   ', x.join('  ')));
