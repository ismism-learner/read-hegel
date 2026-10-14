import fs from 'node:fs';
import { splitSentences, plainOf } from './lib/sentences.mjs';

const vol = process.argv[2] || 'w2', chunk = process.argv[3] || '10', bi = Number(process.argv[4] || 45);
const c = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunk}.json`, 'utf8'));
let blockHtml = c.blocks[bi].x;

// same wrapper strip as markSentences
const outer = /^\s*<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*)<\/\1>\s*$/.exec(blockHtml);
if (outer) blockHtml = outer[2];

console.log('entities present:', (blockHtml.match(/&[a-z]+;|&#\d+;/g) || []).join(' ') || 'none');

const plain = plainOf(blockHtml);
const tokens = blockHtml.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
const tagName = (t) => (/^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(t) || [, ''])[1].toLowerCase();
const isClose = (t) => /^<\s*\//.test(t);

const depthAt = new Array(plain.length + 1).fill(0);
let depth = 0, pos = 0;
for (const tok of tokens) {
  if (tok[0] === '<') {
    const name = tagName(tok);
    if (!isClose(tok)) { if (!VOID.has(name) && !tok.endsWith('/>')) depth++; }
    else depth = Math.max(0, depth - 1);
    depthAt[pos] = depth;
  } else {
    for (let i = 0; i < tok.length; i++) depthAt[pos + i] = depth;
    pos += tok.length;
  }
}
console.log(`plain=${plain.length} tokensTextPos=${pos} (drift = ${pos - plain.length})`);

const raw = splitSentences(plain);
console.log('raw sentences:', raw.length);
for (const s of raw) console.log(`  start=${s.start} end=${s.end} depthAt[start]=${depthAt[s.start]} depthAt[end]=${depthAt[s.end]} :: ${s.text.slice(0, 60)}`);
