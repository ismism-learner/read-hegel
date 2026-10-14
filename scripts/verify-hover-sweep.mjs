// Verify sentence-level hover linkage across a sample of translated chunks.
//   node scripts/verify-hover-sweep.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PAGES = [
  ['w1', 0], ['w1', 21], ['w2', 3], ['w2', 14], ['w3', 0], ['w3', 1], ['w3', 2], ['w3', 3], ['w3', 4],
];
const BASE = 'http://127.0.0.1:8788';

const run = (args) => new Promise((res) => {
  const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', () => {});
  p.on('close', () => res(out));
});

console.log('chunk      spans de/zh/en     hover(de)   zh-underline  shift  errors');
let bad = 0;
for (const [v, c] of PAGES) {
  const out = await run(['scripts/check.mjs', `${BASE}/reader.html?v=${v}&c=${c}&lay=tri`, '--expr-file', 'scripts/assert-tri.js', '--wait', '4500']);
  let d = null, errs = null;
  try {
    const j = JSON.parse(out.replace(/^\uFEFF/, ''));
    d = JSON.parse(j.result);
    errs = j.errors;
  } catch { }
  if (!d) { console.log(`${v}/${c}`.padEnd(10) + ' — FAILED to parse'); bad++; continue; }
  const ok = d.sentSpansDe === d.sentSpansZh && d.sentSpansZh === d.sentSpansEn
    && d.underlineAfter === '100% 2px' && d.zhUnderline === '100% 2px' && d.deShift === '3px' && errs.length === 0;
  if (!ok) bad++;
  console.log(
    `${v}/${c}`.padEnd(10) +
    `${d.sentSpansDe}/${d.sentSpansZh}/${d.sentSpansEn}`.padEnd(20) +
    String(d.underlineAfter).padEnd(12) + String(d.zhUnderline).padEnd(14) +
    String(d.deShift).padEnd(7) + errs.length + (ok ? '  ✓' : '  ✗'),
  );
}
console.log(`\npages checked: ${PAGES.length}, failures: ${bad}`);
