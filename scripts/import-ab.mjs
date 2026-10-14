// Import an A/B arm's output into the live corpus (same validation as merge-trans).
//   node scripts/import-ab.mjs --arm armB
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const ARM = opt('arm', 'armB');
const DIR = path.join('data/_ab', ARM);
const OUTD = 'web/data';

let merged = 0, restamped = 0, rejected = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^[a-z]\d+-\d+-\d+\.json$/.test(x))) {
  const unit = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const [, vol, chunkNo] = /^([a-z]\d+)-(\d+)-/.exec(f);
  const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', vol, `${chunkNo}.json`), 'utf8'));
  const target = path.join(OUTD, 'trans', vol, `${chunkNo}.json`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const cur = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : { v: vol, c: Number(chunkNo), pipeline: 'DE → EN → ZH, produced by this agent (no published translation used)', blocks: {} };
  for (const [key, val] of Object.entries(unit.blocks || {})) {
    const b = chunk.blocks[Number(key)];
    if (!b) { rejected.push(`${f}#${key} no such block`); continue; }
    if (b.k !== 'h') {
      const ns = b.ns || 0;
      if (!Array.isArray(val.en) || !Array.isArray(val.zh) || val.en.length !== ns || val.zh.length !== ns) {
        rejected.push(`${f}#${key} lengths vs ns=${ns}`);
        continue;
      }
    } else if (typeof val.en !== 'string' || typeof val.zh !== 'string') { rejected.push(`${f}#${key} heading`); continue; }
    if (val.h !== b.hash) restamped++;
    cur.blocks[key] = { h: b.hash, en: val.en, zh: val.zh };
    merged++;
  }
  fs.writeFileSync(target, JSON.stringify(cur), 'utf8');
}
console.log(`imported ${merged} blocks from ${ARM} (${restamped} hashes re-stamped)`);
if (rejected.length) console.log('rejected: ' + rejected.slice(0, 10).join(' | '));
