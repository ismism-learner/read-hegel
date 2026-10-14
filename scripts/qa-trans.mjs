// Deterministic translation QA (no model calls). Implements the cheap half of an MQM check:
// alignment, placeholders, language sanity, length outliers, untranslated echoes,
// glossary conformance and repeated-rendering detection.
//   node scripts/qa-trans.mjs [--vol w1] [--calibrate] [--verbose]
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const VOL = opt('vol', '');
const CALIBRATE = args.includes('--calibrate');
const VERBOSE = args.includes('--verbose');

const OUTD = 'web/data';

/* ---- glossary -> conformance rules, per volume when a context package exists ---- */
const TECHNICAL_VOLS = new Set(['w5', 'w7', 'w10', 'w11', 'w13', 'w16', 'w18']);
const BUILTIN_FORBIDDEN = [
  ['Sittlichkeit', '道德', '伦理'], ['Moralität', '伦理', '道德'],
  ['Dasein', '存在', '定在'], ['Existenz', '定在', '存在'],
  ['Moment', '时刻', '环节'], ['Schein', '现象', '假象'], ['Erscheinung', '假象', '现象'],
  ['Begriff', '观念', '概念'], ['Vorstellung', '概念', '表象'],
  ['Verstand', '理性', '知性'], ['Vernunft', '知性', '理性'],
];

function buildGlobalRules() {
  const raw = fs.readFileSync('glossary/hegel_glossar.csv', 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',');
  const ix = (n) => head.indexOf(n);
  const out = [];
  for (const l of lines) {
    const r = l.split(',');
    const de = (r[ix('de')] || '').trim();
    const zh = (r[ix('zh')] || '').trim();
    const status = (r[ix('status')] || '').trim().toLowerCase();
    if (!de || !zh || status !== 'ok') continue;      // only "ok" entries are mandatory
    if (/[\/、（）()]/.test(zh) || zh.length > 8) continue;
    if (!/^[A-ZÄÖÜ]/.test(de)) continue;              // nouns only: "werden" ≠ "Werden"
    out.push({ de, zh });
  }
  return out;
}

const GLOBAL_RULES = buildGlobalRules();
const ctxCache = new Map();

/* ---- word families: a German root must keep one Chinese root (glossary/hegel_families.csv) ---- */
const FAMILIES = (() => {
  const f = 'glossary/hegel_families.csv';
  if (!fs.existsSync(f)) return [];
  const lines = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',');
  const ix = (n) => head.indexOf(n);
  const out = [];
  for (const l of lines) {
    const c = l.split(',');
    if ((c[ix('sense')] || '') !== 'systematic') continue;
    out.push({ family: c[ix('family')], root: c[ix('root_zh')], de: c[ix('member_de')], zh: c[ix('member_zh')] });
  }
  return out;
})();

/** Rules for one volume: the volume's own context package wins over the shared glossary. */
function rulesFor(vol) {
  if (ctxCache.has(vol)) return ctxCache.get(vol);
  const f = `data/_jobs/context-${vol}.json`;
  let out;
  if (fs.existsSync(f)) {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const rules = (c.entries || [])
      .filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh))
      .map((e) => ({ de: e.source, zh: e.zh }));
    const forbidden = (c.forbidden || []).filter((x) => x.source && x.forbidden && x.prefer)
      .map((x) => [x.source, x.forbidden, x.prefer]);
    out = { rules, forbidden, source: 'context' };
  } else {
    out = {
      rules: GLOBAL_RULES,
      // the built-in technical vocabulary applies to the systematic works, not to the early writings
      forbidden: TECHNICAL_VOLS.has(vol) ? BUILTIN_FORBIDDEN : [],
      source: 'glossary',
    };
  }
  ctxCache.set(vol, out);
  return out;
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const LATIN = /[A-Za-z]{3,}/;
const PLACEHOLDER = /^(…|\.\.\.|TODO|TBD|待译|待补|n\/a)$/i;
const isProse = (s) => (s.match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).length >= 2;

/* negation: German marker present but Chinese shows none => likely dropped negation.
   Exceptions: idioms whose Chinese equivalent carries no negation word ("nicht anders als" = 只能),
   and the mathematical symbol ≠ used for "nicht =". */
const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
const NEG_IDIOM = /\b(nichts|nicht|kein[a-z]*)\b[^.;]{0,80}?\bals\b|nicht\s+weniger|nicht\s+umhin|es\s+sei\s+denn/i;
const NEG_IDIOM_ZH = /只|仅|无非|不外|不过|除了|只得|只能|只好|同样|不亚/;

/** Back-to-back duplication of a Chinese fragment (>=6 chars) — the fingerprint of a clause
 *  translated twice. Distant repetition (Hegel's own anaphora, parallel clauses) is not flagged. */
function dupFragment(s) {
  const t = s.replace(/[，。；：、！？（）「」“”…—\s]/g, '');
  for (let len = 24; len >= 6; len--) {
    for (let i = 0; i + 2 * len <= t.length; i++) {
      if (t.slice(i, i + len) === t.slice(i + len, i + 2 * len)) return t.slice(i, i + len);
    }
  }
  return null;
}

const stats = { blocks: 0, sentences: 0, issues: [] };
const ratiosZh = [], ratiosEn = [];
const zhSeen = new Map();
const ruleHits = new Map();

const add = (sev, where, msg) => stats.issues.push({ sev, where, msg });
const countWords = (s) => (s.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;

for (const v of JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8')).volumes) {
  if (VOL && v.id !== VOL) continue;
  for (const meta of v.chunks) {
    const tf = path.join(OUTD, 'trans', v.id, `${meta.i}.json`);
    if (!fs.existsSync(tf)) continue;
    const tr = JSON.parse(fs.readFileSync(tf, 'utf8'));
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', v.id, `${meta.i}.json`), 'utf8'));
    const VOLRULES = rulesFor(v.id);
    const ruleList = VOLRULES.rules.map((r) => [r.de, r.zh]);
    const forbidden = VOLRULES.forbidden;
    for (const [key, val] of Object.entries(tr.blocks || {})) {
      const bi = Number(key);
      const b = chunk.blocks[bi];
      const where = `${v.id}/${meta.i}#${bi}`;
      if (!b) { add('critical', where, 'translation for a non-existent block'); continue; }
      if (val.h !== b.hash) { add('critical', where, 'hash drift (stale translation)'); continue; }
      stats.blocks++;
      if (b.k === 'h') {
        const deLetters = /[A-Za-zÄÖÜäöüß]{3,}/.test(b.x.replace(/<[^>]+>/g, ''));
        if (!val.zh || !val.en) add('major', where, 'heading missing en/zh');
        else if (deLetters && (CJK.test(val.en) || !CJK.test(val.zh))) add('major', where, 'heading language mismatch');
        continue;
      }
      const de = sentencesFromMarked(b.x);
      if (val.en.length !== de.length || val.zh.length !== de.length) {
        add('critical', where, `array length ${val.en.length}/${val.zh.length} vs ${de.length} German sentences`);
        continue;
      }
      de.forEach((src, i) => {
        const en = (val.en[i] || '').trim();
        const zh = (val.zh[i] || '').trim();
        stats.sentences++;
        if (!en || !zh) { add('critical', where, `sentence ${i} empty`); return; }
        if (PLACEHOLDER.test(zh) || PLACEHOLDER.test(en)) add('critical', where, `sentence ${i} placeholder`);
        if (CJK.test(en)) add('major', where, `sentence ${i}: English contains CJK`);
        if (!CJK.test(zh) && zh.length > 12) add('major', where, `sentence ${i}: Chinese without CJK`);
        // untranslated echo — only for real prose, not "II." / "(1800)" / "Mos."
        if (zh === src.trim() && isProse(src)) add('major', where, `sentence ${i}: Chinese identical to German`);

        // length outliers
        const deN = src.replace(/\s/g, '').length;
        const zhN = zh.replace(/\s/g, '').length;
        const enW = countWords(en), deW = countWords(src);
        if (deN > 40) {
          const rz = zhN / deN;
          ratiosZh.push(rz);
          if (rz < 0.22 || rz > 1.05) add('major', where, `sentence ${i}: zh/de length ratio ${rz.toFixed(2)} (${zhN}/${deN})`);
          if (deW > 8) {
            const re = enW / deW;
            ratiosEn.push(re);
            if (re < 0.45 || re > 1.6) add('major', where, `sentence ${i}: en/de word ratio ${re.toFixed(2)} (${enW}/${deW})`);
          }
        }

        // dropped negation — the single worst meaning-inverting defect reported by readers
        if (DE_NEG.test(src) && !ZH_NEG.test(zh) && !(NEG_IDIOM.test(src) && NEG_IDIOM_ZH.test(zh))) {
          add('major', where, `sentence ${i}: German negation with no Chinese negation (“${src.slice(0, 60)}…” → “${zh.slice(0, 40)}…”)`);
        }

        // duplicated Chinese fragment (typically a relative clause translated twice)
        const dup = dupFragment(zh);
        if (dup) add('minor', where, `sentence ${i}: repeated Chinese fragment “${dup}”`);

        // glossary conformance (nouns are matched case-sensitively: "Werden" ≠ "werden")
        for (const [term, want] of ruleList) {
          if (!term || term.length < 4) continue;
          const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const cs = /^[A-ZÄÖÜ]/.test(term);
          const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`, cs ? '' : 'i');
          if (re.test(src) && zh.length > 6) {
            const hit = zh.includes(want);
            ruleHits.set(term, { want, n: (ruleHits.get(term)?.n || 0) + 1, ok: (ruleHits.get(term)?.ok || 0) + (hit ? 1 : 0) });
            if (!hit) {
              add('minor', where, `sentence ${i}: "${term}" is not rendered as “${want}”`);
              if (VERBOSE) console.log(`   src: ${src.slice(0, 90)}\n   zh : ${zh.slice(0, 90)}`);
            }
          }
        }
        for (const [term, bad, good] of forbidden) {
          if (new RegExp(`\\b${term}\\b`).test(src) && zh.includes(bad) && !zh.includes(good)) {
            add('major', where, `sentence ${i}: "${term}" rendered with forbidden “${bad}” (expected “${good}”)`);
          }
        }

        // word-family transparency: same German root must keep the same Chinese root
        for (const fam of FAMILIES) {
          const esc = fam.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`).test(src)) continue;
          if (zh.includes(fam.root) || zh.includes(fam.zh)) continue;
          add('major', where, `sentence ${i}: “${fam.de}” (family ${fam.family}) does not keep the family root “${fam.root}”`);
        }

        // repeated rendering across different German sentences (same work)
        const key = `${v.id}|${zh}`;
        if (zh.length > 24) {
          const prev = zhSeen.get(key);
          if (prev && prev !== src.slice(0, 40)) add('minor', where, `sentence ${i}: identical Chinese for a different German sentence`);
          else zhSeen.set(key, src.slice(0, 40));
        }
      });
    }
  }
}

const pct = (arr, p) => { if (!arr.length) return '-'; const a = [...arr].sort((x, y) => x - y); return a[Math.floor(a.length * p)].toFixed(2); };
if (CALIBRATE) {
  console.log(`zh/de char ratio  p5=${pct(ratiosZh, 0.05)} p50=${pct(ratiosZh, 0.5)} p95=${pct(ratiosZh, 0.95)} n=${ratiosZh.length}`);
  console.log(`en/de word ratio  p5=${pct(ratiosEn, 0.05)} p50=${pct(ratiosEn, 0.5)} p95=${pct(ratiosEn, 0.95)} n=${ratiosEn.length}`);
}

const bySev = { critical: 0, major: 0, minor: 0 };
for (const i of stats.issues) bySev[i.sev]++;
const kinds = new Map();
for (const i of stats.issues) {
  const k = i.msg.replace(/\d+(\.\d+)?/g, 'N').replace(/\(.*?\)/g, '').replace(/"[^"]*"/g, '"X"').slice(0, 60);
  kinds.set(k, (kinds.get(k) || 0) + 1);
}

console.log(`blocks=${stats.blocks} sentences=${stats.sentences} issues=${stats.issues.length}  critical=${bySev.critical} major=${bySev.major} minor=${bySev.minor}`);
console.log('top issue kinds:');
[...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log(`  ${String(n).padStart(5)}  ${k}`));

// a term that is almost never honoured is more likely a bad glossary entry than 700 bad translations
const suspect = [...ruleHits.entries()]
  .filter(([, v]) => v.n >= 5 && v.ok / v.n < 0.35)
  .sort((a, b) => b[1].n - a[1].n);
if (suspect.length) {
  console.log('\nsuspect glossary entries (low conformance — review the entry, not the translation):');
  for (const [term, v] of suspect.slice(0, 12)) console.log(`  ${term} → “${v.want}”   honoured ${v.ok}/${v.n}`);
}
if (VERBOSE) for (const i of stats.issues.filter((x) => x.sev === 'critical').slice(0, 10)) console.log(`  CRIT ${i.where}: ${i.msg}`);

fs.mkdirSync('data/_qa', { recursive: true });
fs.writeFileSync('data/_qa/report.json', JSON.stringify({ generated: new Date().toISOString(), ...stats, bySev }, null, 1), 'utf8');
console.log('report: data/_qa/report.json');
process.exit(bySev.critical ? 1 : 0);
