(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const text = document.getElementById('text');
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];

  out.layout = document.body.dataset.layout;
  out.cols = text.dataset.cols;
  out.pairs = qa('.pair').length;
  out.headRows = qa('.pair--head').length;
  out.zhCells = qa('.cell--zh').length;
  out.enCells = qa('.cell--en').length;
  out.missingCells = qa('.cell.is-missing').length;
  out.sentSpansDe = qa('.cell--de .s').length;
  out.sentSpansZh = qa('.cell--zh .s').length;
  out.sentSpansEn = qa('.cell--en .s').length;
  out.stat = document.getElementById('trans-stat').innerText;

  // the first translated sentence on the left
  const de = q('.cell--de .s[data-sid]');
  out.firstSid = de?.dataset.sid;
  const zh = q(`.cell--zh .s[data-sid="${de.dataset.sid}"]`);
  const en = q(`.cell--en .s[data-sid="${de.dataset.sid}"]`);
  out.zhExists = !!zh;
  out.enExists = !!en;
  out.deText = de?.innerText?.slice(0, 60);
  out.zhText = zh?.innerText?.slice(0, 40);
  out.enText = en?.innerText?.slice(0, 60);
  out.underlineBefore = getComputedStyle(de).backgroundSize;

  // hover the German sentence
  de.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(450);
  out.deOn = de.classList.contains('on');
  out.zhOn = zh?.classList.contains('on');
  out.enOn = en?.classList.contains('on');
  out.underlineAfter = getComputedStyle(de).backgroundSize;
  out.zhUnderline = getComputedStyle(zh).backgroundSize;
  out.deShift = getComputedStyle(de).top;
  out.onCount = qa('.s.on').length;

  // a second sentence must move the underline
  const de2 = qa('.cell--de .s[data-sid]')[2];
  de2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  await sleep(300);
  out.secondSid = de2.dataset.sid;
  out.firstStillOn = de.classList.contains('on');
  out.secondOn = de2.classList.contains('on');

  // hide the English column
  document.getElementById('en-toggle').click();
  await sleep(450);
  out.colsAfterEnToggle = text.dataset.cols;
  out.enCellsAfter = qa('.cell--en').length;
  out.zhAfter = qa('.cell--zh').length;

  // back to English, then monolingual
  document.getElementById('en-toggle').click();
  await sleep(300);
  document.querySelector('[data-layout="mono"]').click();
  await sleep(450);
  out.colsMono = text.dataset.cols;
  out.pairsMono = qa('.pair').length;
  out.sentMono = qa('.s').length;
  document.querySelector('[data-layout="tri"]').click();
  await sleep(450);
  out.colsBack = text.dataset.cols;
  return JSON.stringify(out);
})()
