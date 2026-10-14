import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const buf = fs.readFileSync('web/data/trans/w1/9.p48.json');
console.log('BOM:', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
const out = JSON.parse(buf.toString('utf8'));
const c = JSON.parse(fs.readFileSync('web/data/vol/w1/9.json', 'utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w1-9-48.in.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w1.json', 'utf8'));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
let blocks = 0, sents = 0, bad = 0;
for (const blk of job.blocks) {
  const key = String(blk.bi);
  const val = out.blocks[key];
  const b = c.blocks[blk.bi];
  if (!val) { console.log('MISSING', key); bad++; continue; }
  blocks++;
  if (val.h !== b.hash) { console.log('HASH MISMATCH', key); bad++; }
  const de = sentencesFromMarked(b.x);
  if (val.en.length !== de.length || val.zh.length !== de.length) { console.log('LEN', key, val.en.length, val.zh.length, de.length); bad++; }
  de.forEach((src, i) => {
    sents++;
    const en = val.en[i], zh = val.zh[i];
    if (!en || !zh) { console.log('EMPTY', key, i); bad++; }
    if (CJK.test(en)) { console.log('EN-CJK', key, i); bad++; }
    if (!CJK.test(zh) && zh.length > 12) { console.log('ZH-NOCJK', key, i); bad++; }
    if (zh === src.trim()) { console.log('ECHO', key, i); bad++; }
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length, enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    if (deN > 40) {
      const rz = zhN / deN, re = deW > 8 ? enW / deW : null;
      if (rz < 0.22 || rz > 1.05) { console.log('RATIO-ZH', key, i, rz.toFixed(2), zhN, deN); bad++; }
      if (re !== null && (re < 0.45 || re > 1.6)) { console.log('RATIO-EN', key, i, re.toFixed(2), enW, deW); bad++; }
    }
  });
}

// source-aware glossary / forbidden checks
const required = { Recht: '权利', Gesetz: '法律', Geist: '精神', Schicksal: '命运', Leben: '生命', Liebe: '爱', Vereinigung: '结合', Trennung: '分离', Empfindung: '感受', Existenz: '存在', Dasein: '定在', Erscheinung: '现象', Verfassung: '宪法', Eigentum: '财产', Andacht: '虔诚', Zweck: '目的', Wahrheit: '真理', Wesen: '本质', Tugend: '美德', Volksgeist: '民族精神', Staat: '国家', Aufhebung: '扬弃', Moment: '环节' };
for (const blk of job.blocks) {
  const key = String(blk.bi);
  const de = sentencesFromMarked(c.blocks[blk.bi].x);
  de.forEach((src, i) => {
    const zh = out.blocks[key].zh[i];
    for (const [t, w] of Object.entries(required)) {
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${t}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (re.test(src) && !zh.includes(w)) console.log('GLOSS-MISS', key, i, t, '->', w);
    }
    for (const f of ctx.forbidden) {
      const srcRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${f.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
      if (srcRe.test(src) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) console.log('FORBIDDEN', key, i, f.source, f.forbidden);
    }
  });
}
console.log(`blocks=${blocks} sentences=${sents} problems=${bad}`);
console.log('block keys:', Object.keys(out.blocks).join(','), '| unit:', out.unit, '| stage:', out.stage);
