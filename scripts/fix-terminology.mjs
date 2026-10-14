// Scan (and optionally fix) ideologically loaded renderings in the translated corpus.
//   node scripts/fix-terminology.mjs            # report only
//   node scripts/fix-terminology.mjs --apply    # apply the replacements in place
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const OUTD = 'web/data';

// order matters: longest first
const RULES = [
  ['唯心主义者', '观念论者'],
  ['唯心主义的', '观念论的'],
  ['唯心主义', '观念论'],
  ['唯心论者', '观念论者'],
  ['唯心论的', '观念论的'],
  ['唯心论', '观念论'],
  ['唯心辩证法', '观念辩证法'],
  ['唯心史观', '观念史观'],
  ['唯心', '观念'],
];

const hits = new Map();
let files = 0, changedFiles = 0, changedSentences = 0;

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.json') || e.name === 'index.json') continue;
    files++;
    const raw = fs.readFileSync(p, 'utf8');
    if (!raw.includes('唯心')) continue;
    const data = JSON.parse(raw);
    let dirty = false;
    for (const [key, val] of Object.entries(data.blocks || {})) {
      for (const lang of ['zh']) {
        if (typeof val[lang] === 'string') {
          const before = val[lang];
          let after = before;
          for (const [from, to] of RULES) after = after.split(from).join(to);
          if (after !== before) {
            val[lang] = after; dirty = true; changedSentences++;
            for (const [from] of RULES) {
              const n = before.split(from).length - 1;
              if (n) hits.set(from, (hits.get(from) || 0) + n);
            }
          }
        } else if (Array.isArray(val[lang])) {
          val[lang] = val[lang].map((s) => {
            let after = s;
            for (const [from, to] of RULES) after = after.split(from).join(to);
            if (after !== s) {
              dirty = true; changedSentences++;
              for (const [from] of RULES) {
                const n = s.split(from).length - 1;
                if (n) hits.set(from, (hits.get(from) || 0) + n);
              }
            }
            return after;
          });
        }
      }
    }
    if (dirty) { changedFiles++; if (APPLY) fs.writeFileSync(p, JSON.stringify(data), 'utf8'); }
  }
};

walk(path.join(OUTD, 'trans'));

console.log(`scanned ${files} translation files; ${changedFiles} contain loaded renderings (${changedSentences} sentences)`);
for (const [k, n] of [...hits.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} × ${k}`);
console.log(APPLY ? '\nAPPLIED the replacements.' : '\n(dry run — pass --apply to write)');
