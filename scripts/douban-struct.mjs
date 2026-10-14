const H = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9', 'referer': 'https://book.douban.com/' };
const get = async (u) => { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(25000) }); return { status: r.status, text: await r.text() }; };

const u = process.argv[2] || 'https://book.douban.com/subject/1012380/comments/?status=N&start=0&limit=20';
const { status, text } = await get(u);
console.log('URL', u, '\nhttp', status, 'len', text.length);

// what classes exist?
const classes = new Map();
for (const m of text.matchAll(/class="([^"]+)"/g)) {
  for (const c of m[1].split(/\s+/)) classes.set(c, (classes.get(c) || 0) + 1);
}
console.log('\nclasses:', [...classes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c, n]) => `${c}:${n}`).join('  '));

// any comment-ish markers?
for (const pat of ['comment-item', 'short', 'rating', 'votes', '登录', 'login', 'data-'] ) {
  const n = (text.match(new RegExp(pat, 'g')) || []).length;
  console.log(`  "${pat}" × ${n}`);
}

const body = text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const idx = body.indexOf('comments');
console.log('\n--- excerpt around "comments" ---');
console.log(body.slice(Math.max(0, idx - 200), idx + 1800).replace(/\n{2,}/g, '\n'));
