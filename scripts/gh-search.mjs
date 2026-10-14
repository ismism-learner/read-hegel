// Search GitHub for existing translation-agent architectures and print candidates.
import fs from 'node:fs';

const QUERIES = [
  'multi-agent translation LLM',
  'translation agent architecture',
  'LLM translation reflection back-translation',
  'document translation LLM pipeline glossary',
  'machine translation quality estimation MQM',
  'agentic translation workflow',
  'translator agent crew',
  'long document translation LLM',
];

const H = { 'user-agent': 'Mozilla/5.0', accept: 'application/vnd.github+json' };
const seen = new Map();
const lines = [];

for (const q of QUERIES) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=12`;
  let j;
  try {
    const r = await fetch(url, { headers: H });
    if (!r.ok) { lines.push(`## ${q}  -> HTTP ${r.status}`); continue; }
    j = await r.json();
  } catch (e) { lines.push(`## ${q} -> ${e.message}`); continue; }
  lines.push(`\n## ${q}   (total ${j.total_count})`);
  for (const it of j.items || []) {
    const key = it.full_name;
    if (seen.has(key)) continue;
    seen.set(key, it);
    lines.push(`  ${String(it.stargazers_count).padStart(6)}★ ${it.full_name}  [${it.language || '-'}]  ${(it.description || '').slice(0, 120)}  updated=${(it.updated_at || '').slice(0, 10)}`);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

const text = lines.join('\n');
console.log(text);
fs.mkdirSync('data/_research', { recursive: true });
fs.writeFileSync('data/_research/github-translation-agents.txt', text, 'utf8');
console.log(`\n[${seen.size} unique repos -> data/_research/github-translation-agents.txt]`);
