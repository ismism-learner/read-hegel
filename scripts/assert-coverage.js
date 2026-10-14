(async () => {
  const p = new URLSearchParams(location.search);
  const v = p.get('v'), c = p.get('c') || '0';
  const data = await (await fetch(`data/vol/${v}/${c}.json`)).json();
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const plainOf = (h) => h.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const rows = [...document.querySelectorAll('#text .pair')];
  let blocks = 0, covered = 0, total = 0, worst = [], emptySpans = 0, missing = 0;

  data.blocks.forEach((b, bi) => {
    if (b.k !== 'p' || !b.ns) return;
    const row = rows.find((r) => r.dataset.bi === String(bi));
    if (!row) { missing++; return; }
    blocks++;
    const want = norm(plainOf(b.x));
    const dom = row.querySelector('.cell--de, .pair--mono') || row;
    const spans = [...dom.querySelectorAll('.s')];
    const got = norm(spans.map((s) => s.textContent).join(' '));
    const coveredLen = spans.reduce((a, s) => a + s.textContent.replace(/\s+/g, ' ').trim().length, 0);
    total += want.length;
    covered += coveredLen;
    spans.forEach((s) => { if (!s.textContent.trim()) emptySpans++; });
    if (want.length > 80) {
      const ratio = coveredLen / want.length;
      if (ratio < 0.93) worst.push({ bi, ratio: +ratio.toFixed(3), spans: spans.length, ns: b.ns, head: got.slice(0, 60) });
    }
  });

  return JSON.stringify({
    chunk: `${v}/${c}`, blocks, missing, emptySpans,
    coverage: +(covered / total).toFixed(4),
    lowCoverage: worst.slice(0, 6),
  });
})()
