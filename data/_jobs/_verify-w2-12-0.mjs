import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const job = JSON.parse(fs.readFileSync('data/_jobs/w2-12-0.in.json', 'utf8'));
const out = JSON.parse(fs.readFileSync(job.outFile, 'utf8'));
const chunk = JSON.parse(fs.readFileSync('web/data/vol/w2/12.json', 'utf8'));
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w2.json', 'utf8'));

let problems = 0;
const bad = (m) => { problems++; console.log('PROBLEM: ' + m); };

if (out.unit !== 'w2-12-0') bad('unit field: ' + out.unit);
if (out.stage !== 'draft') bad('stage field: ' + out.stage);

const raw = fs.readFileSync(job.outFile);
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) bad('BOM present');

let blocks = 0, sents = 0;
for (const b of job.blocks) {
  const key = String(b.bi);
  const val = out.blocks[key];
  if (!val) { bad(`missing block ${key}`); continue; }
  blocks++;
  const src = chunk.blocks[b.bi];
  if (val.h !== src.hash) bad(`${key}: hash mismatch ${val.h} vs ${src.hash}`);
  if (val.h !== b.hash) bad(`${key}: hash mismatch vs job ${val.h} vs ${b.hash}`);
  if (!val.h || !/^[a-z0-9]+$/.test(val.h)) bad(`${key}: suspicious hash`);
  if (b.k === 'h') {
    if (typeof val.en !== 'string' || typeof val.zh !== 'string') bad(`${key}: heading not string`);
    continue;
  }
  const de = sentencesFromMarked(src.x);
  if (val.en.length !== de.length) bad(`${key}: en length ${val.en.length} vs de ${de.length}`);
  if (val.zh.length !== de.length) bad(`${key}: zh length ${val.zh.length} vs de ${de.length}`);
  de.forEach((s, i) => {
    sents++;
    const en = (val.en[i] || '').trim(), zh = (val.zh[i] || '').trim();
    if (!en || !zh) bad(`${key}/${i}: empty`);
    if (/[\u4e00-\u9fff]/.test(en)) bad(`${key}/${i}: CJK in English`);
    if (!/[\u4e00-\u9fff]/.test(zh)) bad(`${key}/${i}: no CJK in Chinese`);
    if (zh === s.trim()) bad(`${key}/${i}: untranslated`);
    const deN = s.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    if (deN > 40) {
      const rz = zhN / deN;
      if (rz < 0.22 || rz > 1.05) bad(`${key}/${i}: zh/de ratio ${rz.toFixed(2)} (${zhN}/${deN})`);
    }
    const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
    const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
    if (DE_NEG.test(s) && !ZH_NEG.test(zh)) bad(`${key}/${i}: dropped negation? "${s.slice(0, 50)}" -> "${zh.slice(0, 40)}"`);
    for (const f of ctx.forbidden || []) {
      if (!f.source || !f.forbidden || !f.prefer) continue;
      if (f.forbidden === f.prefer) continue;
      if (new RegExp(`\\b${f.source}\\b`).test(s) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) {
        bad(`${key}/${i}: forbidden ${f.source} -> ${f.forbidden}`);
      }
    }
    const fams = [
      ['Idee', '观念'], ['ideell', '观念'], ['Idealität', '观念'], ['Idealismus', '观念'],
      ['idealistisch', '观念'], ['Realität', '实在'], ['real', '实在'], ['das Reelle', '实在'],
      ['Realismus', '实在'], ['Begriff', '概念'], ['begreifen', '概念'], ['Vorstellung', '表象'],
      ['vorgestellt', '表象'], ['Geist', '精神'], ['geistig', '精神'], ['Wissen', '知'],
      ['Wahrheit', '真'], ['wahr', '真'], ['wahrhaft', '真'], ['Wirklichkeit', '现实'],
      ['wirklich', '现实'],
    ];
    for (const [de2, root] of fams) {
      const esc = de2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cs = /^[A-ZÄÖÜ]/.test(de2);
      if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`, cs ? '' : 'i').test(s)) continue;
      if (!zh.includes(root)) bad(`${key}/${i}: "${de2}" does not keep root "${root}" :: ${zh.slice(0, 60)}`);
    }
    const t = zh.replace(/[，。；：、！？（）「」“”…—\s]/g, '');
    for (let len = Math.min(14, Math.floor(t.length / 2)); len >= 8; len--) {
      let hit = null;
      for (let j = 0; j + len <= t.length; j++) {
        const frag = t.slice(j, j + len);
        if (t.indexOf(frag, j + 1) !== -1) { hit = frag; break; }
      }
      if (hit) { bad(`${key}/${i}: repeated zh fragment "${hit}"`); break; }
    }
  });
}
const extra = Object.keys(out.blocks).filter((k) => !job.blocks.some((b) => String(b.bi) === k));
if (extra.length) bad('extra blocks: ' + extra.join(','));
console.log(`blocks=${blocks}/${job.blocks.length} sentences=${sents} problems=${problems}`);
