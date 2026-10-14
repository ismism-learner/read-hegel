// Dump the Douban comments for reading: full text of low-score comments per book.
//   node scripts/douban-dump.mjs [--book 精神现象学] [--all]
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/_research/douban';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const BOOK = opt('book', '');
const ALL = args.includes('--all');

const files = fs.readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f));
const books = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
  .filter((b) => !BOOK || b.title.includes(BOOK))
  .sort((a, b) => (b.comments.N || []).length - (a.comments.N || []).length);

for (const b of books) {
  console.log(`\n################ ${b.title}${b.year ? ' (' + b.year + ')' : ''}  id=${b.id}  votes=${b.votes}`);
  if (b.translator) console.log(`译者/出版: ${b.translator} | ${b.publisher || ''}`);
  const low = b.comments.N || [];
  console.log(`--- 差评 ${low.length} 条 ---`);
  for (const c of low) console.log(`• ${c.text}`);
  if (ALL) {
    console.log(`--- 全部 ${(b.comments.all || []).length} 条 ---`);
    for (const c of b.comments.all || []) console.log(`• ${c.text}`);
  }
}
