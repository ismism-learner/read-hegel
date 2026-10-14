(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const first = document.querySelector('[data-sid="b45s0"]');
  if (!first) return JSON.stringify({ found: false });
  out.found = true;
  const deCol = first.closest('.cell--de') || first.closest('.col-de') || first.parentElement;
  const spans = [...deCol.querySelectorAll('.s[data-sid]')];
  out.spansInGermanBlock = spans.length;
  out.sids = spans.map((s) => s.dataset.sid);

  const second = document.querySelector('[data-sid="b45s1"]');
  out.hoveredSid = second.dataset.sid;
  out.hoveredTextLength = second.innerText.trim().length;
  out.hoveredText = second.innerText.trim().slice(0, 46);
  out.underlineBefore = getComputedStyle(second).backgroundSize;

  second.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(500);
  out.underlineAfter = getComputedStyle(second).backgroundSize;
  out.shift = getComputedStyle(second).top;
  out.hoveredOn = second.classList.contains('on');
  const onSids = [...document.querySelectorAll('.s.on')].map((s) => s.dataset.sid);
  out.onSids = onSids;
  out.neighboursOn = onSids.filter((s) => s !== 'b45s1').length;

  // the same sentence index in the neighbouring sentence must stay off
  out.s0On = document.querySelector('[data-sid="b45s0"]').classList.contains('on');
  out.s2On = document.querySelector('[data-sid="b45s2"]').classList.contains('on');

  // now hover the first sentence and check the underline moves
  first.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(400);
  out.s0Underline = getComputedStyle(first).backgroundSize;
  out.s1AfterMove = getComputedStyle(second).backgroundSize;
  return JSON.stringify(out);
})()
