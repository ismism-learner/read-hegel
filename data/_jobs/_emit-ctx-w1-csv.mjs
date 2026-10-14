// temp: derive data/_jobs/ctx-w1.glossar.csv from data/_jobs/context-w1.json
// (JSON is the single source of truth for the w1 context package)
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('data/_jobs/context-w1.json', 'utf8'));

const STATUS = {
  // rendering itself is doubtful, or the shared glossary flags the German word
  Dasein: 'unsicher', Schein: 'unsicher', Erscheinung: 'unsicher', Wirklichkeit: 'unsicher',
  Sittlichkeit: 'unsicher', statutarisch: 'unsicher', Kirchenrecht: 'unsicher', Willkür: 'unsicher',
  Gemeinde: 'unsicher', Aufhebung: 'unsicher', Fetischdienst: 'unsicher', Lehensverfassung: 'unsicher',
  Repräsentation: 'unsicher', 'Die Verfassung Deutschlands': 'unsicher',
  'Vertrauliche Briefe über das vormalige staatsrechtliche Verhältnis des Wadtlandes (Pays de Vaud) zur Stadt Bern': 'unsicher',
  'Das älteste Systemprogramm des deutschen Idealismus': 'unsicher',
  // legitimate alternatives exist
  'positive Religion': 'variante', Moment: 'variante', Empfindung: 'variante', Gefühl: 'variante',
  Phantasie: 'variante', Neigung: 'variante', Triebfeder: 'variante', Bestimmungsgrund: 'variante',
  Maxime: 'variante', Gesinnung: 'variante', Toleranz: 'variante', Duldung: 'variante',
  Volksgeist: 'variante', Leben: 'variante', Liebe: 'variante', Seligkeit: 'variante',
  Landstände: 'variante', Vasall: 'variante', Gesetz: 'variante', Recht: 'variante',
  Verfassung: 'variante', Rosenkranz: 'variante', Wadtland: 'variante', Sprache: 'variante',
};

const rows = [['de', 'en', 'zh', 'status', 'note']];
const bad = [];
for (const e of pkg.entries) {
  const status = STATUS[e.source] || 'ok';
  const cells = [e.source, e.en, e.zh, status, e.note || ''];
  for (const c of cells) if (c.includes(',')) bad.push(e.source + ' → ' + JSON.stringify(c));
  rows.push(cells);
}

if (bad.length) {
  console.error('ASCII commas would break the shared CSV reader:\n' + bad.join('\n'));
  process.exit(1);
}

const csv = rows.map((r) => r.join(',')).join('\n') + '\n';
fs.writeFileSync('data/_jobs/ctx-w1.glossar.csv', csv, 'utf8');

const byType = {};
for (const e of pkg.entries) byType[e.type] = (byType[e.type] || 0) + 1;
const byStatus = {};
for (const r of rows.slice(1)) byStatus[r[3]] = (byStatus[r[3]] || 0) + 1;
const dupes = pkg.entries.map((e) => e.source).filter((s, i, a) => a.indexOf(s) !== i);
const notEntry = pkg.forbidden.map((f) => f.source).filter((s) => !pkg.entries.some((e) => e.source === s));

console.log(`entries=${pkg.entries.length}  forbidden=${pkg.forbidden.length}  doNotTranslate=${pkg.doNotTranslate.length}  styleGuide=${pkg.styleGuide.length}`);
console.log('by type:', JSON.stringify(byType));
console.log('by status:', JSON.stringify(byStatus));
console.log('duplicate sources:', dupes.length ? dupes.join(' | ') : 'none');
console.log('forbidden sources without an entry:', notEntry.length ? notEntry.join(' | ') : 'none');
console.log('wrote data/_jobs/ctx-w1.glossar.csv rows=' + (rows.length - 1));
