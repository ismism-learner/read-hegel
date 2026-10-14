// Probe reachability of Chinese review sites (this environment has a selective network).
const urls = [
  'https://book.douban.com/',
  'https://www.douban.com/',
  'https://m.douban.com/',
  'https://book.douban.com/subject/1003098/',
  'https://www.zhihu.com/',
  'https://weread.qq.com/',
  'https://www.jd.com/',
  'https://www.dangdang.com/',
  'https://www.douban.com/search?q=%E7%B2%BE%E7%A5%9E%E7%8E%B0%E8%B1%A1%E5%AD%A6',
  'https://cn.bing.com/search?q=%E8%B1%86%E7%93%A3+%E7%B2%BE%E7%A5%9E%E7%8E%B0%E8%B1%A1%E5%AD%A6+%E8%AF%91%E6%9C%AC',
];

for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9' }, signal: AbortSignal.timeout(20000) });
    const text = await r.text();
    console.log(`OK   ${r.status}  ${String(text.length).padStart(7)} B  ${u}`);
  } catch (e) {
    console.log(`ERR  ${e.name}: ${String(e.message).slice(0, 60)}  ${u}`);
  }
}
