// Merge part files written by translation workers into the canonical per-chunk files,
// then report coverage.   node scripts/merge-trans.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUTD = 'web/data';
const TRANS = path.join(OUTD, 'trans');
const manifest = JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8'));

let mergedFiles = 0, mergedBlocks = 0, restamped = 0, rejects = [];

for (const v of manifest.volumes) {
  const dir = path.join(TRANS, v.id);
  if (!fs.existsSync(dir)) continue;
  const parts = fs.readdirSync(dir).filter((f) => /\.p\d+\.json$/.test(f));
  for (const p of parts) {
    const chunkNo = p.split('.')[0];
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', v.id, `${chunkNo}.json`), 'utf8'));
    const target = path.join(dir, `${chunkNo}.json`);
    const cur = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : { v: v.id, c: Number(chunkNo), pipeline: 'DE → EN → ZH, produced by this agent (no published translation used)', blocks: {} };
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8')); } catch (e) { rejects.push(`${p}: ${e.message}`); continue; }

    for (const [key, val] of Object.entries(data.blocks || {})) {
      const bi = Number(key);
      const b = chunk.blocks[bi];
      if (!b) { rejects.push(`${p} block ${key}: no such block`); continue; }
      if (b.k === 'h') {
        if (typeof val.en !== 'string' || typeof val.zh !== 'string' || !val.en.trim() || !val.zh.trim()) {
          rejects.push(`${p} block ${key}: heading needs non-empty en/zh strings`); continue;
        }
      } else {
        const ns = b.ns || 0;
        const okEn = Array.isArray(val.en) && val.en.length === ns;
        const okZh = Array.isArray(val.zh) && val.zh.length === ns;
        if (!okEn || !okZh) { rejects.push(`${p} block ${key}: en=${val.en?.length} zh=${val.zh?.length} vs ns=${ns}`); continue; }
        if (val.en.some((s) => !String(s).trim()) || val.zh.some((s) => !String(s).trim())) {
          rejects.push(`${p} block ${key}: empty sentence entry`); continue;
        }
      }
      // The block key is the alignment contract; the hash is only a guard. Workers often
      // fail to copy it verbatim, so re-stamp it instead of silently losing the work.
      if (val.h !== b.hash) restamped++;
      cur.blocks[key] = { h: b.hash, en: val.en, zh: val.zh };
      mergedBlocks++;
    }
    fs.writeFileSync(target, JSON.stringify(cur), 'utf8');
    fs.unlinkSync(path.join(dir, p));
    mergedFiles++;
  }
}

console.log(`merged ${mergedBlocks} blocks from ${mergedFiles} part files (${restamped} hashes re-stamped from the block key)`);
if (rejects.length) {
  console.log(`REJECTED ${rejects.length}:`);
  for (const r of rejects.slice(0, 25)) console.log('  • ' + r);
  if (rejects.length > 25) console.log(`  … ${rejects.length - 25} more`);
}
