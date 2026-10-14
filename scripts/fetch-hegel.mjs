// Fetch the German Hegel "Werke" HTML corpus from the MARX-EBOOKS GitHub mirror via jsDelivr.
// Resumable: existing non-empty files are skipped.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const TREE = 'data/_raw/gh-tree.json';
const OUT = 'data/_raw/gh/HEGEL';
const MIRRORS = [
  'https://marx-ebooks.github.io/docs/HEGEL/',
  'https://mlclassic.netlify.app/docs/HEGEL/',
  'https://cdn.jsdelivr.net/gh/MARX-EBOOKS/marx-ebooks.github.io@main/docs/HEGEL/',
];
const CONCURRENCY = 5;
const RETRY = 4;
const KEEP = /\.(html|css|json|js|jpe?g|png|gif|svg)$/i;

const tree = JSON.parse(fs.readFileSync(TREE, 'utf8').replace(/^\uFEFF/, ''));
const targets = tree
  .filter((e) => e.type === 'blob' && e.path.startsWith('docs/HEGEL/') && KEEP.test(e.path))
  .map((e) => e.path.slice('docs/HEGEL/'.length))
  .sort();

console.log(`targets: ${targets.length}`);

let done = 0, fetched = 0, skipped = 0, bytes = 0;
const failed = [];

async function getOne(rel) {
  const dest = path.join(OUT, rel);
  try {
    const st = await fsp.stat(dest);
    if (st.size > 0) { skipped++; return; }
  } catch { /* not present */ }

  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const enc = rel.split('/').map(encodeURIComponent).join('/');
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const base = MIRRORS[(attempt - 1) % MIRRORS.length];
    try {
      const res = await fetch(base + enc, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('empty');
      await fsp.writeFile(dest, buf);
      fetched++; bytes += buf.length;
      return;
    } catch (err) {
      if (attempt === RETRY) { failed.push(`${rel} :: ${err.message}`); return; }
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
}

const queue = targets.slice();
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const rel = queue.shift();
    await getOne(rel);
    done++;
    if (done % 200 === 0) console.log(`  ${done}/${targets.length} fetched=${fetched} skipped=${skipped} failed=${failed.length} MB=${(bytes / 1048576).toFixed(1)}`);
  }
});
await Promise.all(workers);

console.log(`DONE total=${targets.length} fetched=${fetched} skipped=${skipped} failed=${failed.length} MB=${(bytes / 1048576).toFixed(1)}`);
for (const f of failed.slice(0, 60)) console.log('  FAILED ' + f);
