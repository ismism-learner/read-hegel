// Explore Douban endpoints usable without login.
const H = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9' };
const get = async (u) => { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(25000) }); return { status: r.status, text: await r.text() }; };

// 1) suggest endpoint
try {
  const { status, text } = await get('https://book.douban.com/j/subject_suggest?q=' + encodeURIComponent('精神现象学'));
  console.log('suggest status', status, 'len', text.length);
  console.log(text.slice(0, 700));
} catch (e) { console.log('suggest ERR', e.message); }

// 2) what is subject 1003098
try {
  const { text } = await get('https://book.douban.com/subject/1003098/');
  const title = (text.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
  const rating = (text.match(/property="v:average"[^>]*>([\d.]+)</) || [, ''])[1];
  const voters = (text.match(/property="v:votes"[^>]*>(\d+)</) || [, ''])[1];
  console.log('\nsubject 1003098:', title, '| rating', rating, '| votes', voters);
} catch (e) { console.log('subject ERR', e.message); }

// 3) comments endpoints (positive / negative)
for (const status of ['P', 'N']) {
  try {
    const { status: st, text } = await get(`https://book.douban.com/subject/1003098/comments/?start=0&limit=20&status=${status}`);
    const items = [...text.matchAll(/<span class="short">([\s\S]*?)<\/span>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    console.log(`\ncomments status=${status}: http ${st} len ${text.length} parsed ${items.length}`);
    items.slice(0, 3).forEach((s) => console.log('   • ' + s.slice(0, 90)));
  } catch (e) { console.log(`comments ${status} ERR`, e.message); }
}

// 4) long reviews list
try {
  const { status, text } = await get('https://book.douban.com/subject/1003098/reviews');
  const titles = [...text.matchAll(/<a[^>]+href="https:\/\/book\.douban\.com\/review\/(\d+)\/"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => `${m[1]} ${m[2].replace(/<[^>]+>/g, '').trim()}`);
  console.log('\nreviews: http', status, 'len', text.length, 'found', titles.length);
  titles.slice(0, 6).forEach((t) => console.log('   • ' + t.slice(0, 90)));
} catch (e) { console.log('reviews ERR', e.message); }
