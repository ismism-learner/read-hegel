import fs from 'node:fs';
const jobFile = process.argv[2] || 'E:/文字稿优化/读黑学/data/_jobs/rev-w3-5-02.in.json';
const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
const ctx = JSON.parse(fs.readFileSync('E:/文字稿优化/读黑学/data/_jobs/context-w3.json', 'utf8'));
const fam = fs.readFileSync('E:/文字稿优化/读黑学/glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
const head = fam.shift().split(',');
const ix = n => head.indexOf(n);
const families = fam.map(l => l.split(',')).filter(x => x[ix('sense')] === 'systematic').map(x => ({ family: x[ix('family')], root: x[ix('root_zh')], de: x[ix('member_de')], zh: x[ix('member_zh')] }));
const DE_NEG = /(?<![A-Za-zÄÖÜäöüß])(nicht|nichts|kein|keine|keinen|keinem|keiner|keines|nie|niemals|niemand|ohne|weder)(?![A-Za-zÄÖÜäöüß])/;
const ZH_NEG = /[不没无未非否莫别毋免空缺少绝]|拒绝|否认|禁止|缺乏|避免|≠/;
const NEG_IDIOM = /\b(nichts|nicht|kein[a-z]*)\b[^.;]{0,80}?\bals\b|nicht\s+weniger|nicht\s+umhin|es\s+sei\s+denn/i;
const NEG_IDIOM_ZH = /只|仅|无非|不外|不过|除了|只得|只能|只好|同样|不亚/;
function dupFragment(s) {
  const t = s.replace(/[，。；：、！？（）「」“”…—\s]/g, '');
  for (let len = 24; len >= 6; len--) for (let i = 0; i + 2 * len <= t.length; i++) if (t.slice(i, i + len) === t.slice(i + len, i + 2 * len)) return t.slice(i, i + len);
  return null;
}
const entries = ctx.entries.filter(e => e.source && e.zh && /^[A-ZÄÖÜ]/.test(e.source) && e.zh.length <= 8 && !/[\/、（）()]/.test(e.zh));
for (const it of job.items) {
  const src = it.de, zh = it.zh, en = it.en, k = it.bi + '.' + it.si;
  if (DE_NEG.test(src) && !ZH_NEG.test(zh) && !(NEG_IDIOM.test(src) && NEG_IDIOM_ZH.test(zh))) console.log('NEG-DROPPED', k, '::', src.slice(0, 90));
  const dup = dupFragment(zh); if (dup) console.log('DUP-FRAG', k, dup);
  for (const e of entries) {
    const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${e.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
    if (re.test(src) && zh.length > 6 && !zh.includes(e.zh)) console.log('GLOSS-MISS', k, e.source, '->', e.zh);
  }
  for (const f of ctx.forbidden) {
    const srcRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${f.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);
    if (srcRe.test(src) && zh.includes(f.forbidden) && !zh.includes(f.prefer)) console.log('FORBIDDEN', k, f.source, f.forbidden, '->', f.prefer);
  }
  for (const fm of families) {
    const esc = fm.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`).test(src)) continue;
    if (zh.includes(fm.root) || zh.includes(fm.zh)) continue;
    console.log('FAMILY-MISS', k, fm.de, fm.family, '->', fm.root);
  }
}
console.log('done');
