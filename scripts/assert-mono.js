(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const qa = (s) => [...document.querySelectorAll(s)];
  const out = {};
  document.querySelector('[data-layout="mono"]').click();
  await sleep(600);
  out.cols = document.getElementById('text').dataset.cols;
  out.totalS = qa('.s').length;
  out.sWithSid = qa('.s[data-sid]').length;
  out.classes = [...new Set(qa('#text *').map((e) => e.className).filter((c) => typeof c === 'string' && c))].slice(0, 18);
  const de = qa('.s[data-sid]')[0];
  if (de) {
    out.firstSid = de.dataset.sid;
    out.text = de.innerText.slice(0, 40);
    de.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await sleep(450);
    out.after = getComputedStyle(de).backgroundSize;
    out.shift = getComputedStyle(de).top;
    out.on = qa('.s.on').length;
  }
  // also check the data attribute the CSS uses
  out.bodyLayout = document.body.dataset.layout;
  return JSON.stringify(out);
})()
