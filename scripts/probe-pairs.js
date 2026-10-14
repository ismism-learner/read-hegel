(() => {
  const pairs = [...document.querySelectorAll('.pair')];
  const out = { first: [], counts: {} };
  for (const p of pairs.slice(0, 4)) {
    out.first.push({ cls: p.className, sid: (p.querySelector('.s') || {}).dataset?.sid || null, text: (p.innerText || '').replace(/\s+/g, ' ').slice(0, 70) });
  }
  for (const p of pairs) out.counts[p.className] = (out.counts[p.className] || 0) + 1;
  out.headRows = document.querySelectorAll('.pair--head').length;
  out.crumbs = (document.getElementById('crumbs') || {}).innerText || null;
  out.title = (document.getElementById('doc-title') || {}).innerText || null;
  out.chunkTitle = document.querySelector('.chunk-title')?.innerText || null;
  return JSON.stringify(out);
})()
