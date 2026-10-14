// Compare translation quality between architecture groups using the qa-trans report.
//   node scripts/qa-compare.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUTD = 'web/data';
const report = JSON.parse(fs.readFileSync('data/_qa/report.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8'));

// groups by chunk
const GROUPS = {
  'v1 (translate + length check)': ['w1/0', 'w1/1', 'w1/2', 'w1/3', 'w1/4', 'w3/0'],
  'v2 (context + translate + review)': ['w1/5', 'w1/6', 'w1/7'],
  'v2.1 (context + translate only)': ['w1/8', 'w1/9', 'w1/10'],
};

const sentencesIn = (keys) => {
  let n = 0;
  for (const v of manifest.volumes) {
    for (const m of v.chunks) {
      const k = `${v.id}/${m.i}`;
      if (!keys.includes(k)) continue;
      const tf = path.join(OUTD, 'trans', v.id, `${m.i}.json`);
      if (!fs.existsSync(tf)) continue;
      const tr = JSON.parse(fs.readFileSync(tf, 'utf8'));
      const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', v.id, `${m.i}.json`), 'utf8'));
      for (const [bi, val] of Object.entries(tr.blocks || {})) {
        const b = chunk.blocks[bi];
        if (b && b.k === 'p' && val.h === b.hash) n += (b.ns || 0);
      }
    }
  }
  return n;
};

const rows = [];
for (const [name, keys] of Object.entries(GROUPS)) {
  const mine = report.issues.filter((i) => keys.includes(i.where.split('#')[0]));
  const n = sentencesIn(keys);
  const sev = { critical: 0, major: 0, minor: 0 };
  for (const i of mine) sev[i.sev]++;
  rows.push({
    group: name,
    sentences: n,
    issues: mine.length,
    per100: n ? +(mine.length / n * 100).toFixed(1) : 0,
    major: sev.major,
    majorPer100: n ? +(sev.major / n * 100).toFixed(2) : 0,
    minor: sev.minor,
    critical: sev.critical,
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('group', 36) + pad('sent', 6) + pad('issues', 8) + pad('per100', 8) + pad('major', 7) + pad('major/100', 11) + 'critical');
for (const r of rows) {
  console.log(pad(r.group, 36) + pad(r.sentences, 6) + pad(r.issues, 8) + pad(r.per100, 8) + pad(r.major, 7) + pad(r.majorPer100, 11) + r.critical);
}
