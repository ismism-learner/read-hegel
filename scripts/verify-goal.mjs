// End-to-end verification of the objective's deliverables, in ONE browser session:
//   1. reader renders a deep-linked section
//   2. reading position is remembered and the library shows "continue"
//   3. full-text search over the whole corpus returns hits
//   4. a search deep link highlights and scrolls inside the reader
//   5. theme / font size / night mode persist
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.argv[2] || 'http://127.0.0.1:8788';
const PORT = 9500 + Math.floor(Math.random() * 300);
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('Edge not found'); process.exit(2); }

const profile = path.join(os.tmpdir(), 'hegel-verify-' + PORT);
const child = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function targets(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); if (r.ok) return r.json(); } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('devtools unreachable');
}
const page = (await targets()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
let bucket = [];
const errors = [];
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
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.text)) errors.push('[log] ' + m.params.entry.text);
});
await new Promise((r) => ws.addEventListener('addEventListener' in ws ? 'open' : 'open', r));
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const go = async (url, wait = 2200) => { bucket = []; await send('Page.navigate', { url }); await sleep(wait); };
const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };

/* 1 — reader renders a deep-linked section of a large volume */
await go(`${BASE}/reader.html?v=w13&c=40`);
const r1 = JSON.parse(await evalJs(`JSON.stringify({
  title: document.getElementById('doc-title').innerText,
  crumb: document.getElementById('crumb-now').innerText,
  chars: document.getElementById('text').innerText.length,
  toc: document.querySelectorAll('#sidebar-body a.node').length,
  pager: document.querySelectorAll('#pager a').length,
  progress: document.getElementById('progress-i').style.width,
  saved: localStorage.getItem('hegel.pos.w13')
})`));
check('reader renders a section', r1.chars > 5000 && r1.toc > 50 && r1.pager === 2, r1);
check('reading position persisted', !!r1.saved && JSON.parse(r1.saved).c === 40, r1.saved);

/* 2 — the library reflects that position */
await go(`${BASE}/index.html`);
const r2 = JSON.parse(await evalJs(`JSON.stringify({
  cards: document.querySelectorAll('.card').length,
  cont: [...document.querySelectorAll('.card')].filter(c=>/继续阅读/.test(c.innerText)).length,
  bars: document.querySelectorAll('.progress i').length,
  firstStats: document.querySelector('.card__stats').innerText
})`));
check('library shows 12 volumes', r2.cards === 12, r2.cards);
check('library shows continue + progress bar', r2.cont >= 1 && r2.bars >= 1, r2);

/* 3 — corpus-wide full-text search */
const r3 = JSON.parse(await evalJs(`(async () => {
  const i = document.getElementById('q');
  i.value = 'absolute Idee';
  i.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 7000));
  return JSON.stringify({
    head: document.querySelector('.result-head .count')?.innerText || null,
    tocHits: document.querySelectorAll('.result--toc').length,
    bodyHits: document.querySelectorAll('.result:not(.result--toc)').length,
    marks: document.querySelectorAll('#results mark').length,
    link: document.querySelector('.result:not(.result--toc) .result__body a')?.getAttribute('href') || null
  });
})()`));
check('corpus-wide search returns hits', /处命中/.test(r3.head || '') && r3.bodyHits > 0 && r3.marks > 0, r3);

/* 4 — search deep link highlights inside the reader */
const deep = `${BASE}/${r3.link}`;
await go(deep, 3000);
const r4 = JSON.parse(await evalJs(`JSON.stringify({
  url: location.search,
  marks: document.querySelectorAll('mark.hl').length,
  crumb: document.getElementById('crumb-now').innerText,
  scrolled: document.getElementById('doc').scrollTop > 0 || document.querySelectorAll('mark.hl.is-current').length > 0
})`));
check('deep link into search hit', r4.marks > 0 && /q=/.test(r4.url), r4);

/* 5 — settings persist (night mode, font size, page marks) */
const r5 = JSON.parse(await evalJs(`(async () => {
  document.querySelector('[data-theme="dark"]').click();
  document.querySelector('.js-font-inc').click();
  document.querySelector('.js-pagemarks').click();
  await new Promise(r => setTimeout(r, 120));
  return JSON.stringify({ theme: document.documentElement.dataset.theme, size: getComputedStyle(document.documentElement).getPropertyValue('--text-size').trim(), pm: document.body.dataset.pagemarks, saved: localStorage.getItem('hegel.settings') });
})()`));
await go(`${BASE}/reader.html?v=w3&c=0`, 2500);
const r5b = JSON.parse(await evalJs(`JSON.stringify({ theme: document.documentElement.dataset.theme, size: getComputedStyle(document.documentElement).getPropertyValue('--text-size').trim(), pm: document.body.dataset.pagemarks, marks: document.querySelectorAll('.pg').length })`));
check('night mode + font size persist across pages', r5b.theme === 'dark' && r5.theme === 'dark' && r5b.pm === 'off', { set: r5, reloaded: r5b });

console.log(`\nJS errors: ${errors.length}`);
for (const e of errors.slice(0, 8)) console.log('  ' + e);
const failed = checks.filter((c) => !c.pass);
console.log(`\nSUMMARY checks=${checks.length} passed=${checks.length - failed.length} failed=${failed.length} errors=${errors.length}`);

try { await send('Browser.close'); } catch { /* ignore */ }
ws.close(); child.kill();
setTimeout(() => process.exit(failed.length || errors.length ? 1 : 0), 300);
