// Fetch BookLLM's prompt modules — the concrete implementation of glossary→translate→review→polish.
import fs from 'node:fs';

const FILES = [
  'backend/src/translation/prompts/glossary-extraction.prompt.ts',
  'backend/src/translation/prompts/translation.prompt.ts',
  'backend/src/translation/prompts/review.prompt.ts',
  'backend/src/translation/prompts/polish.prompt.ts',
  'backend/src/translation/translation-prompt.builder.ts',
  'backend/src/translation/glossary.service.ts',
  'backend/src/review/review.service.ts',
];

const H = { 'user-agent': 'Mozilla/5.0', accept: 'application/vnd.github+json' };
const parts = [];
for (const f of FILES) {
  try {
    const r = await fetch(`https://api.github.com/repos/purecodework/bookllm/contents/${encodeURIComponent(f)}`, { headers: H });
    if (!r.ok) { parts.push(`\n### ${f}  -> HTTP ${r.status}`); continue; }
    const j = await r.json();
    const txt = Buffer.from(j.content, 'base64').toString('utf8');
    parts.push(`\n${'='.repeat(76)}\n### ${f}  (${j.size} bytes)\n${txt.slice(0, 7000)}`);
  } catch (e) { parts.push(`\n### ${f} -> ${e.message}`); }
  await new Promise((r) => setTimeout(r, 500));
}
const text = parts.join('\n');
fs.writeFileSync('data/_research/bookllm-prompts.md', text, 'utf8');
console.log(`written ${text.length} bytes -> data/_research/bookllm-prompts.md`);
