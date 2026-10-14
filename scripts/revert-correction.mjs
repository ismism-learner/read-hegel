// Reject a specific review correction (used when the reviewer's edit is worse than the draft).
//   node scripts/revert-correction.mjs --vol w3 --chunk 2 --bi 3 --si 8 --text "…"
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const vol = opt('vol'), chunk = opt('chunk'), bi = opt('bi'), si = opt('si'), text = opt('text');
if (!vol || !chunk || bi === undefined || si === undefined || !text) {
  console.error('usage: --vol w3 --chunk 2 --bi 3 --si 8 --text "…"');
  process.exit(2);
}
const p = `web/data/trans/${vol}/${chunk}.json`;
const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
const blk = tr.blocks[String(bi)];
if (!blk || !Array.isArray(blk.zh)) { console.error('no such block'); process.exit(1); }
console.log('was : ' + blk.zh[Number(si)]);
blk.zh[Number(si)] = text;
fs.writeFileSync(p, JSON.stringify(tr), 'utf8');
console.log('now : ' + text);
