(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = document.querySelector('.cell--de .s[data-sid="b3s2"]') || document.querySelector('.cell--de .s');
  s.scrollIntoView({ block: 'center' });
  await sleep(300);
  s.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(500);
  return JSON.stringify({
    sid: s.dataset.sid,
    german: s.innerText.slice(0, 70),
    on: [...document.querySelectorAll('.s.on')].map((n) => n.dataset.lang + ':' + n.innerText.slice(0, 28)),
    underline: getComputedStyle(s).backgroundSize,
  });
})()
