// Drive headless Edge over CDP: load a page, collect console errors, run an assertion, screenshot.
//   node scripts/check.mjs <url> [--expr "js"] [--shot out.png] [--wait 4000] [--w 1440] [--h 1200]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const url = args[0];
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const exprFile = opt('expr-file', '');
const expr = exprFile ? fs.readFileSync(exprFile, 'utf8') : opt('expr', 'null');
const shot = opt('shot', '');
const wait = Number(opt('wait', 4000));
const W = Number(opt('w', 1440));
const H = Number(opt('h', 1200));
const PORT = 9333 + Math.floor(Math.random() * 400);

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('no Edge found'); process.exit(2); }

const profile = path.join(os.tmpdir(), 'hegel-cdp-' + PORT);
const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(pathname, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${pathname}`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('devtools endpoint unreachable');
}

const targets = await http('/json/list');
let page = targets.find((t) => t.type === 'page');
if (!page) {
  await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  page = (await http('/json/list')).find((t) => t.type === 'page');
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const logs = [];
const errors = [];

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mid = ++id;
  pending.set(mid, { resolve, reject });
  ws.send(JSON.stringify({ id: mid, method, params }));
});

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
    logs.push(`${msg.params.type}: ${text}`);
    if (msg.params.type === 'error') errors.push(text);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push(`${d.text} ${d.exception?.description || ''} @${d.url || ''}:${d.lineNumber}`);
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push(`[network/log] ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  }
});

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

await send('Page.navigate', { url });
await sleep(wait);

let result = null;
try {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    errors.push(`evaluate: ${d.text} ${d.exception?.description || ''}`);
    result = null;
  } else {
    result = r.result?.value ?? r.result?.description ?? null;
  }
} catch (e) { errors.push('eval failed: ' + e.message); }

if (shot) {
  const full = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  fs.writeFileSync(shot, Buffer.from(full.data, 'base64'));
}

console.log(JSON.stringify({ url, result, errors: errors.slice(0, 25), logs: logs.slice(0, 25), shot: shot || null }, null, 1));

try { await send('Browser.close'); } catch { /* ignore */ }
ws.close();
child.kill();
setTimeout(() => process.exit(errors.length ? 1 : 0), 300);
