// Repair specific glossary rows (wrong or over-eager renderings found by qa-trans.mjs).
//   node scripts/fix-glossary.mjs
import fs from 'node:fs';

const FILE = 'glossary/hegel_glossar.csv';
const FIX = {
  // de -> { zh?, en?, status?, note? }
  Menschheit: { zh: '人类', note: '原条目作“人类整体”，过窄；人类' },
  Gesinnung: { zh: '意向', note: '原条目作“信念”；Gesinnung 指心态/意向，Gesinnung 与 Glaube 不同' },
  Anstalt: { zh: '机构', note: '原条目作“安排”；Anstalt 指机构、设施' },
  Strafen: { status: 'unsicher', note: '德语动词 strafen 与名词 Strafe 同形，作为强制规则不可靠' },
  Verdammnis: { status: 'unsicher', note: '宗教语境词，译法随语境变（永罚/定罪），不宜强制' },
  Ausführung: { status: 'variante', note: '实行/展开/实施并存，按语境选，不强制' },
  Zweck: { status: 'ok' },
};

const raw = fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/);
const head = lines.shift();
const cols = head.split(',');
const di = cols.indexOf('de'), ei = cols.indexOf('en'), zi = cols.indexOf('zh'), si = cols.indexOf('status'), ni = cols.indexOf('note');
let changed = 0;
const out = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const c = line.split(',');
  const key = (c[di] || '').trim();
  const fix = FIX[key];
  if (fix) {
    if (fix.zh) c[zi] = fix.zh;
    if (fix.en) c[ei] = fix.en;
    if (fix.status) c[si] = fix.status;
    if (fix.note) c[ni] = fix.note;
    changed++;
  }
  out.push(c.join(','));
}
fs.writeFileSync(FILE, '\uFEFF' + head + '\n' + out.join('\n') + '\n', 'utf8');
console.log(`glossary rows rewritten: ${changed} of ${out.length}`);
