// Enforce the word-family policy (glossary/hegel_families.csv):
//   1. write the family members into the shared glossary
//   2. report where an existing translation breaks a family (root missing)
//   3. --apply : rewrite the known non-family variants inside sentences whose German
//      actually contains a family member
//   node scripts/apply-families.mjs [--apply] [--family Idee]
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const APPLY = process.argv.includes('--apply');
const ONLY = (() => { const i = process.argv.indexOf('--family'); return i >= 0 ? process.argv[i + 1] : ''; })();
const OUTD = 'web/data';

/* ---------- load the family table ---------- */
const rawFam = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '');
const flines = rawFam.split(/\r?\n/).filter((l) => l.trim());
const fhead = flines.shift().split(',');
const fx = (n) => fhead.indexOf(n);
const families = new Map();
for (const l of flines) {
  const c = l.split(',');
  const fam = c[fx('family')];
  if (ONLY && fam !== ONLY) continue;
  if (!families.has(fam)) families.set(fam, { root: c[fx('root_zh')], members: [] });
  families.get(fam).members.push({
    de: c[fx('member_de')], zh: c[fx('member_zh')],
    sense: c[fx('sense')], status: c[fx('status')], note: c[fx('note')] || '',
  });
}

/* ---------- 1. shared glossary rows ---------- */
const GLOSS = 'glossary/hegel_glossar.csv';
const graw = fs.readFileSync(GLOSS, 'utf8').replace(/^\uFEFF/, '');
const glines = graw.split(/\r?\n/).filter((l) => l.trim());
const ghead = glines.shift();
const gcols = ghead.split(',');
const gi = (n) => gcols.indexOf(n);
const gbody = glines.map((l) => l.split(','));
const gindex = new Map(gbody.map((c, i) => [(c[gi('de')] || '').trim(), i]));
let added = 0, updated = 0;
for (const [fam, f] of families) {
  for (const m of f.members) {
    if (m.sense !== 'systematic') continue;
    const row = [m.de, '', m.zh, m.status === 'exception' ? 'variante' : 'ok', `词族 ${fam}（词根：${f.root}）${m.note}`];
    const i = gindex.get(m.de);
    if (i === undefined) { gbody.push(row); gindex.set(m.de, gbody.length - 1); added++; }
    else { gbody[i][gi('zh')] = m.zh; gbody[i][gi('status')] = row[3]; gbody[i][gi('note')] = row[4]; updated++; }
  }
}
if (APPLY) fs.writeFileSync(GLOSS, '\uFEFF' + ghead + '\n' + gbody.map((r) => r.join(',')).join('\n') + '\n', 'utf8');
console.log(`glossary: +${added} / ~${updated} rows (${APPLY ? 'written' : 'dry run'})`);

/* ---------- 2+3. scan the corpus for family breaks ---------- */
// Each family lists substitutions for a rendering that lost the family root.
// `not` guards against a sentence where the competing family is also present.
const VARIANTS = {
  Idee: { rules: [['理念', '观念'], ['唯心主义', '观念论'], ['唯心的', '观念论的'], ['唯心性', '观念性'], ['唯心', '观念']] },
  Realität: { rules: [['现实主义', '实在论']] },
  Begriff: { rules: [['无观念', '无概念']] },
  Wirklichkeit: { rules: [['真正的', '现实的']], not: /wahr(?!e?[a-z])/i },
  Vorstellung: { rules: [['观念', '表象']], not: /Idee|ideal|Ideell/i },
};

const memberRe = (de) => new RegExp(`(?<![A-Za-zÄÖÜäöüß])${de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
let files = 0, bad = 0, fixedSentences = 0;
const report = [];
const examples = [];

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/^\d+\.json$/.test(e.name)) continue;
    const [vol, chunkFile] = [path.basename(path.dirname(p)), e.name];
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', vol, chunkFile), 'utf8'));
    const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
    files++;
    let dirty = false;
    for (const [key, val] of Object.entries(tr.blocks || {})) {
      const b = chunk.blocks[Number(key)];
      if (!b || b.k !== 'p' || !Array.isArray(val.zh)) continue;
      const de = sentencesFromMarked(b.x);
      de.forEach((src, i) => {
        let zh = val.zh[i] || '';
        for (const [fam, f] of families) {
          const hit = f.members.find((m) => memberRe(m.de).test(src));
          if (!hit) continue;
          const hasRoot = zh.includes(f.root) || zh.includes(hit.zh);
          if (hasRoot) continue;
          bad++;
          if (examples.length < 8) examples.push(`${vol}/${chunkFile}#${key}.${i} [${fam}] DE:“${src.slice(0, 70)}” ZH:“${zh.slice(0, 70)}”`);
          const v = VARIANTS[fam];
          if (v && v.not && v.not.test(src)) continue;      // competing family present — leave for review
          for (const [from, to] of (v ? v.rules : [])) {
            if (zh.includes(from)) {
              zh = zh.split(from).join(to);
              report.push(`${fam}: ${from} → ${to}`);
            }
          }
          if (zh !== val.zh[i]) { val.zh[i] = zh; dirty = true; fixedSentences++; }
        }
      });
    }
    if (dirty && APPLY) fs.writeFileSync(p, JSON.stringify(tr), 'utf8');
  }
};
walk(path.join(OUTD, 'trans'));

console.log(`scanned ${files} chunk files; ${bad} sentences where a family member lacks its Chinese root`);
if (report.length) {
  const agg = new Map();
  for (const r of report) agg.set(r, (agg.get(r) || 0) + 1);
  for (const [k, n] of [...agg.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} × ${k}`);
}
if (examples.length) { console.log('examples:'); for (const e of examples) console.log('  • ' + e); }
console.log(APPLY ? `\nAPPLIED: ${fixedSentences} sentences rewritten.` : '\n(dry run — pass --apply to write)');
