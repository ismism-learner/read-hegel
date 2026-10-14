// Normalise every volume context package against the word-family table, so that the per-volume
// termbase cannot contradict the corpus-wide policy.
//   node scripts/normalize-context.mjs [--apply]
import fs from 'node:fs';

const APPLY = process.argv.includes('--apply');

const fam = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const head = fam.shift().split(',');
const ix = (n) => head.indexOf(n);
const members = new Map();
for (const l of fam) {
  const c = l.split(',');
  if (!c[ix('member_de')]) continue;
  members.set(c[ix('member_de')], { root: c[ix('root_zh')], zh: c[ix('member_zh')], family: c[ix('family')], sense: c[ix('sense')] });
}
console.log(`family members loaded: ${members.size}`);

let totalEntries = 0, fixedEntries = 0, fixedForbidden = 0;
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const changes = [];
  for (const e of c.entries || []) {
    const m = members.get(e.source);
    if (!m) continue;
    totalEntries++;
    // a systematic member must carry the family rendering; ordinary-sense members keep theirs
    if (m.sense === 'systematic' && e.zh !== m.zh) {
      changes.push(`entry ${e.source}: ${e.zh} → ${m.zh}`);
      e.zh = m.zh;
      if (!/词族/.test(e.note || '')) e.note = `词族 ${m.family}（词根：${m.root}）${e.note ? '；' + e.note : ''}`;
      fixedEntries++;
    }
  }
  // forbidden pairs must not contradict the family policy
  for (const x of c.forbidden || []) {
    const m = members.get(x.source);
    if (!m || m.sense !== 'systematic') continue;
    if (x.prefer !== m.zh) { changes.push(`forbidden ${x.source}: prefer ${x.prefer} → ${m.zh}`); x.prefer = m.zh; fixedForbidden++; }
  }
  // make sure every systematic member is present as an entry, and each has a forbidden guard
  if (!c.entries) c.entries = [];
  if (!c.forbidden) c.forbidden = [];
  for (const [de, m] of members) {
    if (m.sense !== 'systematic') continue;
    if (!c.entries.some((e) => e.source === de)) {
      c.entries.push({ source: de, en: '', zh: m.zh, type: 'term', note: `词族 ${m.family}（词根：${m.root}）` });
      changes.push(`entry added: ${de} → ${m.zh}`);
    }
  }
  if (changes.length) {
    if (APPLY) fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8');
    console.log(`\n${f}: ${changes.length} changes`);
    for (const ch of changes.slice(0, 12)) console.log('   • ' + ch);
    if (changes.length > 12) console.log(`   … ${changes.length - 12} more`);
  }
}
console.log(`\nsystematic entries seen: ${totalEntries}; rewritten: ${fixedEntries}; forbidden prefers fixed: ${fixedForbidden}${APPLY ? '' : '  (dry run — pass --apply)'}`);
