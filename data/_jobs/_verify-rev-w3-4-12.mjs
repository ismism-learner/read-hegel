import fs from 'fs';
const dir = 'E:/文字稿优化/读黑学/data/_jobs/';
const buf = fs.readFileSync(dir + 'rev-w3-4-12.out.json');
const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
const out = JSON.parse(buf.toString('utf8'));
const inp = JSON.parse(fs.readFileSync(dir + 'rev-w3-4-12.in.json', 'utf8'));
console.log('BOM:', bom);
console.log('id:', out.id, '| items:', out.items.length, '| input items:', inp.items.length);
const key = i => i.bi + '.' + i.si;
const inMap = new Map(inp.items.map(i => [key(i), i]));
let diff = 0, bad = 0;
for (const o of out.items) {
  const i = inMap.get(key(o));
  if (!i) { console.log('EXTRA KEY', key(o)); bad++; continue; }
  if (o.vol !== i.vol || o.chunk !== i.chunk) { console.log('META MISMATCH', key(o)); bad++; }
  if (o.zh !== i.zh) {
    diff++;
    console.log('CHANGED ' + key(o));
    console.log('  OLD: ' + i.zh);
    console.log('  NEW: ' + o.zh);
  }
  inMap.delete(key(o));
}
if (inMap.size) { console.log('MISSING KEYS', [...inMap.keys()].join(',')); bad++; }
// key order / completeness
console.log('order ok:', JSON.stringify(out.items.map(key)) === JSON.stringify(inp.items.map(key)));
console.log('changed=' + diff + ' structural problems=' + bad);
// no stray whitespace/BOM chars inside strings, no trailing punctuation issues
const odd = out.items.filter(o => /[ \t]|^\s|\s$/.test(o.zh) || /[\u200b\ufeff]/.test(o.zh));
console.log('odd whitespace strings:', odd.length);
console.log('file bytes:', buf.length);
