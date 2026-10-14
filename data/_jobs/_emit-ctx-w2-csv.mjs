// Validate data/_jobs/context-w2.json and emit the matching CSV (de,en,zh,status,note).
import fs from 'node:fs';

const SRC = 'data/_jobs/context-w2.json';
const OUT = 'data/_jobs/ctx-w2.glossar.csv';

const pkg = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// --- status: ok only where the rendering is standard and uncontested -----------
const OK = new Set([
  'Reflexion', 'Spekulation', 'spekulativ', 'Verstand', 'Vernunft', 'Identität',
  'Differenz', 'Entgegensetzung', 'Widerspruch', 'Antinomie', 'Synthese', 'Aufhebung',
  'Moment', 'absolutes Wissen', 'Wissenschaft', 'Begriff', 'Idee', 'Vorstellung',
  'Anschauung', 'transzendentale Anschauung', 'transzendental', 'transzendent',
  'Nicht-Ich', 'das Absolute', 'Dogmatismus', 'Skeptizismus', 'Formalismus',
  'Totalität', 'Mannigfaltigkeit', 'Unendlichkeit', 'Endlichkeit', 'Unmittelbarkeit',
  'Vermittlung', 'Bewußtsein', 'Naturphilosophie', 'Prinzip', 'Satz', 'Kategorie',
  'Deduktion', 'Bestimmtheit', 'Gewißheit', 'Notwendigkeit', 'Kritik', 'Naturrecht',
  'Sittlichkeit', 'Moralität', 'Gesetz', 'Verbrechen', 'Strafe', 'Eigentum',
  'Naturzustand', 'Staat', 'absolute Sittlichkeit',
  'Schelling', 'Fichte', 'Kant', 'Reinhold', 'Jacobi', 'Spinoza', 'Schulze',
  'Krug', 'Platon', 'Aristoteles', 'Leibniz', 'Locke', 'Hume',
  'Jena', 'Erlangen', 'Tübingen', 'Göttingen', 'Berlin', 'Deutschland',
  'Glauben und Wissen', 'Kritisches Journal der Philosophie', 'Erlanger Literatur-Zeitung',
  'Jenaische Allgemeine Literatur-Zeitung', 'Wissenschaftslehre',
  'Grundlage der gesamten Wissenschaftslehre', 'System des transzendentalen Idealismus',
  'Kritik der reinen Vernunft', 'Kritik der praktischen Vernunft', 'Kritik der Urteilskraft',
  'Ethik', 'Aenesidemus', 'Wer denkt abstrakt?', 'Habilitationsthesen',
]);
const UNSICHER = new Set([
  'Verstandesidentität', 'Apriorität', 'Grundsatz', 'Konstruktion', 'Rechtswissenschaft', 'Dasein',
  'positives Recht', 'Potenz', 'ideell', 'reell', 'Idealität', 'Realität', 'Person',
  'Jenaer Realphilosophie', 'System der Sittlichkeit', 'Bouterwek', 'Bardili',
  'Eschenmayer', 'Paulus', 'Rosenkranz', 'Sextus Empiricus', 'Würzburg', 'Differenz des Fichteschen und Schellingschen Systems der Philosophie',
  'Über die wissenschaftlichen Behandlungsarten des Naturrechts',
  'Verhältnis des Skeptizismus zur Philosophie', 'Maximen des Journals der deutschen Literatur',
  'Aphorismen aus Hegels Wastebook', 'Fragment vom göttlichen Dreieck',
]);

const statusOf = (s) => (OK.has(s) ? 'ok' : UNSICHER.has(s) ? 'unsicher' : 'variante');

// --- validation ---------------------------------------------------------------
const problems = [];
const TYPES = new Set(['term', 'person', 'place', 'work']);
const seen = new Set();
for (const e of pkg.entries) {
  for (const k of ['source', 'en', 'zh', 'type', 'note']) {
    if (typeof e[k] !== 'string' || !e[k].trim()) problems.push(`entry ${e.source}: missing ${k}`);
  }
  if (!TYPES.has(e.type)) problems.push(`entry ${e.source}: bad type ${e.type}`);
  if (seen.has(e.source)) problems.push(`duplicate entry: ${e.source}`);
  seen.add(e.source);
}
for (const f of pkg.forbidden) {
  for (const k of ['source', 'forbidden', 'prefer', 'why']) {
    if (typeof f[k] !== 'string' || !f[k].trim()) problems.push(`forbidden ${f.source}: missing ${k}`);
  }
  if (f.forbidden === f.prefer) problems.push(`forbidden ${f.source}: forbidden == prefer`);
  if (!seen.has(f.source)) problems.push(`forbidden ${f.source}: no matching entry`);
}
if (!Array.isArray(pkg.styleGuide) || pkg.styleGuide.length < 5 || pkg.styleGuide.length > 8)
  problems.push(`styleGuide length ${pkg.styleGuide?.length}`);
if (pkg.entries.length < 60 || pkg.entries.length > 140)
  problems.push(`entries length ${pkg.entries.length}`);

// --- CSV ----------------------------------------------------------------------
const cell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rows = [['de', 'en', 'zh', 'status', 'note']];
for (const e of pkg.entries) rows.push([e.source, e.en, e.zh, statusOf(e.source), e.note]);
fs.writeFileSync(OUT, rows.map((r) => r.map(cell).join(',')).join('\n') + '\n', 'utf8');

const byType = {};
for (const e of pkg.entries) byType[e.type] = (byType[e.type] || 0) + 1;
const byStatus = {};
for (const e of pkg.entries) byStatus[statusOf(e.source)] = (byStatus[statusOf(e.source)] || 0) + 1;

console.log('volume           ', pkg.volume);
console.log('styleGuide rules ', pkg.styleGuide.length);
console.log('entries          ', pkg.entries.length, JSON.stringify(byType));
console.log('status           ', JSON.stringify(byStatus));
console.log('forbidden        ', pkg.forbidden.length);
console.log('doNotTranslate   ', pkg.doNotTranslate.length);
console.log('csv bytes        ', fs.statSync(OUT).size, '->', OUT);
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'validation: OK');
