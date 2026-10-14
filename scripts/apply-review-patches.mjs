// Apply conservative-review corrections produced by the review agents.
//   node scripts/apply-review-patches.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
let files = 0, items = 0, changed = 0;
const skipped = [];

for (const f of fs.readdirSync('data/_jobs').filter((x) => /^rev-.*\.out\.json$/.test(x))) {
  files++;
  const data = JSON.parse(fs.readFileSync(path.join('data/_jobs', f), 'utf8'));
  const byChunk = new Map();
  for (const it of data.items || []) {
    const key = `${it.vol}/${it.chunk}`;
    if (!byChunk.has(key)) byChunk.set(key, []);
    byChunk.get(key).push(it);
  }
  for (const [key, list] of byChunk) {
    const [vol, chunkNo] = key.split('/');
    const p = `web/data/trans/${vol}/${chunkNo}.json`;
    const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    for (const it of list) {
      items++;
      const blk = tr.blocks[String(it.bi)];
      if (!blk || !Array.isArray(blk.zh)) { skipped.push(`${key}#${it.bi}.${it.si}: no block`); continue; }
      if (!it.zh || !String(it.zh).trim()) { skipped.push(`${key}#${it.bi}.${it.si}: empty correction`); continue; }
      if (blk.zh[it.si] === it.zh) continue;
      blk.zh[it.si] = it.zh;
      changed++; dirty = true;
    }
    if (dirty && APPLY) fs.writeFileSync(p, JSON.stringify(tr), 'utf8');
  }
}
console.log(`review patch files: ${files}; items: ${items}; corrections ${APPLY ? 'applied' : 'to apply'}: ${changed}`);
if (skipped.length) { console.log(`skipped ${skipped.length}:`); for (const s of skipped.slice(0, 8)) console.log('  • ' + s); }
if (!APPLY) console.log('(dry run — pass --apply to write)');
