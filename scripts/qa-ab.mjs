// Evaluate one A/B arm with the deterministic checks, then compare the arms.
//   node scripts/qa-ab.mjs
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const OUTD = 'web/data';
const AB = 'data/_ab';
const CJK = /[\u3400-\u9fff]/;
const isProse = (s) => (s.match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).length >= 2;

const ctxCache = new Map();
function rulesFor(vol) {
  if (ctxCache.has(vol)) return ctxCache.get(vol);
  const f = `data/_jobs/context-${vol}.json`;
  let out = { rules: [], forbidden: [] };
  if (fs.existsSync(f)) {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    out = {
      rules: (c.entries || []).filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh)).map((e) => ({ de: e.source, zh: e.zh })),
      forbidden: (c.forbidden || []).filter((x) => x.source && x.forbidden && x.prefer).map((x) => [x.source, x.forbidden, x.prefer]),
    };
  }
  ctxCache.set(vol, out);
  return out;
}

function evaluate(dir) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.json$/.test(f) && !/\.in\.json$/.test(f)) : [];
  const issues = [];
  let sentences = 0, blocks = 0, restamped = 0;
  for (const f of files) {
    const unit = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const m = /^([a-z]\d+)-(\d+)-/.exec(f);
    if (!m) continue;
    const [, vol, chunkNo] = m;
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', vol, `${chunkNo}.json`), 'utf8'));
    const { rules, forbidden } = rulesFor(vol);
    for (const [key, val] of Object.entries(unit.blocks || {})) {
      const bi = Number(key);
      const b = chunk.blocks[bi];
      const where = `${vol}/${chunkNo}#${bi}`;
      if (!b) { issues.push({ sev: 'critical', where, msg: 'no such block' }); continue; }
      // The block key is the alignment contract; a worker's missing/incorrect hash is re-stamped
      // (workers frequently fail to copy it) instead of being treated as a defect.
      if (val.h !== b.hash) restamped++;
      if (b.k === 'h') { blocks++; continue; }
      const de = sentencesFromMarked(b.x);
      if (!Array.isArray(val.en) || !Array.isArray(val.zh) || val.en.length !== de.length || val.zh.length !== de.length) {
        issues.push({ sev: 'critical', where, msg: `lengths ${val.en?.length}/${val.zh?.length} vs ${de.length}` });
        continue;
      }
      blocks++;
      de.forEach((src, i) => {
        const en = (val.en[i] || '').trim(), zh = (val.zh[i] || '').trim();
        sentences++;
        if (!en || !zh) { issues.push({ sev: 'critical', where, msg: `sentence ${i} empty` }); return; }
        if (CJK.test(en)) issues.push({ sev: 'major', where, msg: `sentence ${i}: English has CJK` });
        if (!CJK.test(zh) && isProse(src)) issues.push({ sev: 'major', where, msg: `sentence ${i}: Chinese without CJK` });
        if (zh === src.trim() && isProse(src)) issues.push({ sev: 'major', where, msg: `sentence ${i}: identical to German` });
        const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
        if (deN > 40 && (zhN / deN < 0.22 || zhN / deN > 1.05)) issues.push({ sev: 'major', where, msg: `sentence ${i}: zh/de ${(zhN / deN).toFixed(2)}` });
        for (const r of rules) {
          const esc = r.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
          if (re.test(src) && zh.length > 6 && !zh.includes(r.zh)) issues.push({ sev: 'minor', where, msg: `sentence ${i}: "${r.de}" ≠ “${r.zh}”` });
        }
        for (const [term, bad, good] of forbidden) {
          if (new RegExp(`\\b${term}\\b`).test(src) && zh.includes(bad) && !zh.includes(good)) {
            issues.push({ sev: 'major', where, msg: `sentence ${i}: "${term}" → forbidden “${bad}”` });
          }
        }
      });
    }
  }
  const sev = { critical: 0, major: 0, minor: 0 };
  for (const i of issues) sev[i.sev]++;
  return { files: files.length, blocks, sentences, issues, sev, restamped };
}

const A = evaluate(path.join(AB, 'armA'));
const B = evaluate(path.join(AB, 'armB'));
const rate = (x) => (x.sentences ? +(x.issues.length / x.sentences * 100).toFixed(1) : 0);
const mrate = (x) => (x.sentences ? +(x.sev.major / x.sentences * 100).toFixed(2) : 0);

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('arm', 34) + pad('blocks', 8) + pad('sent', 7) + pad('issues', 8) + pad('/100', 7) + pad('major', 7) + 'major/100');
console.log(pad('A  context + translate', 34) + pad(A.blocks, 8) + pad(A.sentences, 7) + pad(A.issues.length, 8) + pad(rate(A), 7) + pad(A.sev.major, 7) + mrate(A));
console.log(pad('B  context + translate + review', 34) + pad(B.blocks, 8) + pad(B.sentences, 7) + pad(B.issues.length, 8) + pad(rate(B), 7) + pad(B.sev.major, 7) + mrate(B));

const kinds = (x) => {
  const k = new Map();
  for (const i of x.issues) {
    const key = i.msg.replace(/\d+(\.\d+)?/g, 'N').replace(/"[^"]*"/g, '"X"').slice(0, 48);
    k.set(key, (k.get(key) || 0) + 1);
  }
  return [...k.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
};
console.log('\narm A top kinds:'); kinds(A).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));
console.log('arm B top kinds:'); kinds(B).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`));

fs.mkdirSync('data/_qa', { recursive: true });
fs.writeFileSync('data/_qa/ab.json', JSON.stringify({ A: { ...A, issues: A.issues.slice(0, 400) }, B: { ...B, issues: B.issues.slice(0, 400) } }, null, 1), 'utf8');
console.log('\nreport: data/_qa/ab.json');
