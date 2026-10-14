import fs from 'node:fs';
const P = 'web/data/trans/w2/9.p31.json';
const raw = fs.readFileSync(P);
console.log('BOM:', raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF ? 'YES(BAD)' : 'no');
const data = JSON.parse(raw.toString('utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w2-9-31.in.json', 'utf8'));
const chunk = JSON.parse(fs.readFileSync('web/data/vol/w2/9.json', 'utf8'));

console.log('unit:', data.unit, '| stage:', data.stage);
let blocks = 0, sents = 0, bad = 0;
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w2.json', 'utf8'));
const forbidSimple = ['唯心', '理念', '理智', '反映', '直觉', '时刻', '教条主义', '悖论', '自然权利', '现实主义', '理想主义', '科学学'];
for (const b of job.blocks) {
  const t = data.blocks[String(b.bi)];
  if (!t) { console.log('MISSING block', b.bi); bad++; continue; }
  const cb = chunk.blocks[b.bi];
  if (t.h !== b.hash || t.h !== cb.hash) { console.log('HASH MISMATCH', b.bi, t.h, b.hash, cb.hash); bad++; }
  if (!Array.isArray(t.en) || !Array.isArray(t.zh) || t.en.length !== b.sents.length || t.zh.length !== b.sents.length) {
    console.log('LENGTH MISMATCH', b.bi, t.en?.length, t.zh?.length, 'vs', b.sents.length); bad++; continue;
  }
  blocks++;
  b.sents.forEach((src, i) => {
    const en = (t.en[i] || '').trim(), zh = (t.zh[i] || '').trim();
    if (!en || !zh) { console.log('EMPTY', b.bi, i); bad++; return; }
    sents++;
    const where = `${b.bi}.${i}`;
    if (/[\u4e00-\u9fff]/.test(en)) console.log('EN has CJK', where);
    if (!/[\u4e00-\u9fff]/.test(zh) && zh.length > 12) console.log('ZH no CJK', where);
    if (zh === src.trim()) console.log('ZH identical to DE', where);
    for (const f of forbidSimple) if (zh.includes(f)) console.log(`FORBIDDEN “${f}” in ${where}: ${zh.slice(0, 60)}`);
    // negation
    const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
    const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
    if (DE_NEG.test(src) && !ZH_NEG.test(zh)) console.log('NEGATION maybe dropped', where, '|', src.slice(0, 70), '=>', zh.slice(0, 50));
    // length ratios
    const deN = src.replace(/\s/g, '').length, zhN = zh.replace(/\s/g, '').length;
    if (deN > 40 && (zhN / deN < 0.22 || zhN / deN > 1.05)) console.log('RATIO zh', where, (zhN / deN).toFixed(2), zhN, deN);
    const deW = (src.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    const enW = (en.match(/[A-Za-zÄÖÜäöüß]+/g) || []).length;
    if (deN > 40 && deW > 8 && (enW / deW < 0.45 || enW / deW > 1.6)) console.log('RATIO en', where, (enW / deW).toFixed(2), enW, deW);
    // dup fragment >=8
    const t2 = zh.replace(/[，。；：、！？（）「」“”…—\s]/g, '');
    outer: for (let len = Math.min(14, Math.floor(t2.length / 2)); len >= 8; len--) {
      for (let i = 0; i + len <= t2.length; i++) {
        const frag = t2.slice(i, i + len);
        if (t2.indexOf(frag, i + 1) !== -1) { console.log('DUP fragment', where, frag); break outer; }
      }
    }
    // family roots
    const fams = [
      [/\bIdee/, '观念'], [/Idealität/, '观念性'], [/\bideell/, '观念'], [/Idealismus/, '观念'],
      [/idealistisch/, '观念论的'], [/Idealisier/, '观念化'],
      [/Realität/, '实在性'], [/\breal\b/, '实在'], [/Realismus/, '实在论'], [/das Reelle/, '实在物'],
      [/\bBegriff/, '概念'], [/begreif/, '概念'], [/\bVorstellung/, '表象'], [/vorgestellt/, '表象'],
      [/\bGeist/, '精神'], [/geistig/, '精神'], [/\bWissen/, '知'], [/Wahrheit/, '真理'], [/\bwahr\b/, '真的'],
      [/wahrhaft/, '真正的'], [/Wirklichkeit/, '现实性'], [/wirklich/, '现实'],
    ];
    for (const [re, root] of fams) if (re.test(src) && !zh.includes(root)) console.log(`FAMILY ${re} wants ${root} @${where}: ${zh.slice(0, 50)}`);
  });
}
console.log('blocks:', blocks, 'sentences:', sents, 'problems:', bad);
