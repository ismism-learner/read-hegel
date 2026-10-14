// Push the "reader pain point" rules — derived from published-translation criticism on Douban —
// into every volume context package (idempotent: keyed by the rule's opening words).
//   node scripts/push-reader-rules.mjs
import fs from 'node:fs';

const LINES = [
  '不拆句、不动标点层级：原文用逗号、分号、冒号层层展开的长句，中文保留为一整句；不得把分号改成句号切成一串短句（读者明确指出这会让段内论证层次散掉，反而更难读）。',
  '不增不删：不漏否定词、不漏被动、不漏半句；不把一句拆成两句；不加解释性增补，不夹带译者自己的见解（"自作聪明的注释"是被点名批评的做法）。',
  '一句只译一次：定语从句、插入语都只出现一次，不得重复翻译同一从句。',
  '反身代词与格：德语第三格 sich 多数是"对自己／为自己"，不是"自己"；es ist / es gibt 常等于"有"，不要一律译成"它是"。',
  '主宾与格关系逐句核对：德语长句里分句的主语常发生切换，必须显式处理；读者抱怨过"前后两个分句的主语完全调换"的译本。',
  '不造生词：术语一律用通行中文译名（扬弃、自在自为、定在、环节、表象、概念）；确需新造须加译注说明理由——"造生词"是读者点名的翻译大忌。',
  '术语一一对应：一个德文术语只用一个中文译名，一个中文译名也只用于一个德文术语；不得用两三个中文词去译同一个概念。',
  '代词指代要落实：不要让读者做"二次解读"；指代不清时重复名词。',
  '人名、地名、书名用通行译名并全书统一；不得擅自把旧译名改成现代通俗名（如"丘必特"误改为"丘比特"）。',
];

let touched = 0;
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.styleGuide = c.styleGuide || [];
  let n = 0;
  for (const line of LINES) {
    const key = line.slice(0, 10);
    if (!c.styleGuide.some((s) => s.startsWith(key))) { c.styleGuide.push(line); n++; }
  }
  if (n) { fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8'); touched++; console.log(`${f}: +${n} reader rules (now ${c.styleGuide.length})`); }
}
console.log(`context packages updated: ${touched}`);
