// Final integrity report for the built site data.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'web/data';
const m = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
let chunks = 0, missing = [], badIdx = [], badNav = [], plain = 0, html_chars = 0, sentences = 0;
const navBroken = [];

for (const v of m.volumes) {
  const dir = path.join(OUT, 'vol', v.id);
  for (const c of v.chunks) {
    const p = path.join(dir, `${c.i}.json`);
    if (!fs.existsSync(p)) { missing.push(`${v.id}/${c.i}`); continue; }
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const html = j.blocks ? j.blocks.map((b) => b.x).join('\n') : (j.html || '');
    chunks++;
    html_chars += html.length;
    plain += html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
    sentences += (j.blocks || []).reduce((a, b) => a + (b.ns || 0), 0);
  }
  if (!fs.existsSync(path.join(dir, 'idx.json'))) badIdx.push(v.id);
  if (!fs.existsSync(path.join(dir, 'nav.json'))) badNav.push(v.id);
  else {
    const nav = JSON.parse(fs.readFileSync(path.join(dir, 'nav.json'), 'utf8'));
    const walk = (ns) => ns.forEach((n) => {
      if (n.c < 0 || n.c >= v.chunks.length) navBroken.push(`${v.id}:${n.t}->${n.c}`);
      walk(n.k);
    });
    walk(nav);
  }
}

const imgs = fs.existsSync(path.join(OUT, 'img'))
  ? fs.readdirSync(path.join(OUT, 'img')).reduce((a, d) => a + fs.readdirSync(path.join(OUT, 'img', d)).length, 0) : 0;

console.log('volumes        :', m.volumes.length, '(' + m.volumes.map((v) => v.id).join(' ') + ')');
console.log('bands covered  :', [...new Set(m.volumes.flatMap((v) => v.bands))].sort((a, b) => a - b).join(','));
console.log('chunk files    :', chunks, ' missing:', missing.length);
console.log('nav / idx files:', m.volumes.length - badNav.length, '/', m.volumes.length - badIdx.length, ' broken nav refs:', navBroken.length);
console.log('figures        :', imgs);
console.log('chars (html)   :', html_chars.toLocaleString('en-US'), ' chars (text):', plain.toLocaleString('en-US'));
console.log('sentences      :', sentences.toLocaleString('en-US'));
console.log('per volume     :');
for (const v of m.volumes) {
  console.log(`  ${v.id.padEnd(4)} Bd. ${String(v.bands.join('-')).padEnd(6)} ${String(v.chunks.length).padStart(3)} chunks  ${String(v.terms).padStart(6)} terms  ${(v.plain / 10000).toFixed(1).padStart(6)} 万字符  ${v.de}`);
}
const ok = !missing.length && !badIdx.length && !badNav.length && !navBroken.length && m.volumes.length === 12;
console.log('\nINTEGRITY:', ok ? 'OK' : 'PROBLEMS FOUND');
process.exit(ok ? 0 : 1);
