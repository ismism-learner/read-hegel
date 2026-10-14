# workflow 工具脚本模板（复制到会话里用）

本项目用 DSH 的 `workflow` 工具并行派发子代理。脚本**不落盘执行**——把它作为 `script` 参数传给
`workflow` 工具即可。下面四段是实际在用的版本，按需替换 `args`。

**子代理并发上限 8，故每批 6 个**（`batch: 6`）。`run_in_background: true` 让它后台跑，
完成后会收到通知；期间可以干别的活。

---

## 1. 翻译一批单元（最常用）

调用参数示例：`{"batch": 6, "ids": ["w3-12-0", "w3-12-5", ...]}`

```js
const ids = args.ids;
const BATCH = args.batch || 6;

const TRANSLATE = (id) => `Workspace root: E:\\文字稿优化\\读黑学

Translate one work unit of Hegel's German into Chinese, for a private trilingual reader.

INPUT : data/_jobs/${id}.in.json   (read it first)
OUTPUT: its "outFile" field
VOLUME: the unit id begins with the volume id ("w3-12-5" → volume w3). Read
        data/_jobs/context-<volume>.json and follow ALL of its styleGuide rules, entries and
        forbidden pairs.

AUTHORITY ORDER (do not invert it): the user's word-family/terminology policy is supreme; the
volume termbase refines it; the shared glossary comes third; conventional renderings, other Chinese
translations and reviewers' opinions are reference only — they must never justify changing a policy
rendering.

WORD-FAMILY POLICY (mandatory): one German root keeps one Chinese root.
  Idee / ideal / Idealität / Idealismus / idealistisch / das Ideelle → 观念（观念、观念性、观念论、观念物）
       never 唯心主义 / 唯心的 / 唯心性, never 理念 — book and school names included.
  Realität / real / Realismus / das Reelle → 实在（实在性、实在论、实在物）
  Begriff / begreifen → 概念;  Vorstellung / vorgestellt → 表象（never 观念）
  Geist → 精神;  Wissen → 知/知识;  Wahrheit/wahr → 真理/真的;  Wirklichkeit/wirklich → 现实性/现实的
  Erscheinung → 现象;  Schein → 假象;  Gestalt des Bewußtseins → 意识的形态 (NOT 意识形态)
  Ansichsein → 自在存在;  Insichsein → 自身内存在;  Reflexion → 反思;  Tun → 行动 (not 作为)
  Mirrored pairs stay mirrored: 观念性/实在性, 观念论/实在论, 观念物/实在物.

Method — two explicit steps: German → English sentence by sentence, then English → Chinese
sentence by sentence.

CRITICAL: one German sentence = exactly ONE Chinese sentence (the array length must equal the
number of German sentences; a mismatch rejects the whole block). Keep every long sentence as ONE
Chinese sentence with the same punctuation hierarchy — never split it, never merge two. Plain
modern 白话, no 论文腔.

For every block in the input:
  • k="h": { "h": <copy the block's "hash" BYTE-FOR-BYTE>, "en": "<English heading>", "zh": "<中文标题>" }
  • k="p": { "h": <copy the block's "hash" BYTE-FOR-BYTE>, "en": [...], "zh": [...] }
    with EXACTLY one entry per German sentence in "sents".
  The "h" field is a checksum: copy it exactly, never translate it, never leave it empty.

Never drop a negation, a passive or half a sentence; never translate a relative clause twice;
never invent terms. Do not invent text that is not in the German; fragments stay fragments.

Write the output file with the write tool as UTF-8 JSON (no BOM):
{ "unit": "${id}", "stage": "draft", "blocks": { "9": { "h": "...", "en": [...], "zh": [...] }, ... } }
Report blocks and sentences translated.`;

const OUT_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, unit: { type: 'string' }, blocks: { type: 'integer' }, sentences: { type: 'integer' } },
  required: ['ok', 'unit'], additionalProperties: false,
};

const groups = [];
for (let i = 0; i < ids.length; i += BATCH) groups.push(ids.slice(i, i + BATCH));
const results = [];
for (let g = 0; g < groups.length; g++) {
  phase(`batch ${g + 1}/${groups.length}`);
  const res = await parallel(groups[g].map((id) => async () =>
    agent(TRANSLATE(id), { label: `translate ${id}`, phase: 'translate', schema: OUT_SCHEMA })));
  results.push(...res.filter(Boolean));
  log(`batch ${g + 1}: ${res.filter((r) => r && r.ok).length}/${groups[g].length} ok`);
}
return { units: ids.length, ok: results.filter((r) => r.ok).length, sentences: results.reduce((a, r) => a + (r.sentences || 0), 0) };
```

---

## 2. 建卷级上下文包（每卷一次，**开新卷前必做**）

调用参数示例：`{"volume": "w4"}`

```js
const VOL = args.volume || 'w4';
phase('context');
const ctx = await agent(`Workspace root: E:\\文字稿优化\\读黑学

Build the shared CONTEXT PACKAGE for translating volume ${VOL} of Hegel's Werke into Chinese.
This package is the single authority on terminology for every translator working on that volume.

1. Look at the German with pwsh, e.g.
   node scripts/dump.mjs --vol ${VOL} --chunk 0 --from 0 --to 25
   and read glossary/hegel_glossar.csv plus glossary/hegel_families.csv.
2. Write data/_jobs/context-${VOL}.json:
   { "volume": "${VOL}",
     "styleGuide": [ ... ],
     "entries": [ { "source": "...", "en": "...", "zh": "...", "type": "term|person|place|work", "note": "..." } ],
     "forbidden": [ { "source": "...", "forbidden": "...", "prefer": "...", "why": "..." } ],
     "doNotTranslate": [ ... ] }
   MANDATORY style rules: 权威顺序（用户政策最高，通行译名仅供参考）；词根一致（Idee→观念…）；
   对偶成对；长句保留为一整句且保持标点层级；用白话不用论文腔；不增不删；不造生词；一个术语只一个译名。
   60–140 real terms. Prefer omission over a doubtful entry.
3. Append the same entries as CSV rows to data/_jobs/ctx-${VOL}.glossar.csv
   (header de,en,zh,status,note; status ok only when confident).
Report how many entries and forbidden pairs you produced.`,
  { label: `context ${VOL}`, phase: 'context', schema: {
    type: 'object',
    properties: { ok: { type: 'boolean' }, entries: { type: 'integer' }, forbidden: { type: 'integer' } },
    required: ['ok', 'entries'], additionalProperties: false,
  } });
return { volume: VOL, entries: ctx?.entries || 0, forbidden: ctx?.forbidden || 0 };
```

建好后**务必**跑：`normalize-context.mjs --apply` → `push-authority-order.mjs` → `push-family-policy.mjs`
→ `push-reader-rules.mjs` → `check-policy.mjs`（见 `docs/交接说明-HANDOVER.md` 第五节第 2 条）。

---

## 3. 逐章保守审校

先 `node scripts/make-review-jobs.mjs --vol w3 --chunk 7 --size 30` 生成 `rev-*` 任务，
再用下面脚本派发（调用参数：`{"batches": ["rev-w3-7-01", ...], "chapter": "…", "group": 6}`）。

```js
const ids = args.batches;
const GROUP = args.group || 6;
const CHAPTER = args.chapter || '';

const PROMPT = (id) => `Workspace root: E:\\文字稿优化\\读黑学

You are a CONSERVATIVE bilingual translation reviewer (German → Chinese) for Hegel's
Phänomenologie des Geistes${CHAPTER ? ` (chapter: ${CHAPTER})` : ''}. This is a QA correction pass,
not a retranslation and not a style rewrite.

1. Read data/_jobs/${id}.in.json (items: vol, chunk, bi, si, de, en, zh).
2. Read data/_jobs/context-w3.json and apply its policy (the user's word-family policy is supreme).
3. Fix ONLY clear defects: mistranslation (subject/object, pronouns, negation, modality, time order),
   omission/addition, untranslated German, terminology/forbidden violations, unreadable machine style.
   Change NOTHING else — do not make it more literary, do not smooth Hegel's roughness, do not split
   or merge sentences.
4. No clear defect ⇒ return the sentence unchanged. When in doubt, leave it alone.
5. Write data/_jobs/${id}.out.json: { "id": "${id}", "items": [ { "vol", "chunk", "bi", "si", "zh" }, ... ] }
Report how many items you changed and list each as "bi.si: old → new".`;

const OUT_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, id: { type: 'string' }, items: { type: 'integer' }, changed: { type: 'integer' } },
  required: ['ok', 'id'], additionalProperties: false,
};
const groups = [];
for (let i = 0; i < ids.length; i += GROUP) groups.push(ids.slice(i, i + GROUP));
const all = [];
for (let g = 0; g < groups.length; g++) {
  const res = await parallel(groups[g].map((id) => async () =>
    agent(PROMPT(id), { label: `review ${id}`, phase: 'review', schema: OUT_SCHEMA })));
  all.push(...res.filter(Boolean));
}
return { ok: all.filter((r) => r.ok).length, items: all.reduce((a, r) => a + (r.items || 0), 0), changed: all.reduce((a, r) => a + (r.changed || 0), 0) };
```

审校后：`apply-review-patches.mjs --apply` → **归档补丁** → `show-review-diff.mjs` 逐条回查德文。

---

## 4. 词族修复

先 `node scripts/make-family-jobs.mjs --size 30`，再派发（参数：`{"batches": ["family-01", ...]}`）。
脚本正文与 §3 同构，只是提示词换成"只改词族渲染、其余一字不动"，输出写到 `data/_jobs/<id>.out.json`，
再由 `apply-family-patches.mjs --apply` 回填。
