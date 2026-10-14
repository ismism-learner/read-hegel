// Conservative-review pass for rev-w3-3-01: apply the minimal word-level fixes only.
import fs from 'node:fs';

const IN = 'data/_jobs/rev-w3-3-01.in.json';
const OUT = 'data/_jobs/rev-w3-3-01.out.json';

// key -> list of [find, replace] (literal, must occur exactly once)
const FIXES = {
  '2.0': [['对意识来说始终是某种不同于它自身的东西', '对意识来说是某种不同于它自身的东西']], // "始终" not in the German
  '3.3': [['或者说并不是差别，而是纯粹消逝着的本质', '或者说并不是差别，并且是纯粹消逝着的本质']], // "und", not "sondern"
  '4.2': [['恰恰就它是被设定为存在者而言', '也就它是被设定为存在者而言']], // "auch insofern, als"
};

const job = JSON.parse(fs.readFileSync(IN, 'utf8'));
const items = job.items.map((it) => {
  const k = `${it.bi}.${it.si}`;
  let zh = it.zh;
  for (const [find, repl] of FIXES[k] || []) {
    const n = zh.split(find).length - 1;
    if (n !== 1) throw new Error(`${k}: expected 1 occurrence of ${JSON.stringify(find)}, got ${n}`);
    zh = zh.replace(find, repl);
  }
  return { vol: it.vol, chunk: it.chunk, bi: it.bi, si: it.si, zh };
});

fs.writeFileSync(OUT, JSON.stringify({ id: job.id, items }, null, 1), 'utf8');
const changed = items.filter((x, i) => x.zh !== job.items[i].zh);
console.log(`items ${items.length}; changed ${changed.length}`);
for (const c of changed) {
  const old = job.items.find((x) => x.bi === c.bi && x.si === c.si).zh;
  console.log(`${c.bi}.${c.si}:\n  OLD ${old}\n  NEW ${c.zh}`);
}
const buf = fs.readFileSync(OUT);
console.log('bytes', buf.length, 'bom', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
