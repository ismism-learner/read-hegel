// Apply the terminology policy: Idealismus → 观念论 (never 唯心主义), and its family.
//   node scripts/apply-term-policy.mjs
import fs from 'node:fs';

/* 1) shared glossary */
const GLOSS = 'glossary/hegel_glossar.csv';
const rows = [
  ['Idealismus', 'idealism', '观念论', 'ok', '政策：不作“唯心主义”；指以观念/理念为原则的哲学，与 Realismus 对举'],
  ['idealistisch', 'idealistic', '观念论的', 'ok', '政策：不作“唯心(主义)的”'],
  ['Idealität', 'ideality', '观念性', 'ok', '政策：不作“唯心性”'],
  ['das Ideelle', 'the ideal (as such)', '观念物', 'variante', '与 das Reelle（实在物）对举；亦可作“观念的东西”'],
  ['Idealrealismus', 'ideal-realism', '观念实在论', 'ok', 'Hegel 自造词，兼取观念论与实在论'],
  ['Realismus', 'realism', '实在论', 'ok', '与 Idealismus（观念论）对举；不作“现实主义”'],
  ['Realität', 'reality', '实在性', 'ok', '与 Idealität（观念性）对举'],
  ['Ideenlehre', 'doctrine of ideas', '理念论', 'ok', '专指柏拉图的理念论'],
  ['Idee', 'idea', '理念', 'ok', '与 Begriff（概念）、Vorstellung（表象）区分'],
];

const raw = fs.readFileSync(GLOSS, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const head = lines.shift();
const cols = head.split(',');
const di = cols.indexOf('de'), ei = cols.indexOf('en'), zi = cols.indexOf('zh'), si = cols.indexOf('status'), ni = cols.indexOf('note');
const body = lines.map((l) => l.split(','));
const index = new Map(body.map((c, i) => [(c[di] || '').trim(), i]));
let added = 0, updated = 0;
for (const [de, en, zh, status, note] of rows) {
  const i = index.get(de);
  if (i === undefined) { body.push([de, en, zh, status, note]); added++; }
  else { body[i][zi] = zh; body[i][si] = status; body[i][ni] = note; updated++; }
}
fs.writeFileSync(GLOSS, '\uFEFF' + head + '\n' + body.map((r) => r.join(',')).join('\n') + '\n', 'utf8');
console.log(`glossary: ${added} rows added, ${updated} rows updated`);

/* 2) volume context packages: add the forbidden pairs (idempotent) */
const PAIRS = [
  { source: 'Idealismus', forbidden: '唯心主义', prefer: '观念论', why: '政策：Idealismus 一律作“观念论”' },
  { source: 'idealistisch', forbidden: '唯心的', prefer: '观念论的', why: '同上' },
  { source: 'Idealität', forbidden: '唯心性', prefer: '观念性', why: '同上' },
];
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.forbidden = c.forbidden || [];
  let n = 0;
  for (const pair of PAIRS) {
    if (!c.forbidden.some((x) => x.source === pair.source && x.forbidden === pair.forbidden)) {
      c.forbidden.push(pair); n++;
    }
  }
  if (n) { fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8'); console.log(`context ${f}: +${n} forbidden pairs`); }
}

/* 3) shared glossary CSV already carries the policy; report */
console.log('done. re-run: node scripts/qa-trans.mjs');
