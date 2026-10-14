// Apply the corrections produced by the word-family repair agents.
//   node scripts/apply-family-patches.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const OUTD = 'web/data';
const JOBD = 'data/_jobs';

let files = 0, items = 0, applied = 0;
const skipped = [];

for (const f of fs.readdirSync(JOBD).filter((x) => /^family-\d+\.out\.json$/.test(x))) {
  files++;
  const data = JSON.parse(fs.readFileSync(path.join(JOBD, f), 'utf8'));
  const byTarget = new Map();
  for (const it of data.items || []) {
    const key = `${it.vol}/${it.chunk}`;
    if (!byTarget.has(key)) byTarget.set(key, []);
    byTarget.get(key).push(it);
  }
  for (const [key, list] of byTarget) {
    const [vol, chunkNo] = key.split('/');
    const p = path.join(OUTD, 'trans', vol, `${chunkNo}.json`);
    const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    for (const it of list) {
      items++;
      const val = tr.blocks[String(it.bi)];
      if (!val || !Array.isArray(val.zh)) { skipped.push(`${key}#${it.bi}.${it.si}: no block`); continue; }
      if (!it.zh || !String(it.zh).trim()) { skipped.push(`${key}#${it.bi}.${it.si}: empty correction`); continue; }
      if (val.zh[it.si] === it.zh) continue;
      val.zh[it.si] = it.zh;
      applied++; dirty = true;
    }
    if (dirty && APPLY) fs.writeFileSync(p, JSON.stringify(tr), 'utf8');
  }
}

console.log(`patch files: ${files}; items: ${items}; corrections ${APPLY ? 'applied' : 'to apply'}: ${applied}`);
if (skipped.length) { console.log(`skipped ${skipped.length}:`); for (const s of skipped.slice(0, 10)) console.log('  • ' + s); }
if (!APPLY) console.log('(dry run — pass --apply to write)');
