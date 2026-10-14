(async () => {
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1) switch volume through the toolbar select
  const sel = document.getElementById('vol-select');
  sel.value = 'w7';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(2500);
  out.titleAfterSwitch = document.getElementById('doc-title').innerText;
  out.chunkAfterSwitch = new URLSearchParams(location.search).get('c');

  // 2) in-volume search tab
  document.querySelector('[data-tab="search"]').click();
  await sleep(300);
  const box = document.getElementById('vol-q');
  out.searchTabRendered = !!box;
  box.value = 'Sittlichkeit';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(4000);
  out.hits = document.querySelectorAll('.hit').length;
  out.firstHitTitle = document.querySelector('.hit b')?.innerText || null;

  // 3) open the first hit
  const hit = document.querySelector('.hit');
  if (hit) { hit.click(); await sleep(2500); }
  out.afterHitCrumb = document.getElementById('crumb-now').innerText;
  out.afterHitMarks = document.querySelectorAll('mark.hl').length;
  out.afterHitUrl = location.search;

  // 4) bookmark the current section
  document.getElementById('btn-mark').click();
  await sleep(200);
  out.marked = document.getElementById('btn-mark').textContent;
  out.overallErrors = window.__errors || [];
  return JSON.stringify(out);
})()
