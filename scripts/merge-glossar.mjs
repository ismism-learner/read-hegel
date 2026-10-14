// Merge per-unit glossary files written by translation workers into the shared glossary.
// Existing terms are kept; only new "de" keys are appended, and unsicher/new rows are reported.
//   node scripts/merge-glossar.mjs
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'glossary/hegel_glossar.csv';
const JOBD = 'data/_jobs';

const readCsv = (file) => {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',');
  return { head, rows: lines.map((l) => l.split(',')) };
};

const main = readCsv(MAIN);
const keyIdx = main.head.indexOf('de');
const have = new Set(main.rows.map((r) => (r[keyIdx] || '').trim().toLowerCase()));

let added = [], skipped = 0;
const files = fs.existsSync(JOBD) ? fs.readdirSync(JOBD).filter((f) => /\.glossar\.csv$/.test(f)) : [];
for (const f of files) {
  let data;
  try { data = readCsv(path.join(JOBD, f)); } catch { continue; }
  const kIdx = data.head.indexOf('de');
  if (kIdx < 0) continue;
  for (const r of data.rows) {
    const key = (r[kIdx] || '').trim();
    if (!key || have.has(key.toLowerCase())) { skipped++; continue; }
    have.add(key.toLowerCase());
    added.push(r.map((c) => (c || '').trim()));
  }
}

if (added.length) {
  const body = fs.readFileSync(MAIN, 'utf8').replace(/\s*$/, '\n');
  const out = body + added.map((r) => r.join(',')).join('\n') + '\n';
  fs.writeFileSync(MAIN, out, 'utf8');
}

console.log(`glossary files: ${files.length}  added: ${added.length}  already present: ${skipped}`);
const unsicher = added.filter((r) => (r[3] || '').toLowerCase() === 'unsicher');
if (unsicher.length) {
  console.log('new uncertain renderings to review:');
  for (const r of unsicher.slice(0, 15)) console.log(`  • ${r[0]} → ${r[1]} → ${r[2]}   (${r[4] || ''})`);
}
