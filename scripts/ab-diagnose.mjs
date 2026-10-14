import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'data/_ab/armA';
for (const f of fs.readdirSync(dir).filter((x) => /^w1-.*\.json$/.test(x) && !x.endsWith('.in.json'))) {
  const unit = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const m = /^([a-z]\d+)-(\d+)-/.exec(f);
  const chunk = JSON.parse(fs.readFileSync(`web/data/vol/${m[1]}/${m[2]}.json`, 'utf8'));
  const bad = [];
  for (const [k, v] of Object.entries(unit.blocks || {})) {
    const b = chunk.blocks[Number(k)];
    if (!b || v.h !== b.hash) bad.push({ bi: k, inFile: v.h, chunk: b ? b.hash : 'NO BLOCK', kind: b ? b.k : '-' });
  }
  console.log(`${f}: blocks=${Object.keys(unit.blocks || {}).length} mismatches=${bad.length}`);
  bad.slice(0, 3).forEach((x) => console.log('   ', JSON.stringify(x)));
}
