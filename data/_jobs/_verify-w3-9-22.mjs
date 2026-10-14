import fs from "node:fs";
import { sentencesFromMarked } from "../../scripts/lib/sentences.mjs";

const job = JSON.parse(fs.readFileSync("data/_jobs/w3-9-22.in.json", "utf8"));
const tr = JSON.parse(fs.readFileSync(job.outFile, "utf8"));
const chunk = JSON.parse(fs.readFileSync("web/data/vol/w3/9.json", "utf8"));
const ctx = JSON.parse(fs.readFileSync("data/_jobs/context-w3.json", "utf8"));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
const NEG_IDIOM = /\b(nichts|nicht|kein[a-z]*)\b[^.;]{0,80}?\bals\b|nicht\s+weniger|nicht\s+umhin|es\s sei\s denn/i;
const NEG_IDIOM_ZH = /只|仅|无非|不外|不过|除了|只得|只能|只好|同样|不亚/;
const countWords = (s) => (s.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;

const families = (() => {
  const lines = fs.readFileSync("glossary/hegel_families.csv", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(",");
  const ix = (n) => head.indexOf(n);
  return lines.map((l) => l.split(",")).filter((c) => c[ix("sense")] === "systematic")
    .map((c) => ({ family: c[ix("family")], root: c[ix("root_zh")], de: c[ix("member_de")], zh: c[ix("member_zh")] }));
})();

const rules = (ctx.entries || []).filter((e) => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh)).map((e) => [e.source, e.zh]);
const forbidden = (ctx.forbidden || []).filter((x) => x.source && x.forbidden && x.prefer).map((x) => [x.source, x.forbidden, x.prefer]);

const problems = [];
let blocks = 0, sents = 0;
const raw = fs.readFileSync(job.outFile);
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) problems.push("file has BOM");
if (tr.unit !== job.id) problems.push("unit mismatch: " + tr.unit);
if (tr.stage !== "draft") problems.push("stage: " + tr.stage);
if (!ctx.styleGuide[0].startsWith("权威顺序（不可颠倒）")) problems.push("authority order missing");

for (const b of job.blocks) {
  const key = String(b.bi);
  const src = chunk.blocks[b.bi];
  const val = tr.blocks[key];
  if (!val) { problems.push(`block ${key} missing`); continue; }
  if (val.h !== src.hash) problems.push(`block ${key}: hash mismatch job=${b.hash} chunk=${src.hash} out=${val.h}`);
  if (b.k === "h") { blocks++; continue; }
  const de = sentencesFromMarked(src.x);
  blocks++;
  if (val.en.length !== de.length || val.zh.length !== de.length) {
    problems.push(`block ${key}: array length en=${val.en.length} zh=${val.zh.length} vs de=${de.length} (jobSents=${b.sents.length})`);
    continue;
  }
  if (b.sents.length !== de.length) problems.push(`block ${key}: jobSents=${b.sents.length} vs chunkSents=${de.length}`);
  de.forEach((s, i) => {
    sents++;
    if (b.sents[i] !== s) problems.push(`block ${key} s${i}: job sent text differs from chunk sentence`);
    const en = val.en[i].trim(), zh = val.zh[i].trim();
    if (!en || !zh) problems.push(`block ${key} s${i}: empty`);
    if (CJK.test(en)) problems.push(`block ${key} s${i}: English contains CJK`);
    if (!CJK.test(zh) && zh.length > 12) problems.push(`block ${key} s${i}: Chinese without CJK`);
    if (zh === s.trim()) problems.push(`block ${key} s${i}: echo`);
    const deN = s.replace(/\s/g, "").length, zhN = zh.replace(/\s/g, "").length;
    if (deN > 40) {
      const rz = zhN / deN;
      if (rz < 0.22 || rz > 1.05) problems.push(`block ${key} s${i}: zh/de ratio ${rz.toFixed(2)} (${zhN}/${deN})`);
      const deW = countWords(s), enW = countWords(en);
      if (deW > 8) { const re = enW / deW; if (re < 0.45 || re > 1.6) problems.push(`block ${key} s${i}: en/de word ratio ${re.toFixed(2)} (${enW}/${deW})`); }
    }
    const enEnds = (en.match(/[.!?]["')\]]?(\s|$)/g) || []).length;
    if (enEnds !== 1) problems.push(`block ${key} s${i}: EN sentence count ${enEnds} :: ${en.slice(0, 70)}`);
    const zhEnds = (zh.match(/[。！？]/g) || []).length;
    if (zhEnds !== 1) problems.push(`block ${key} s${i}: ZH sentence count ${zhEnds} :: ${zh.slice(0, 70)}`);
    if (DE_NEG.test(s) && !ZH_NEG.test(zh) && !(NEG_IDIOM.test(s) && NEG_IDIOM_ZH.test(zh))) problems.push(`block ${key} s${i}: dropped negation`);
    for (const [term, want] of rules) {
      if (!term || term.length < 4) continue;
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cs = /^[A-ZÄÖÜ]/.test(term);
      const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`, cs ? "" : "i");
      if (re.test(s) && zh.length > 6 && !zh.includes(want)) problems.push(`block ${key} s${i}: "${term}" not rendered as “${want}”`);
    }
    for (const [term, bad, good] of forbidden) {
      if (new RegExp(`\\b${term}\\b`).test(s) && zh.includes(bad) && !zh.includes(good)) problems.push(`block ${key} s${i}: "${term}" forbidden “${bad}”`);
    }
    for (const fam of families) {
      const esc = fam.de.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`).test(s)) continue;
      if (zh.includes(fam.root) || zh.includes(fam.zh)) continue;
      problems.push(`block ${key} s${i}: “${fam.de}” (${fam.family}) lacks family root “${fam.root}”`);
    }
  });
}
for (const k of Object.keys(tr.blocks)) if (!job.blocks.some((b) => String(b.bi) === k)) problems.push(`extra block ${k}`);
for (const bad of ["唯心主义", "唯心论", "唯心性", "唯心的", "理念"]) if (JSON.stringify(tr).includes(bad)) problems.push(`banned rendering ${bad}`);
const chars = JSON.stringify(tr).replace(/[^\u4e00-\u9fff]/g, "").length;
console.log(`blocks=${blocks} sentences=${sents} zhChars=${chars}`);
console.log(problems.length ? `PROBLEMS ${problems.length}:\n - ` + problems.join("\n - ") : "all checks OK");
