// Verify paragraph-level structural alignment in the real DOM: the number of rendered pairs
// must equal the number of paragraph/heading blocks in the chunk data.
//   node scripts/verify-paragraph-align.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PAGES = [['w1', 0], ['w1', 21], ['w2', 3], ['w2', 14], ['w3', 0], ['w3', 3], ['w3', 6], ['w3', 9]];
const BASE = 'http://127.0.0.1:8788';

const run = (args) => new Promise((res) => {
  const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', () => {});
  p.on('close', () => res(out));
});

console.log('chunk     pairs  expected  headings  footnotes  errors');
let bad = 0;
for (const [v, c] of PAGES) {
  const chunk = JSON.parse(fs.readFileSync(`web/data/vol/${v}/${c}.json`, 'utf8'));
  // every block gets a row: paragraphs, headings and full-width footnote blocks
  const byKind = (k) => chunk.blocks.filter((b) => b.k === k).length;
  const paragraphs = byKind('p');
  const headings = byKind('h');
  const notes = byKind('fn');
  const expected = paragraphs + headings + notes;

  const out = await run(['scripts/check.mjs', `${BASE}/reader.html?v=${v}&c=${c}&lay=tri`, '--expr', 'JSON.stringify({pairs:document.querySelectorAll(".pair").length})', '--wait', '4000']);
  let d = null, errs = 0;
  try { const j = JSON.parse(out.replace(/^\uFEFF/, '')); d = JSON.parse(j.result); errs = j.errors.length; } catch {}
  const ok = d && d.pairs === expected && errs === 0;
  if (!ok) bad++;
  console.log(
    `${v}/${c}`.padEnd(9) + String(d ? d.pairs : '—').padEnd(7) + String(expected).padEnd(10) +
    String(headings).padEnd(10) + String(notes).padEnd(11) + errs + (ok ? '     ✓' : '     ✗'),
  );
}
console.log(`\npages checked: ${PAGES.length}, failures: ${bad}`);
