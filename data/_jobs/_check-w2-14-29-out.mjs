import fs from 'node:fs';
const out = JSON.parse(fs.readFileSync('web/data/trans/w2/14.p29.json', 'utf8'));
const re = /[。！？]/;
for (const [k, b] of Object.entries(out.blocks)) {
  b.zh.forEach((s, i) => {
    const body = s.replace(/[。！？]+$/, '');
    if (re.test(body)) console.log(`block ${k} sent ${i}: internal terminator ->`, s);
  });
}
console.log('--- counts ---');
for (const [k, b] of Object.entries(out.blocks)) console.log(k, 'en', b.en.length, 'zh', b.zh.length);
