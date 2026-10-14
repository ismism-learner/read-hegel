// Remove loaded renderings from the policy artifacts (glossary + volume context packages).
// The research notes are exempt: they quote the criticism verbatim.
//   node scripts/fix-policy-artifacts.mjs
import fs from 'node:fs';

const RULES = [
  ['唯心主义者', '观念论者'], ['唯心主义的', '观念论的'], ['唯心主义', '观念论'],
  ['唯心论者', '观念论者'], ['唯心论的', '观念论的'], ['唯心论', '观念论'],
  ['唯心性', '观念性'], ['唯心的', '观念论的'], ['唯心', '观念'],
];

const files = [
  'glossary/hegel_glossar.csv',
  ...fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x)).map((x) => `data/_jobs/${x}`),
];
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  let after = before;
  const hits = [];
  for (const [from, to] of RULES) {
    const n = after.split(from).length - 1;
    if (n) { hits.push(`${from}→${to}×${n}`); after = after.split(from).join(to); }
  }
  if (after !== before) { fs.writeFileSync(f, after, 'utf8'); console.log(`${f}: ${hits.join(', ')}`); }
  else console.log(`${f}: clean`);
}

// the clause that licensed the banned term in polemical contexts must go
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const e of c.entries || []) {
    if (e.note && /论战语境作/.test(e.note)) { e.note = e.note.replace(/；?论战语境作“观念论”/, ''); n++; }
  }
  const TITLE_RULE = '书名与学派名中的 Idealismus 同样作“观念论”，不因通行书名而例外（《先验观念论体系》System des transzendentalen Idealismus、《德国观念论最古老的体系纲领》Das älteste Systemprogramm des deutschen Idealismus）；首次出现附德文原名，便于读者对照通行译名。';
  c.styleGuide = c.styleGuide || [];
  if (!c.styleGuide.some((s) => s.startsWith('书名与学派名中的 Idealismus'))) { c.styleGuide.push(TITLE_RULE); n++; }
  if (n) { fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8'); console.log(`${p}: ${n} adjustments`); }
}
