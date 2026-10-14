import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const P = 'web/data/trans/w3/4.p19.json';
const buf = fs.readFileSync(P);
console.log('BOM:', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
const out = JSON.parse(buf.toString('utf8'));
const c = JSON.parse(fs.readFileSync('web/data/vol/w3/4.json', 'utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w3-4-19.in.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w3.json', 'utf8'));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
const NEG_IDIOM = /\b(nichts|nicht|kein[a-z]*)\b[^.;]{0,80}?\bals\b|nicht\s+weniger|nicht\s+umhin|es\s+sei\s+denn/i;
const NEG_IDIOM_ZH = /只|仅|无非|不外|不过|除了|只得|只能|只好|同样|不亚/;

function dupFragment(s) {
  const t = s.replace(/[，。；：、！？（）「」“”…—\s]/g, '');
  for (let len = 24; len >= 6; len--) {
    for (let i = 0; i + 2 * len <= t.length; i++) {
      if (t.slice(i, i + len) === t.slice(i + len, i + 2 * len)) return t.slice(i, i + len);
    }
  }
  return null;
}

let blocks = 0, sents = 0, bad = 0;
const ratiosZh = [], ratiosEn = [];
const zhSeen = new Map();

for (const blk of job.blocks) {
  const key = String(blk.bi);
  const val = out.blocks[key];
  const b = c.blocks[blk.bi];
  if (!val) { console.log('MISSING', key); bad++; continue; }
  blocks++;
  if (val.h !== blk.hash) { console.log('HASH-VS-JOB', key, val.h, blk.hash); bad++; }
  if (val.h !== b.hash) { console.log('HASH-VS-VOL', key); bad++; }
  if (b.k === 'h') {
    if (typeof val.en !== 'string' || typeof val.zh !== 'string' || !val.en.trim() || !val.zh.trim()) { console.log('HEAD', key); bad++; }
    if (CJK.test(val.en) || !CJK.test(val.zh)) { console.log('HEAD-LANG', key); bad++; }
    continue;
  }
  const de = sentencesFromMarked(b.x);
  const deJob = blk.sents;
  if (JSON.stringify(de) !== JSON.stringify(deJob)) { console.log('JOB-SENTS-DIFFER', key); bad++; }
  if (val.en.length !== deJob.length || val.zh.length !== deJob.length) { console.log('LEN', key, val.en.length, val.zh.length, deJob.length); bad++; }
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
    if (enEnds !== 1) console.log('EN-SENT-COUNT', key, i, enEnds, '::', en.slice(0, 70));
    if (DE_NEG.test(src) && !ZH_NEG.test(zh) && !(NEG_IDIOM.test(src) && NEG_IDIOM_ZH.test(zh))) { console.log('NEG-DROPPED', key, i, '::', src.slice(0, 70)); bad++; }
    const dup = dupFragment(zh);
    if (dup) { console.log('DUP-FRAG', key, i, dup); bad++; }
    const k2 = zh;
    if (zh.length > 24) {
      const prev = zhSeen.get(k2);
      if (prev && prev !== src.slice(0, 40)) { console.log('SAME-ZH', key, i); bad++; } else zhSeen.set(k2, src.slice(0, 40));
    }
  });
}

const entries = ctx.entries.filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh));
for (const blk of job.blocks) {
  const key = String(blk.bi);
  const b = c.blocks[blk.bi];
  if (b.k === 'h') continue;
  const de = sentencesFromMarked(b.x);
  de.forEach((src, i) => {
    const zh = out.blocks[key].zh[i];
    for (const e of entries) {
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${e.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && zh.length > 6 && !zh.includes(e.zh)) console.log('GLOSS-MISS', key, i, e.source, '->', e.zh);
    }
    for (const f of ctx.forbidden) {
      const srcRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${f.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (srcRe.test(src) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) console.log('FORBIDDEN', key, i, f.source, f.forbidden, '->', f.prefer);
    }
  });
}

const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length * p)].toFixed(2) : '-'; };
console.log(`zh/de ratio p5=${pct(ratiosZh, 0.05)} p50=${pct(ratiosZh, 0.5)} p95=${pct(ratiosZh, 0.95)}`);
console.log(`en/de ratio p5=${pct(ratiosEn, 0.05)} p50=${pct(ratiosEn, 0.5)} p95=${pct(ratiosEn, 0.95)}`);
console.log(`blocks=${blocks} sentences=${sents} problems=${bad}`);
console.log('keys:', Object.keys(out.blocks).join(','), '| unit:', out.unit, '| stage:', out.stage);
