(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const walker = document.createTreeWalker(document.getElementById('text'), NodeFilter.SHOW_TEXT);
  let node = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue.trim().length > 24) { node = n; break; }
  }
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, 14);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const diag = { text: sel.toString(), anchorInText: document.getElementById('text').contains(sel.anchorNode) };
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await sleep(300);
  const pop = document.getElementById('sel-pop');
  diag.open = pop.classList.contains('is-open');
  diag.buttons = [...pop.querySelectorAll('button, a')].map((b) => b.textContent.trim());
  diag.lookup = [...pop.querySelectorAll('a')].map((a) => a.href);
  diag.pos = pop.style.top + ' / ' + pop.style.left;

  // clicking "copy" must not throw even when the clipboard is unavailable
  pop.querySelector('[data-act="copy"]')?.click();
  await sleep(200);
  diag.toast = document.querySelector('.toast')?.textContent || null;
  return JSON.stringify(diag);
})()
