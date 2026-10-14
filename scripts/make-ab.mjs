// Build a controlled A/B: the same German units translated by two architectures.
//   node scripts/make-ab.mjs [--n 6] [--jobs data/_jobs/jobs-wave7.json]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const N = Number(opt('n', 6));
const JOBS = opt('jobs', 'data/_jobs/jobs-wave7.json');

const ids = JSON.parse(fs.readFileSync(JOBS, 'utf8')).slice(0, N);
fs.mkdirSync('data/_ab/armA', { recursive: true });
fs.mkdirSync('data/_ab/armB', { recursive: true });

for (const id of ids) {
  const src = JSON.parse(fs.readFileSync(path.join('data/_jobs', `${id}.in.json`), 'utf8'));
  for (const arm of ['armA', 'armB']) {
    const copy = { ...src, outFile: `data/_ab/${arm}/${id}.json`, arm };
    fs.writeFileSync(`data/_ab/${arm}/${id}.in.json`, JSON.stringify(copy, null, 1), 'utf8');
  }
}
fs.writeFileSync('data/_ab/ids.json', JSON.stringify(ids, null, 1), 'utf8');
const total = ids.reduce((a, id) => {
  const u = JSON.parse(fs.readFileSync(`data/_jobs/${id}.in.json`, 'utf8'));
  return a + u.blocks.reduce((x, b) => x + (b.sents ? b.sents.length : 0), 0);
}, 0);
console.log(`A/B units=${ids.length} sentences=${total}`);
console.log(`armA inputs: data/_ab/armA/*.in.json   armB inputs: data/_ab/armB/*.in.json`);
console.log(ids.join(' '));
