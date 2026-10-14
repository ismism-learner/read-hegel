(async () => {
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = new URLSearchParams(location.search).get('q') || 'Sittlichkeit';

  // 1) inline table of contents
  const tocBtn = document.querySelector('.js-toc');
  tocBtn.click();
  await sleep(900);
  const panel = document.querySelector('.toc-panel.open');
  out.tocOpen = !!panel;
  out.tocLinks = panel ? panel.querySelectorAll('a').length : 0;

  // 2) full-text search
  const input = document.getElementById('q');
  input.value = q;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(6000);
  out.hitsHead = document.querySelector('.result-head .count')?.innerText || null;
  out.tocHitRows = document.querySelectorAll('.result--toc').length;
  out.bodyRows = document.querySelectorAll('.result:not(.result--toc)').length;
  out.marks = document.querySelectorAll('#results mark').length;
  out.firstLink = document.querySelector('.result:not(.result--toc) .result__body a')?.getAttribute('href') || null;
  out.libHidden = document.getElementById('library-section').hidden;
  return JSON.stringify(out);
})()
