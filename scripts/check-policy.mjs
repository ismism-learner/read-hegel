// Policy guard: the user's word-family/terminology policy is the highest authority.
// Fails (exit 1) if any artifact contradicts it or the authority order is missing.
//   node scripts/check-policy.mjs
import fs from 'node:fs';
import path from 'node:path';

const problems = [];

/* 1. authority order must head every volume context package */
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const c = JSON.parse(fs.readFileSync(`data/_jobs/${f}`, 'utf8'));
  const first = (c.styleGuide || [])[0] || '';
  if (!first.startsWith('权威顺序（不可颠倒）')) problems.push(`${f}: authority order is not the first style rule`);
  const hasPolicy = (c.styleGuide || []).some((s) => /词根一致/.test(s));
  if (!hasPolicy) problems.push(`${f}: word-family policy rule missing`);
}

/* 2. no loaded rendering anywhere in the shipped artifacts */
const BANNED = ['唯心主义', '唯心论', '唯心性', '唯心的', '唯心主义者'];
const walk = (dir, cb) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else if (/\.(json|csv|md|mjs|js|html)$/.test(e.name)) cb(p);
  }
};
let scanned = 0;
walk('web/data/trans', (p) => {
  scanned++;
  const t = fs.readFileSync(p, 'utf8');
  for (const b of BANNED) if (t.includes(b)) problems.push(`${p}: contains banned rendering “${b}”`);
});
// the research notes legitimately quote the banned words, so only glossary/context are checked
for (const p of ['glossary/hegel_glossar.csv', 'glossary/hegel_families.csv', ...fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x)).map((x) => `data/_jobs/${x}`)]) {
  const t = fs.readFileSync(p, 'utf8');
  for (const b of BANNED) {
    // allowed only inside a "forbidden"/"严禁"/"不作" context on the same line
    for (const line of t.split(/\r?\n/)) {
      if (!line.includes(b)) continue;
      if (/严禁|不作|不得|forbidden|政策/.test(line)) continue;
      problems.push(`${p}: “${b}” appears outside a prohibition — ${line.slice(0, 90)}`);
    }
  }
}

/* 3. volume termbases must agree with the family table */
const famLines = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const fh = famLines.shift().split(',');
const fx = (n) => fh.indexOf(n);
const members = new Map();
for (const l of famLines) {
  const c = l.split(',');
  if ((c[fx('sense')] || '') !== 'systematic') continue;
  members.set(c[fx('member_de')], c[fx('member_zh')]);
}
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const c = JSON.parse(fs.readFileSync(`data/_jobs/${f}`, 'utf8'));
  for (const e of c.entries || []) {
    const want = members.get(e.source);
    if (want && e.zh !== want) problems.push(`${f}: entry ${e.source} = “${e.zh}” contradicts the policy (“${want}”)`);
  }
  for (const x of c.forbidden || []) {
    const want = members.get(x.source);
    if (want && x.prefer !== want) problems.push(`${f}: forbidden ${x.source} prefer “${x.prefer}” ≠ policy “${want}”`);
  }
}

console.log(`translation files scanned: ${scanned}`);
if (problems.length) {
  console.log(`\nPOLICY VIOLATIONS: ${problems.length}`);
  for (const p of problems.slice(0, 25)) console.log('  ✗ ' + p);
  if (problems.length > 25) console.log(`  … ${problems.length - 25} more`);
  process.exit(1);
}
console.log('policy guard: OK — the user\'s word-family policy is intact and supreme');
