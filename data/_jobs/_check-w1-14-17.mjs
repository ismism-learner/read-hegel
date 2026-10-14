// One-off: ratio + alignment sanity for w1-14-17 out file.
import fs from 'node:fs';
const job = JSON.parse(fs.readFileSync('data/_jobs/w1-14-17.in.json', 'utf8'));
const out = JSON.parse(fs.readFileSync(job.outFile, 'utf8'));
const cw = (s) => (s.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
for (const b of job.blocks) {
  const v = out.blocks[String(b.bi)];
  b.sents.forEach((src, i) => {
    const en = v.en[i], zh = v.zh[i];
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    const rz = zhN / deN, re = cw(en) / cw(src);
    const flagZ = deN > 40 && (rz < 0.22 || rz > 1.05) ? '  <-- ZH RATIO' : '';
    const flagE = deN > 40 && cw(src) > 8 && (re < 0.45 || re > 1.6) ? '  <-- EN RATIO' : '';
    console.log(`${b.bi}.${i} de=${deN} zh=${zhN} rz=${rz.toFixed(2)} en/de=${re.toFixed(2)}${flagZ}${flagE}`);
  });
}
