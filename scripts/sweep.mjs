// Sweep every volume (and a few chunks each) in one headless browser, reporting JS errors.
//   node scripts/sweep.mjs [--base http://127.0.0.1:8788] [--per 2]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const BASE = opt('base', 'http://127.0.0.1:8788');
const PER = Number(opt('per', 2));
const PORT = 9700 + Math.floor(Math.random() * 200);

const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('Edge not found'); process.exit(2); }

const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
const urls = [];
for (const v of manifest.volumes) {
  const picks = new Set([0, Math.floor(v.chunks.length / 2), v.chunks.length - 1]);
  for (const c of [...picks].slice(0, PER + 1)) urls.push({ vol: v.id, c, url: `${BASE}/reader.html?v=${v.id}&c=${c}` });
}

const profile = path.join(os.tmpdir(), 'hegel-sweep-' + PORT);
const child = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function list(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); if (r.ok) return r.json(); } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('no devtools');
}
const page = (await list()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
let bucket = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id; pending.set(mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    if (m.error) rej(new Error(m.error.message)); else res(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    bucket.push(`${d.exception?.description || d.text}`.split('\n')[0]);
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') bucket.push('[log] ' + m.params.entry.text);
});
await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });

const rows = [];
for (const u of urls) {
  bucket = [];
  await send('Page.navigate', { url: u.url });
  await sleep(1400);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({chars:document.getElementById('text')?.innerText.length||0, toc:document.querySelectorAll('#sidebar-body a.node').length, title:document.getElementById('crumb-now')?.innerText||''})`,
    returnByValue: true,
  });
  const info = JSON.parse(r.result.value || '{}');
  rows.push({ ...u, ...info, errors: [...new Set(bucket)].filter((e) => !/favicon/.test(e)) });
  process.stdout.write(`  ${u.vol}/${u.c}  ${String(info.chars).padStart(7)} chars  toc=${String(info.toc).padStart(4)}  errors=${rows.at(-1).errors.length}\n`);
}

console.log('\nvolume  chunks checked  min chars  errors');
for (const v of manifest.volumes) {
  const mine = rows.filter((r) => r.vol === v.id);
  console.log(`${v.id.padEnd(7)} ${String(mine.length).padStart(6)} ${String(Math.min(...mine.map((m) => m.chars))).padStart(11)}  ${mine.reduce((a, m) => a + m.errors.length, 0)}`);
}
const bad = rows.filter((r) => r.errors.length);
console.log(`\nTOTAL urls=${rows.length} with-errors=${bad.length}`);
for (const b of bad.slice(0, 10)) console.log(`  ${b.url}\n    ${b.errors.join('\n    ')}`);

try { await send('Browser.close'); } catch { /* ignore */ }
ws.close(); child.kill();
setTimeout(() => process.exit(bad.length ? 1 : 0), 300);
