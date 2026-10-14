import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('web/data/vol/w1/0.json', 'utf8'));
for (const bi of [5, 7]) {
  const b = d.blocks[bi];
  console.log(`\n===== block ${bi}  ns=${b.ns} =====`);
  console.log(b.x.slice(0, 260));
  console.log('--- spans ---');
  [...b.x.matchAll(/<span class="s" data-sid="([^"]+)">([\s\S]*?)<\/span>/g)]
    .forEach((m, i) => console.log(`${i} [${m[1]}]: ${m[2].replace(/<[^>]+>/g, '').slice(0, 90)}`));
}
