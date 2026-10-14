// After a rebuild, a translated block whose German sentence count changed no longer lines up.
// Drop exactly those blocks so the "untranslated ⇒ re-queue" mechanism picks them up again.
//   node scripts/drop-stale-blocks.mjs [--apply]
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));

let droppedBlocks = 0, droppedSentences = 0, touchedFiles = 0;
const perVol = new Map();

for (const v of manifest.volumes) {
  for (const m of v.chunks) {
    const tf = path.join('web/data/trans', v.id, `${m.i}.json`);
    if (!fs.existsSync(tf)) continue;
    const trans = JSON.parse(fs.readFileSync(tf, 'utf8'));
    const chunk = JSON.parse(fs.readFileSync(path.join('web/data/vol', v.id, `${m.i}.json`), 'utf8'));
    let dirty = false;
    for (const [key, val] of Object.entries(trans.blocks || {})) {
      const b = chunk.blocks[Number(key)];
      if (!b) { delete trans.blocks[key]; dirty = true; droppedBlocks++; continue; }
      if (b.k !== 'p') continue;
      const ns = b.ns || 0;
      const ok = Array.isArray(val.en) && Array.isArray(val.zh) && val.en.length === ns && val.zh.length === ns;
      // also drop blocks whose hash drifted (the German text itself changed)
      if (!ok || (val.h && val.h !== b.hash)) {
        droppedSentences += Math.max(ns, (val.zh || []).length);
        delete trans.blocks[key];
        dirty = true;
        droppedBlocks++;
        perVol.set(v.id, (perVol.get(v.id) || 0) + 1);
      }
    }
    if (dirty) {
      touchedFiles++;
      if (APPLY) fs.writeFileSync(tf, JSON.stringify(trans), 'utf8');
    }
  }
}
console.log(`stale translated blocks ${APPLY ? 'dropped' : 'to drop'}: ${droppedBlocks} (${droppedSentences} sentences) in ${touchedFiles} files`);
console.log('per volume:', [...perVol.entries()].map(([k, n]) => `${k}:${n}`).join('  ') || 'none');
if (!APPLY) console.log('(dry run — pass --apply to write)');
