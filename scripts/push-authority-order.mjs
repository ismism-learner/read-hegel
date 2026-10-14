// Establish the authority order and demote reader/other-translation opinion to reference-only.
//   用户词族政策 > 卷级上下文包 > 共享词表 > 通行惯例与其他译本/读者评论（仅供参考）
//   node scripts/push-authority-order.mjs
import fs from 'node:fs';

const AUTHORITY = '权威顺序（不可颠倒）：① 用户的词族／术语政策最高，任何其他依据都不得用来推翻它；② 本卷术语包在政策框架内细化，与政策冲突时以政策为准；③ 共享词表；④ 通行译名、学术惯例、其他中译本与读者评论——仅供参考，只能用来改进，绝不能作为改动政策译名的理由。特别提醒：通行译名（如“唯心主义”“理念”）与政策冲突时，一律以政策为准。';

// old reader-derived lines -> restated as our own requirements, with the policy on top
const REPLACE = [
  ['不拆句、不动标点层级：', '不拆句、不动标点层级：原文用逗号、分号、冒号层层展开的长句，中文保留为一整句；不得把分号改成句号切成一串短句——那会让段内论证层次散掉，读者无法看出论证走向。'],
  ['不增不删：', '不增不删：不漏否定词、不漏被动、不漏半句；不把一句拆成两句；不作解释性增补，不夹带译者自己的见解（译者注只写版本、术语与必要说明）。'],
  ['一句只译一次：', '一句只译一次：定语从句、插入语都只出现一次，不得重复翻译同一从句。'],
  ['反身代词与格：', '反身代词与格：德语第三格 sich 多数是“对自己／为自己”，不是“自己”；es ist / es gibt 常等于“有”，不要一律译成“它是”。'],
  ['主宾与格关系逐句核对：', '主宾与格关系逐句核对：德语长句里分句的主语常发生切换，必须显式处理，不得让前后分句的主语颠倒或含糊。'],
  ['不造生词：', '不造生词：术语先照词族政策（本包 family 条目），政策未覆盖之处才用通行译名；确需新造必须加译注说明理由。不得为了“通俗”而改用与政策冲突的通行译名。'],
  ['术语一一对应：', '术语一一对应：一个德文术语只用一个中文译名，一个中文译名也只用于一个德文术语；不得用两三个中文词去译同一个概念，也不得把两个不同术语合译成一个词。'],
  ['代词指代要落实：', '代词指代要落实：不让读者做“二次解读”；指代不清时重复名词。'],
];

let touched = 0;
for (const f of fs.readdirSync('data/_jobs').filter((x) => /^context-.*\.json$/.test(x))) {
  const p = `data/_jobs/${f}`;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  c.styleGuide = c.styleGuide || [];

  // rewrite the reader-derived lines
  let n = 0;
  c.styleGuide = c.styleGuide.map((line) => {
    for (const [key, text] of REPLACE) if (line.startsWith(key) && line !== text) { n++; return text; }
    return line;
  });

  // authority order goes first, exactly once
  c.styleGuide = c.styleGuide.filter((s) => !s.startsWith('权威顺序（不可颠倒）'));
  c.styleGuide.unshift(AUTHORITY);

  fs.writeFileSync(p, JSON.stringify(c, null, 1), 'utf8');
  touched++;
  console.log(`${f}: ${n} lines restated, authority order set first (${c.styleGuide.length} rules)`);
}
console.log(`context packages updated: ${touched}`);
