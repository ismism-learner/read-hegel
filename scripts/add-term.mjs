// Add or update a termbase entry in a volume context package and in the shared glossary.
//   node scripts/add-term.mjs --vol w3 --de Tun --en doing --zh 行动 --note "…"
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const VOL = opt('vol', 'w3');
const DE = opt('de'), EN = opt('en', ''), ZH = opt('zh'), NOTE = opt('note', '');
if (!DE || !ZH) { console.error('usage: --vol w3 --de Tun --zh 行动 [--en doing] [--note "…"]'); process.exit(2); }

const ctxPath = `data/_jobs/context-${VOL}.json`;
const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
ctx.entries = ctx.entries || [];
const hit = ctx.entries.find((e) => e.source === DE);
if (hit) { hit.zh = ZH; if (EN) hit.en = EN; hit.note = NOTE || hit.note; console.log(`context: updated ${DE} → ${ZH}`); }
else { ctx.entries.push({ source: DE, en: EN, zh: ZH, type: 'term', note: NOTE }); console.log(`context: added ${DE} → ${ZH}`); }
fs.writeFileSync(ctxPath, JSON.stringify(ctx, null, 1), 'utf8');

const G = 'glossary/hegel_glossar.csv';
const raw = fs.readFileSync(G, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const head = lines.shift();
const cols = head.split(',');
const di = cols.indexOf('de'), zi = cols.indexOf('zh'), ei = cols.indexOf('en'), si = cols.indexOf('status'), ni = cols.indexOf('note');
const rows = lines.map((l) => l.split(','));
const idx = rows.findIndex((r) => (r[di] || '').trim() === DE);
const row = [DE, EN, ZH, 'ok', NOTE];
if (idx >= 0) { rows[idx] = row; console.log('glossary: updated row'); }
else { rows.push(row); console.log('glossary: appended row'); }
fs.writeFileSync(G, '\uFEFF' + head + '\n' + rows.map((r) => r.join(',')).join('\n') + '\n', 'utf8');
