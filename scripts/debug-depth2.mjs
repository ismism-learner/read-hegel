import fs from 'node:fs';
import { splitSentences, plainOf } from './lib/sentences.mjs';

const vol = process.argv[2] || 'w2', chunk = process.argv[3] || '10', bi = Number(process.argv[4] || 45);
const c = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunk}.json`, 'utf8'));
const stripped = c.blocks[bi].x.replace(/<span class="s" data-sid="[^"]*">([\s\S]*?)<\/span>/g, '$1');

const plain = plainOf(stripped);
const tokens = stripped.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
const tagName = (t) => (/^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(t) || [, ''])[1].toLowerCase();
const isClose = (t) => /^<\s*\//.test(t);

const depthAt = new Array(plain.length + 1).fill(0);
let depth = 0, pos = 0;
const events = [];
for (const tok of tokens) {
  if (tok[0] === '<') {
    const name = tagName(tok);
    if (!isClose(tok)) { if (!VOID.has(name) && !tok.endsWith('/>')) depth++; }
    else depth = Math.max(0, depth - 1);
    depthAt[pos] = depth;
    events.push(`@${pos} ${isClose(tok) ? 'close' : 'open '} ${name} -> depth ${depth}`);
  } else {
    for (let i = 0; i < tok.length; i++) depthAt[pos + i] = depth;
    pos += tok.length;
  }
}
console.log('tag events:');
for (const e of events) console.log('  ' + e);
console.log('final depth:', depth, '| tokensTextPos:', pos, '| plain:', plain.length);

const raw = splitSentences(plain);
console.log('\nboundaries:');
for (const s of raw) console.log(`  start=${s.start} depth=${depthAt[s.start]} | end=${s.end} depth=${depthAt[s.end]}`);
