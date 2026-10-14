// Fetch README (+ prompt files) of the most relevant translation-agent repos.
import fs from 'node:fs';

const REPOS = [
  'aws-samples/bedrock-translation-agent',
  'purecodework/bookllm',
  'hint-lab/deeptrans-studio',
  'LeslieLeung/universal-translator',
  '10div10/translation-agent-rag',
];

const H = { 'user-agent': 'Mozilla/5.0', accept: 'application/vnd.github+json' };
const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');
const out = [];

const get = async (url) => {
  const r = await fetch(url, { headers: H });
  if (!r.ok) return { status: r.status };
  return await r.json();
};

for (const repo of REPOS) {
  out.push(`\n${'='.repeat(78)}\n## ${repo}\n`);
  const info = await get(`https://api.github.com/repos/${repo}`);
  if (info.status) { out.push(`  (HTTP ${info.status})`); continue; }
  out.push(`stars=${info.stargazers_count}  lang=${info.language}  updated=${(info.updated_at || '').slice(0, 10)}`);
  out.push(`desc: ${info.description}`);

  const tree = await get(`https://api.github.com/repos/${repo}/git/trees/${info.default_branch}?recursive=1`);
  const files = (tree.tree || []).filter((t) => t.type === 'blob');
  out.push(`files=${files.length}`);
  const interesting = files.filter((f) => /(readme|prompt|architecture|glossary|reflect|review|polish|agent)/i.test(f.path) && /\.(md|txt|py|ts|js|json|yaml|yml|toml)$/i.test(f.path) && f.size < 60000);
  out.push('interesting files: ' + interesting.slice(0, 26).map((f) => f.path).join(', '));

  const readme = files.find((f) => /^readme\.md$/i.test(f.path)) || files.find((f) => /readme/i.test(f.path));
  if (readme) {
    const c = await get(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(readme.path)}`);
    if (c.content) out.push(`\n--- ${readme.path} (${c.size} bytes) ---\n` + b64(c.content).slice(0, 5200));
    await new Promise((r) => setTimeout(r, 600));
  }
  // pull one or two prompt-ish source files for the architecture detail
  for (const f of interesting.filter((x) => /prompt|reflect|agent/i.test(x.path)).slice(0, 2)) {
    const c = await get(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(f.path)}`);
    if (c.content) out.push(`\n--- ${f.path} (${c.size} bytes) ---\n` + b64(c.content).slice(0, 3000));
    await new Promise((r) => setTimeout(r, 600));
  }
  await new Promise((r) => setTimeout(r, 800));
}

const text = out.join('\n');
fs.mkdirSync('data/_research', { recursive: true });
fs.writeFileSync('data/_research/translation-agent-architectures.md', text, 'utf8');
console.log(`written ${text.length} bytes -> data/_research/translation-agent-architectures.md`);
