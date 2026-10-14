// Surgical word-family repair for data/_jobs/family-03.in.json -> family-03.out.json
// Every substitution is asserted (exact occurrence count) so the sentences cannot drift.
import fs from 'node:fs';

const JOBD = 'data/_jobs';
const inData = JSON.parse(fs.readFileSync(`${JOBD}/family-03.in.json`, 'utf8'));

// systematic family rows (same filter as make-family-jobs.mjs / qa-trans.mjs)
const raw = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const head = lines.shift().split(',');
const ix = (n) => head.indexOf(n);
const FAM = [];
for (const l of lines) {
  const c = l.split(',');
  if ((c[ix('sense')] || '') !== 'systematic') continue;
  FAM.push({ family: c[ix('family')], root: c[ix('root_zh')], de: c[ix('member_de')], zh: c[ix('member_zh')] });
}
const memberRe = (de) => new RegExp(`(?<![A-Za-zÄÖÜäöüß])${de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`);

// index -> [[from, to, expectedCount], ...]
const PATCH = {
  0: [['而是被人把握住', '而是被人以概念把握住', 1]],
  1: [['迁就自己的想法', '迁就自己的观念', 1]],
  2: [['没法理解它们', '没法以概念把握它们', 1]],
  3: [['或者真实、或者空想', '或者现实的、或者空想', 1]],
  4: [['时代的思想', '时代的观念', 1]],
  5: [['恶鬼的影响之下', '恶的精神的影响之下', 1]],
  6: [['靠指出某些叙述的荒谬', '靠表象出某些叙述的荒谬', 1]],
  7: [['去理解', '去以概念把握', 1], ['乏味的想法', '乏味的表象', 1]],
  8: [['去理解', '去以概念把握', 1], ['乏味的想法', '乏味的表象', 1]],
  9: [['执行和现实性', '执行和实在性', 1], ['成为真正的执行', '成为现实的执行', 1]],
  10: [['真实生活', '现实生活', 1]],
  11: [['而是真的触到了', '而是现实地触到了', 1]],
  12: [['颠倒观念', '颠倒概念', 1]],
  13: [['而说真的', '而现实地说', 1]],
  14: [
    ['时代的想法', '时代的观念', 1],
    ['这种看法', '这种表象', 2],
    ['许多观念', '许多表象', 1],
    ['不死的观念', '不死的表象', 1],
    ['给这些观念', '给这些表象', 1],
    ['这些观念作为', '这些表象作为', 1],
  ],
  15: [['教义究竟是', '教义在现实中究竟是', 1]],
  16: [['奇迹的实在性', '奇迹的现实性', 1]],
  17: [['比实际更远', '比现实更远', 1]],
  18: [['则真的变得', '则现实地变得', 1]],
  19: [['在想象中', '在表象中', 1]],
  20: [['真的去翻翻历史', '现实地去翻翻历史', 1]],
  21: [['真正虔诚的人', '现实中虔诚的人', 1]],
  22: [['也就是说，他们确实是被各教团', '也就是说，他们在现实中是被各教团', 1]],
  23: [['它也确实是照这样被对待的', '它在现实中也是照这样被对待的', 1]],
  24: [
    ['人真正有的感受', '人现实中有的感受', 1],
    ['比实际总是感到的更多', '比现实中总是感到的更多', 1],
    ['人真正感觉到的东西', '人现实中感觉到的东西', 1],
  ],
  25: [['道德确实是人类', '道德在现实中是人类', 1]],
  26: [['是现实还是非现实', '是实在还是非实在', 1]],
  27: [['被说成是整个开明的民族阶层的义务', '被表象为整个开明的民族阶层的义务', 1]],
  28: [['人们总的说来确实很懂得', '人们总的说来在现实中很懂得', 1]],
  29: [['无法理解', '无法以概念把握', 1]],
};

const count = (s, sub) => s.split(sub).length - 1;
const items = [];
let changed = 0, problems = 0;

inData.items.forEach((it, i) => {
  let zh = it.zh;
  const patches = PATCH[i] || [];
  for (const [from, to, n] of patches) {
    const c = count(zh, from);
    if (c !== n) { console.log(`ERR item ${i} (bi ${it.bi} si ${it.si}): pattern ${JSON.stringify(from)} occurs ${c}x, expected ${n}x`); problems++; continue; }
    zh = zh.split(from).join(to);
  }
  if (zh !== it.zh) changed++;

  // 1. the item's own required root must be present
  if (!(zh.includes(it.root) || zh.includes(FAM.find((f) => f.de === it.member)?.zh || '\u0000'))) {
    console.log(`ERR item ${i} (bi ${it.bi} si ${it.si}): missing own root ${it.root} / member ${it.member}`); problems++;
  }
  // 2. no other systematic family member left without its Chinese root in this sentence
  const leftover = [];
  const seen = new Set();
  for (const f of FAM) {
    if (!memberRe(f.de).test(it.de)) continue;
    if (zh.includes(f.root) || zh.includes(f.zh)) continue;
    const k = `${f.family}|${f.de}`;
    if (seen.has(k)) continue;
    seen.add(k);
    leftover.push(`${f.family}:${f.de}->${f.root}`);
  }
  if (leftover.length) { console.log(`WARN item ${i} (bi ${it.bi} si ${it.si}) leftover: ${leftover.join(', ')}`); problems++; }

  items.push({ vol: it.vol, chunk: it.chunk, bi: it.bi, si: it.si, zh });
});

const out = { id: inData.id, items };
fs.writeFileSync(`${JOBD}/family-03.out.json`, JSON.stringify(out, null, 1), 'utf8');

console.log(`items in=${inData.items.length} out=${items.length} changed=${changed} problems=${problems}`);
console.log(`unique targets=${new Set(items.map((x) => `${x.vol}/${x.chunk}#${x.bi}.${x.si}`)).size}`);
