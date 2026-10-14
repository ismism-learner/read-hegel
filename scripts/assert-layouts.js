(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const out = { layouts: {} };

  const measure = async (label) => {
    const r = {};
    r.cols = document.getElementById('text').dataset.cols;
    r.zhCells = qa('.cell--zh').length;
    r.enCells = qa('.cell--en').length;
    r.deSpans = qa('.cell--de .s').length;
    r.zhSpans = qa('.cell--zh .s').length;
    const de = q('.cell--de .s[data-sid]');
    const zh = de ? q(`.cell--zh .s[data-sid="${de.dataset.sid}"]`) : null;
    if (de) {
      r.sid = de.dataset.sid;
      r.before = getComputedStyle(de).backgroundSize;
      de.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await sleep(450);
      r.deAfter = getComputedStyle(de).backgroundSize;
      r.zhAfter = zh ? getComputedStyle(zh).backgroundSize : null;
      r.shift = getComputedStyle(de).top;
      r.onCount = qa('.s.on').length;
    }
    out.layouts[label] = r;
  };

  await measure('tri');
  document.getElementById('en-toggle').click();
  await sleep(400);
  await measure('de-zh');
  document.querySelector('[data-layout="mono"]').click();
  await sleep(400);
  await measure('de-only');
  document.querySelector('[data-layout="tri"]').click();
  await sleep(400);
  out.backTo = document.getElementById('text').dataset.cols;
  return JSON.stringify(out);
})()
