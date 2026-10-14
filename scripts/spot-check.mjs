import fs from 'node:fs';
const f = process.argv[2] || 'web/data/trans/w1/1.json';
const t = JSON.parse(fs.readFileSync(f, 'utf8'));
const chunk = JSON.parse(fs.readFileSync('web/data/vol/w1/1.json', 'utf8'));
const keys = Object.keys(t.blocks).slice(0, 3);
for (const k of keys) {
  const b = t.blocks[k];
  const g = chunk.blocks[k];
  console.log(`\n=== block ${k} (${g.k}) ===`);
  if (g.k === 'h') { console.log('DE:', g.x.replace(/<[^>]+>/g, '').trim(), '\nEN:', b.en, '\nZH:', b.zh); continue; }
  const de = [...g.x.matchAll(/<span class="s"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  b.zh.forEach((z, i) => {
    console.log(`  DE${i}: ${(de[i] || '').slice(0, 90)}`);
    console.log(`  EN${i}: ${(b.en[i] || '').slice(0, 90)}`);
    console.log(`  ZH${i}: ${z.slice(0, 90)}`);
  });
}
