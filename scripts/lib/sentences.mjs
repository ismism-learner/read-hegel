// German sentence segmentation + sentence-level markup for the bilingual reader.
// The build and the translation pipeline share this module, so a German sentence and
// its Chinese counterpart always carry the same data-sid.

const ABBR = new Set([
  'z', 'b', 'd', 'h', 'u', 'a', 'v', 's', 'o', 'ä', 'evtl', 'ggf', 'bzw', 'vgl', 'usw', 'etc',
  'ca', 'inkl', 'zzgl', 'sog', 'ebd', 'bspw', 'zzt', 'max', 'min', 'jh', 'jhd', 'mio', 'mrd',
  'nr', 'bd', 'bde', 'kap', 'abs', 'art', 'anm', 'hrsg', 'hg', 'übers', 'aufl', 'abt', 'tls',
  'dr', 'prof', 'st', 'th', 'phil', 'theol', 'math', 'log', 'metaph', 'psych', 'soz', 'pol',
  'lat', 'griech', 'dt', 'engl', 'frz', 'ital', 'span', 'hebr', 'sanskr', 'resp',
  'no', 'vol', 'p', 'pp', 'fig', 'lit',
]);

const TERMINATORS = '.!?…';
const CLOSERS = '«»""\u2018\u2019\u201c\u201d)]}\'”’';
const STARTERS = /[A-ZÄÖÜ0-9„«"\u201c\u201e(\[–—•§*]/;
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr']);

const MONTHS = new Set(['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august',
  'september', 'oktober', 'november', 'dezember']);
const ORDINAL_HEADS = new Set(['auflage', 'aufl', 'kapitel', 'kap', 'band', 'bde', 'teil', 'theil',
  'buch', 'abschnitt', 'abteilung', 'brief', 'vorlesung', 'stück', 'stueck', 'satz', 'anmerkung',
  'jahrhundert', 'jh', 'jahrtausend']);

/** Split plain German text into sentences: [{start, end, text}] with offsets into `text`. */
export function splitSentences(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    // Hegel's edition often starts a new sentence after ", – " (dash + capital)
    if (text[i] === '–' || text[i] === '—') {
      const prev = text.slice(0, i).replace(/\s+$/, '').slice(-1);
      if (!',;:'.includes(prev)) continue;
      let k = i + 1;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (k < text.length && STARTERS.test(text[k])) {
        out.push({ start, end: i });
        start = i;                       // the dash leads the next sentence
      }
      continue;
    }
    if (!TERMINATORS.includes(text[i])) continue;

    let j = i + 1;
    while (j < text.length && CLOSERS.includes(text[j])) j++;               // closing quotes/brackets
    if (j < text.length && !/\s/.test(text[j])) continue;                    // glued to next word

    if (text[i] === '.') {
      const m = /([A-Za-zÄÖÜäöüß]+|\d+)\.$/.exec(text.slice(Math.max(0, i - 14), i + 1));
      const tok = m ? m[1] : '';
      if (tok && /^[A-Za-zÄÖÜäöüß]$/.test(tok)) continue;                    // initial: G. W. F.
      if (tok && ABBR.has(tok.toLowerCase())) continue;                      // z. B., Bd., Nr.
      if (tok && /^\d+$/.test(tok)) {
        // ordinal or date: "14. November", "1. Auflage", "3. Kapitel"
        const after = (/^\s+([A-Za-zÄÖÜäöüß]+)/.exec(text.slice(j)) || [, ''])[1];
        if (after && (MONTHS.has(after.toLowerCase()) || ORDINAL_HEADS.has(after.toLowerCase()))) continue;
      }
    }

    let k = j;
    while (k < text.length && /\s/.test(text[k])) k++;
    if (k < text.length && !STARTERS.test(text[k])) continue;                // continues in lower case

    out.push({ start, end: j });
    start = j;
    i = j - 1;
  }
  if (start < text.length) out.push({ start, end: text.length });

  return out
    .map((s) => ({ ...s, text: text.slice(s.start, s.end).trim() }))
    .filter((s) => s.text.length > 0);
}

export const plainOf = (html) => html.replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const tagName = (tag) => (/^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(tag) || [, ''])[1].toLowerCase();
const isClose = (tag) => /^<\s*\//.test(tag);

/**
 * Wrap every sentence of a block in <span class="s" data-sid="PREFIXsN">.
 * Sentence boundaries are only honoured where no inline element is open, so a span
 * never has to close and reopen a tag: the markup stays well formed in every case.
 * @param {string} blockHtml sanitised block html containing one block element
 * @param {string} prefix    sid prefix, e.g. "b12"
 * @returns {{html: string, sentences: string[]}}
 */
export function markSentences(blockHtml, prefix) {
  // keep the block's own wrapper element outside the sentence spans
  const outer = /^\s*<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*)<\/\1>\s*$/.exec(blockHtml);
  if (outer) {
    const openTag = blockHtml.slice(0, blockHtml.indexOf('>') + 1);
    const closeTag = `</${outer[1]}>`;
    const inner = markSentences(outer[2], prefix);
    return { html: openTag + inner.html + closeTag, sentences: inner.sentences };
  }

  const plain = plainOf(blockHtml);
  const tokens = blockHtml.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
  const raw = splitSentences(plain);
  if (!raw.length) return { html: blockHtml, sentences: [] };

  // Only *balanced* tag pairs count towards depth. The digitised source contains unclosed inline
  // tags (e.g. a stray <em>); treating an unmatched open as a real nest would push every later
  // boundary inside it and collapse a whole paragraph into one "sentence".
  const matched = new Set();
  {
    const stack = [];
    tokens.forEach((tok, ti) => {
      if (tok[0] !== '<') return;
      const name = tagName(tok);
      if (VOID.has(name) || tok.endsWith('/>')) return;
      if (isClose(tok)) {
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].name === name) { matched.add(stack[k].ti); matched.add(ti); stack.length = k; break; }
        }
      } else stack.push({ name, ti });
    });
  }

  // depth of every plain-text position (0 = not inside any inline element)
  const depthAt = new Array(plain.length + 1).fill(0);
  let depth = 0, pos = 0;
  tokens.forEach((tok, ti) => {
    if (tok[0] === '<') {
      const name = tagName(tok);
      if (!matched.has(ti)) { depthAt[pos] = depth; return; }        // unmatched tag: no nesting
      if (!isClose(tok)) depth++;
      else depth = Math.max(0, depth - 1);
      depthAt[pos] = depth;
    } else {
      for (let i = 0; i < tok.length; i++) depthAt[pos + i] = depth;
      pos += tok.length;
    }
  });
  depthAt[plain.length] = 0;

  // Boundaries are used exactly as the splitter found them: the emitter below knows how to switch
  // a sentence span inside an inline element, so no snapping to element edges is needed.
  const ranges = [];
  for (const s of raw) {
    const start = Math.max(0, s.start);
    const end = Math.min(plain.length, s.end);
    if (end <= start) continue;
    const text = plain.slice(start, end).trim();
    if (!/[A-Za-zÄÖÜäöüßÀ-ÿͰ-Ͽ]/.test(text)) continue;   // skip "1)." style artefacts
    ranges.push({ start, end, text });
  }
  if (!ranges.length) {
    // e.g. a date line such as "1793-1796": no letters, but still worth one span
    const t = plain.trim();
    if (t) {
      const start = plain.indexOf(t);
      return { html: `<span class="s" data-sid="${prefix}s0">${blockHtml}</span>`, sentences: [t] };
    }
    return { html: blockHtml, sentences: [] };
  }

  // itemise the markup, remembering each text item's start position in the plain text
  const items = [];
  let p0 = 0;
  for (const tok of tokens) {
    if (tok[0] === '<') {
      const name = tagName(tok);
      const closing = isClose(tok);
      const selfClose = VOID.has(name) || /\/>$/.test(tok);
      items.push({ kind: 'tag', s: tok, name, closing, open: !closing && !selfClose });
    } else {
      items.push({ kind: 'text', s: tok, p0 });
      p0 += tok.length;
    }
  }

  const startsAt = new Map();               // plain position -> sentence index starting there
  const endsAt = new Map();                 // plain position -> sentence indices ending there
  ranges.forEach((r, idx) => {
    startsAt.set(r.start, idx);
    if (!endsAt.has(r.end)) endsAt.set(r.end, []);
    endsAt.get(r.end).push(idx);
  });

  let out = '';
  let spanOpen = false;
  const openTags = [];                      // inline elements open in the SOURCE at this point
  const openSpan = (idx) => { out += `<span class="s" data-sid="${prefix}s${idx}">`; spanOpen = true; };
  const closeSpan = () => { if (spanOpen) { out += '</span>'; spanOpen = false; } };

  // A sentence boundary may fall inside an inline element (the digitised source keeps e.g.
  // <em class="formel"> open across a whole paragraph). Close the element(s), switch the sentence
  // span, reopen the element(s): every boundary is honoured and the markup stays well formed.
  const boundary = (next) => {
    for (let i = openTags.length - 1; i >= 0; i--) out += `</${tagName(openTags[i])}>`;
    closeSpan();
    if (next !== undefined) openSpan(next);
    for (const t of openTags) out += t;
  };

  for (const it of items) {
    if (it.kind === 'tag') {
      out += it.s;
      if (it.open) openTags.push(it.s);
      else if (it.closing) openTags.pop();
      continue;
    }
    let i = 0;
    while (i < it.s.length) {
      const p = it.p0 + i;
      if (startsAt.has(p) || endsAt.has(p)) boundary(startsAt.has(p) ? startsAt.get(p) : undefined);
      let next = i + 1;
      while (next < it.s.length && !startsAt.has(it.p0 + next) && !endsAt.has(it.p0 + next)) next++;
      out += it.s.slice(i, next);
      i = next;
    }
  }
  boundary(undefined);                      // close the last span; inline tags stay balanced

  return { html: out, sentences: ranges.map((r) => r.text) };
}

/**
 * Extract the sentence texts from markup produced by markSentences.
 * Nesting aware: a nested <span class="pg"> must not end the sentence early.
 */
export function sentencesFromMarked(html) {
  const out = [];
  const re = /<\/?span\b[^>]*>/g;
  let m, openAt = -1, depth = 0;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const closing = tag[1] === '/';
    if (!closing) {
      if (openAt < 0 && /class="s"/.test(tag)) { openAt = re.lastIndex; depth = 1; }
      else if (openAt >= 0) depth++;
    } else if (openAt >= 0) {
      depth--;
      if (depth === 0) {
        out.push(plainOf(html.slice(openAt, m.index)).replace(/\s+/g, ' ').trim());
        openAt = -1;
      }
    }
  }
  return out;
}

/** Stable short hash of a string (FNV-1a, 48 bit, base36). */export function hashText(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 2246822519) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 10);
}
