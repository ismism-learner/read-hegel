
==============================================================================
## aws-samples/bedrock-translation-agent

stars=20  lang=Python  updated=2025-09-22
desc: Multi-Model agentic & reflective translation workflow in Amazon Bedrock
files=16
interesting files: README.md, src/bedrock_translation_agent/__init__.py, src/bedrock_translation_agent/libs/__init__.py, src/bedrock_translation_agent/libs/bedrock.py, src/bedrock_translation_agent/libs/bedrock_model.py, src/bedrock_translation_agent/libs/multi_chunk_translation.py, src/bedrock_translation_agent/libs/one_chunk_translation.py, src/bedrock_translation_agent/libs/translation.py, src/bedrock_translation_agent/libs/utils.py

--- README.md (3409 bytes) ---
# Multi-Model agentic & reflective translation workflow in Amazon Bedrock

> Inspired by [andrewyng/translation-agent](https://github.com/andrewyng/translation-agent)，enabling it run in [Amazon Bedrock](https://aws.amazon.com/bedrock/)

A reflection agentic workflow for machine translation. The main step are:
1. Prompt an LLM to translation a text from `source_lang` to `target_lang`
2. Have the LLM reflect on the translation to come up with constructive suggestions for improving it;
3. Use the suggestions to improve the translation.

## Key features
With the support of Amazon Bedrock for multiple models, different models can be used in different steps to fully leverage the advantages of LLM.

## Getting Started

Following below steps to get started with `bedrock-translation-agent`: 

### Installation: 

- Local AWS cerdentials are required. In Amazon EC2, instance profile is the best option; and if in your local environment, your might need to configure the [configuration file](https://docs.aws.amazon.com/cli/v1/userguide/cli-configure-files.html) or [environment variables](https://docs.aws.amazon.com/cli/v1/userguide/cli-configure-envvars.html).

- Python package manage tool [Poetry](https://python-poetry.org/) is required, you can follow [the installation guide](https://python-poetry.org/docs/#installation) to install it. Depending on your local environment, this might work: 
```shell
curl -sSL https://install.python-poetry.org | python3 -
```

- After checking out the code, use Poetry to install dependencies:

```shell
poetry install
```

### Usage:

- Using default model:
```python
from bedrock_translation_agent.libs.translation import Translation

translation = Translation(
    source_text="Translation text here.",
    source_lang="English",
    target_lang="Chinese",
    country="China"
)

print(translation.translate())
```

- Using different models for each step:

>  The models supported in Amazon Bedrock are defined in`libs/bedrock_models.py`, and you can use the method `Translation.set_models` to declare the model for each step of translation.

**Note**: The code uses system_prompt and user_prompt. If the model you specified does not support system prompt, you need to modify the API parameters in `libs/bedrock.py`

```python
from bedrock_translation_agent.libs.bedrock_model import BedrockModel
from bedrock_translation_agent.libs.translation import Translation

translation = Translation(
    source_text=long_text,
    source_lang="English",
    target_lang="Chinese",
    country="China"
).set_models(
    init_model=BedrockModel.CLAUDE_3_SONNET_1_0,
    reflect_on_model=BedrockModel.CLAUDE_3_SONNET_1_0,
    improve_model=BedrockModel.CLAUDE_3_SONNET_1_0,
)

print(translation.translate())
```

## Related work

A few academic research groups are also starting to look at LLM-based and agentic translation. We think it’s early days for this field!
- *ChatGPT MT: Competitive for High- (but not Low-) Resource Languages*, Robinson et al. (2023), https://arxiv.org/pdf/2309.07423
- *How to Design Translation Prompts for ChatGPT: An Empirical Study*, Gao et al. (2023), https://arxiv.org/pdf/2304.02182v2
- *Beyond Human Translation: Harnessing Multi-Agent Collaboration for Translating Ultra-Long Literary Texts*, Wu et al. (2024),  https://arxiv.org/pdf/2405.11804


## License

This library is licensed under the MIT-0 License. See the LICENSE file.


==============================================================================
## purecodework/bookllm

stars=47  lang=TypeScript  updated=2026-10-10
desc: Translate books and documents with LLMs, featuring glossary extraction, review, and polishing pipelines.
files=252
interesting files: README.md, README_ZH.md, backend/src/review/review.module.ts, backend/src/review/review.service.spec.ts, backend/src/review/review.service.ts, backend/src/translation/glossary.service.spec.ts, backend/src/translation/glossary.service.ts, backend/src/translation/prompts/glossary-extraction.prompt.ts, backend/src/translation/prompts/index.ts, backend/src/translation/prompts/polish.prompt.ts, backend/src/translation/prompts/review.prompt.ts, backend/src/translation/prompts/translation.prompt.ts, backend/src/translation/translation-prompt.builder.spec.ts, backend/src/translation/translation-prompt.builder.ts

--- README.md (4940 bytes) ---
# BookLLM

<p align="center">
  <a href="README.md">
    <img src="https://img.shields.io/badge/lang-English-blue" alt="English" />
  </a>
  <a href="README_ZH.md">
    <img src="https://img.shields.io/badge/lang-%E4%B8%AD%E6%96%87-red" alt="中文" />
  </a>
  <a href="#license">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
  </a>
</p>

BookLLM is a self-hosted book translation app with glossary, review, and polish pipelines.

It supports OpenAI-compatible APIs and local LLM runtimes for long-form reading and iterative translation workflows.

Current language options support translation between Chinese, English, Japanese, Korean, French, German, Spanish, and Russian. Source language can also be set to auto-detect.

<p align="center">
  <img src=".github/assets/reader.png" alt="BookLLM Reader" width="780" />
</p>

<p align="center">
  <sub>Bilingual long-form reading with live translation output.</sub>
</p>

## Features

<table>
  <tr>
    <td width="33%" valign="top">
      <strong>OpenAI-compatible</strong><br />
      Works with OpenAI-compatible providers and runtimes, including OpenAI, DeepSeek, OpenRouter, Ollama, LM Studio, and OMLX.
    </td>
    <td width="33%" valign="top">
      <strong>Live Reader</strong><br />
      Stream translations directly into a bilingual long-form reading interface.
    </td>
    <td width="33%" valign="top">
      <strong>Multi-stage Pipeline</strong><br />
      Translate with optional glossary extraction, review, and polishing stages.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <strong>Sidekick Model</strong><br />
      Use Sidekick as an optional second model for review, polishing, or quality-focused stages.
    </td>
    <td width="33%" valign="top">
      <strong>Glossary Support</strong><br />
      Maintain per-page glossary context, with optional whole-book extraction.
    </td>
    <td width="33%" valign="top">
      <strong>PDF / OCR Support</strong><br />
      Extract text from PDFs and use bundled OCR for scanned pages.
    </td>
  </tr>
</table>

## Screenshots

<table>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/library.png" alt="BookLLM Library" width="100%" />
      <br />
      <strong>Library</strong>
      <br />
      <sub>Books, progress, and translation tasks.</sub>
    </td>
    <td width="50%" valign="top" align="center">
      <img src=".github/assets/pipeline.png" alt="BookLLM Translation Pipeline" width="100%" />
      <br />
      <strong>Translation Pipeline</strong>
      <br />
      <sub>Glossary, review, and polishing configuration.</sub>
    </td>
  </tr>
</table>

## Pipeline Cost Notice

> [!IMPORTANT]
>
> Enabling optional pipeline stages can significantly increase token usage, API cost, and processing time.
>
> These stages may improve translation quality, but the marginal gain is not always large enough to justify the extra cost and latency, especially for everyday translation tasks.
>
> Before using the full pipeline on a long document, test it on a short file or a small excerpt first. Compare output quality, latency, and token usage, then enable only the stages that clearly help your use case.

## Quick Start

Run BookLLM locally with Docker Compose. No `.env` file is required for single-machine use.

```bash
git clone https://github.com/purecodework/bookllm.git
cd BookLLM
docker compose up -d --build
```

Then open:

```text
http://localhost:3000
```

For later starts, use:

```bash
docker compose up -d
```

Rebuild only after source, dependency, or Dockerfile changes:

```bash
docker compose up -d --build
```

### Initial Setup

1. Open **Model Connection** from the sidebar.
2. Configure your OpenAI-compatible endpoint:
   - Base URL: an OpenAI-compatible <code>/v1</code> endpoint, such as <code>https://api.openai.com/v1</code>
   - For a host-local runtime such as Ollama, <code>http://localhost:11434/v1</code> is accepted; Docker deployments normalize it internally when needed
   - API key
   - Model
3. Optional: if you are using a hosted API provider instead of a local runtime, tune the input token budget and concurrency in **Settings** to improve throughput.
4. Upload an EPUB, PDF, or TXT file to begin translation.

## Architecture

```text
Next.js frontend
  -> NestJS API + SSE
     -> PostgreSQL: books, pages, settings, glossary/context, token usage
     -> Redis: BullMQ queues, job state, event fanout
     -> Translation workers: chunking, glossary/context, translation, review, polish, export
     -> FastAPI OCR service: PyMuPDF + Tesseract
     -> Local asset storage: originals, covers, extracted images
     -> OpenAI-compatible LLM endpoints: primary + optional Sidekick
```

## Known Limitations

- Token usage shown in the UI is approximate. Provider dashboards remain the billing source of truth.
- OCR does not preserve the original layout.

## License

MIT


--- backend/src/translation/prompts/glossary-extraction.prompt.ts (5364 bytes) ---
export const GLOSSARY_EXTRACTION_PROMPT = {
  bookContext: {
    intro: (targetLang: string) =>
      `You are building a structured book context package for a document to be translated into ${targetLang}.`,
    analysisScope:
      'Analyze only the section text below. It is one sequential section from a longer book.',
    extractScope:
      'Extract character names, place names, organization names, key domain-specific terms, protected source terms, forbidden translations, and a section summary when section metadata is provided.',
    fields: (targetLang: string) => [
      'Return one JSON object with:',
      '  - version: 2',
      '  - entries: array of {source,target,type,aliases,description}',
      `  - each target must be the correct ${targetLang} translation`,
      '  - type must be "character" | "place" | "org" | "term"',
      '  - aliases must include likely short forms used later, or []',
      '  - description must be one short sentence of context',
      '  - doNotTranslate: source terms that should normally remain unchanged',
      '  - forbiddenTranslations: array of {source,forbidden,prefer?}',
      '  - styleGuide: {}',
      '  - chapterSummaries: []',
      '  - sections: array of {id,chapterId?,title?,pageStart?,pageEnd?,summary} for the current section',
    ],
    rules: [
      'Rules:',
      '  - Prefer omission over false positives: when in doubt, skip the entry',
      '  - Do NOT extract common nouns, verbs, adjectives, or pronouns',
      '  - Do NOT extract entries already in the existing glossary (listed below)',
      '  - Use only this section context; do not invent full-book facts',
      '  - If text explicitly says a source term must not use a translation, put that translation in forbiddenTranslations',
      '  - Put short forms under aliases instead of creating duplicate entries',
      '  - Keep styleGuide as an empty object; style is handled later by the polish pipeline',
      '  - Keep chapterSummaries as an empty array; use sections for source-context summaries',
      '  - Always include one sections item for the current [SECTION] marker when present',
      '  - Keep each section summary under 50 words',
      '  - Return ONLY a valid JSON object, nothing else',
    ],
    existingGlossary: (keys: string[]) =>
      keys.length > 0
        ? `Existing glossary - skip these: ${keys.slice(0, 200).join(', ')}`
        : 'Existing glossary: (empty)',
    returnFormat:
      'Return format: {"version":2,"entries":[{"source":"...","target":"...","type":"character","aliases":["..."],"description":"..."}],"doNotTranslate":[],"forbiddenTranslations":[],"styleGuide":{},"chapterSummaries":[],"sections":[]}',
    fullTextHeader: 'Section text:',
    systemPrompt: 'You extract structured translation context. Return only a valid JSON object.',
  },
  page: {
    intro: (targetLang: string) =>
      `Extract proper nouns and key domain-specific terms from the source text and translate each into ${targetLang}.`,

--- backend/src/translation/prompts/index.ts (232 bytes) ---
export { TRANSLATION_PROMPT } from './translation.prompt';
export { GLOSSARY_EXTRACTION_PROMPT } from './glossary-extraction.prompt';
export { REVIEW_PROMPT } from './review.prompt';
export { POLISH_PROMPT } from './polish.prompt';


==============================================================================
## hint-lab/deeptrans-studio

stars=177  lang=TypeScript  updated=2026-09-14
desc: DeepTrans Studio is a multi-agent intelligent translation platform for professional localization teams. It unifies a translation IDE, terminology and translation memory, AI‑assisted quality evaluation, and workflow automation, delivering end‑to‑end project management from document parsing and segment editing to collaboration and final delivery. 
files=956
interesting files: README.md, README_ZH.md, pdfMath/README.md, src/actions/document-preview.contract.test.ts, src/actions/workflow-prompt-boundary.test.ts, src/actions/workflow-prompts.ts, src/agents/base.ts, src/agents/i18n.ts, src/agents/index.ts, src/agents/postedit/DiscourseEmbedAgent.ts, src/agents/postedit/DiscourseEvaluateAgent.ts, src/agents/postedit/DiscourseQueryAgent.test.ts, src/agents/postedit/DiscourseQueryAgent.ts, src/agents/pre-translate/DictLookupAgent.ts, src/agents/pre-translate/MonoTermExtractAgent.ts, src/agents/pre-translate/TermEmbedTranslateAgent.ts, src/agents/preprocess/DocumentTermExtractAgent.ts, src/agents/preprocess/DocumentTermTranslateAgent.ts, src/agents/preprocess/document-term-agents.test.ts, src/agents/qa/SyntaxAdviceEmbedAgent.ts, src/agents/qa/SyntaxEvaluateAgent.ts, src/agents/qa/SyntaxMarkerExtractAgent.ts, src/agents/tools/dictionary.ts, src/agents/tools/index.ts, src/agents/tools/memory.test.ts, src/agents/tools/memory.ts

--- README.md (21366 bytes) ---
<div align="center">
  <img src="public/logo.svg" alt="DeepTrans Studio" width="240" height="240">
  
  <!-- # DeepTrans Studio -->
  
  ### Professional AI-Powered Translation Workbench
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=nextdotjs)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.1-149eca?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-6.1-2D3748?logo=prisma)](https://prisma.io/)
  [![Version](https://img.shields.io/badge/version-0.6.0-6d28d9)](CHANGELOG.md)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  
  [English](#) | [中文](./README_ZH.md)
  
</div>

---

## 🌟 Overview

**DeepTrans Studio** is an enterprise-grade translation platform that combines AI-powered translation, localization engineering, and team collaboration capabilities. Built for professional translators and localization teams, it provides comprehensive end-to-end translation workflow management.

<div align="center">
  <img src="public/ui.png" alt="DeepTrans Studio Interface" width="900">
  <br/>
  <em>DeepTrans Studio User Interface</em>
</div>

## 📝 Citation

DeepTrans Studio and its document translation stack are described in our ACL '26 System Demonstrations and CSCW '26 Companion Demo papers. If you use this project in academic work, please cite:

> Yang Qi, Xiangyao Ma, Xiao Wang, Hao Wang, and Rui Wang. 2026. [BabelDOC: Better Layout-Preserving PDF Translation via Intermediate Representation](https://aclanthology.org/2026.acl-demo.25/). In _Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 3: System Demonstrations)_, pages 253-262, San Diego, California, United States. Association for Computational Linguistics.

> Ziyang Lian, Qingya Zhang, Hao Wang, Huiwen Xiong, Qi Yang, Lingyi Meng, Xiaoyi Gu, and Rui Wang. 2026. DeepTrans Studio: Turning Expert Interventions into Shared Team Knowledge in Agentic Translation Workflows. In _Proceedings of Companion of the 2026 Computer-Supported Cooperative Work and Social Computing (CSCW '26 Demo, CCF-A)_. ACM, New York, NY, USA, 4 pages. DOI forthcoming.

```bibtex
@inproceedings{qi-etal-2026-babeldoc,
  title = {{B}abel{DOC}: Better Layout-Preserving {PDF} Translation via Intermediate Representation},
  author = {Qi, Yang and Ma, Xiangyao and Wang, Xiao and Wang, Hao and Wang, Rui},
  editor = {Durrett, Greg and Jian, Ping},
  booktitle = {Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (Volume 3: System Demonstrations)},
  month = jul,
  year = {2026},
  address = {San Diego, California, United States},
  publisher = {Association for Computational Linguistics},
  url = {https://aclanthology.org/2026.acl-demo.25/},
  pages = {253--262},
  ISBN = {979-8-89176-392-0}
}

@inproceedings{lian2026deeptrans,
  title = {DeepTrans Studio: Turning Expert Interventions into Shared Team Knowledge in Agentic Translation Workflows},
  author = {Lian, Ziyang and Zhang, Qingya and Wang, Hao and Xiong, Huiwen and Yang, Qi and Meng, Lingyi and Gu, Xiaoyi and Wang, Rui},
  booktitle = {Proceedings of Companion of the 2026 Computer-Supported Cooperative Work and Social Computing (CSCW '26)},
  publisher = {ACM},
  address = {New York, NY, USA},
  year = {2026},
  pages = {4},
  note = {Demo paper; DOI forthcoming}
}
```

## ✨ Key Features

### 🎯 Translation IDE

- **Intelligent Editor**: Segment-aligned parallel editing with version control and keyboard shortcuts
- **Multi-Agent Collaboration**: Coordinate multiple AI agents for complex translation tasks
- **Real-time Preview**: Instant document preview with formatting preservation

### 🤖 AI-Powered Translation

- **Multi-Engine Support**: Integration with OpenAI and custom AI models
- **Terminology Extraction**: Automated domain-specific term extraction
- **Quality Assessment**: AI-driven grammar, syntax, and discourse evaluation
- **Translation Memory**: Vector search with pgvector and CJK keyword search with PGroonga

### 📚 Knowledge Management

- **Project Dictionaries**: Project-specific terminology databases
- **Translation Memory**: Import/export translation memory in TMX, CSV, XLSX formats
- **Semantic Search**: Vector similarity search powered by pgvector, with PGroonga keyword retrieval

### 🔄 Workflow Automation

- **Queue-Based Processing**: BullMQ-driven asynchronous task processing
- **Batch Operations**: Bulk translation, evaluation, and quality checks
- **Document Parsing**: DOCX, PDF, TXT, and Markdown parsing with MinerU online PDF parsing
- **Status Tracking**: Complete translation lifecycle management

### 🔌 Extensibility

- **Open Architecture**: Modular design with PostgreSQL, Valkey, and pluggable object storage
- **API Gateway**: RESTful APIs for external integration
- **Custom Agents**: Extensible AI agent framework
- **Plugin System**: Support for custom translation engines and processing pipelines

## 🏗️ Architecture

DeepTrans Studio adopts a modern full-stack architect

--- src/actions/workflow-prompt-boundary.test.ts (1553 bytes) ---
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const readAction = (filename: string) =>
    readFileSync(resolve(process.cwd(), 'src/actions', filename), 'utf8');

const preTranslate = readAction('pre-translate.ts');
const qualityAssure = readAction('quality-assure.ts');
const postedit = readAction('postedit.ts');

test('workflow actions do not merge a client options.prompt into a stored personal prompt', () => {
    for (const source of [preTranslate, qualityAssure, postedit]) {
        assert.doesNotMatch(source, /resolveWorkflowPrompt\([\s\S]{0,180}options\?\.prompt/);
        assert.doesNotMatch(source, /prompt:\s*options\?\.prompt/);
    }

    assert.match(preTranslate, /omitClientWorkflowPrompt\(options\)/);
    assert.match(qualityAssure, /omitClientWorkflowPrompt\(options\)/);
    assert.match(postedit, /omitClientWorkflowPrompt\(options\)/);
});

test('the instant-translate style remains a bounded server-derived instruction', () => {
    assert.match(preTranslate, /resolveTranslationStyleInstruction\(style\)/);
    const instantTranslate = readFileSync(
        resolve(process.cwd(), 'src/app/(app)/dashboard/instant-translate/page.tsx'),
        'utf8'
    );
    assert.match(instantTranslate, /\{ style \}/);
    assert.match(
        instantTranslate,
        /const style = translationStyle|\{ style: translationStyle \}/
    );
    assert.doesNotMatch(instantTranslate, /prompt:\s*`使用\$\{.*?\}风格翻译`/);
});


--- src/actions/workflow-prompts.ts (1964 bytes) ---
'use server';

import { requireUser } from '@/lib/guards';
import {
    isWorkflowPromptKey,
    parseWorkflowPromptSaveInput,
    type WorkflowPromptKey,
} from '@/lib/workflow-prompt-keys';
import { prisma } from '@/lib/db';
import { listWorkflowPromptSettings } from '@/server/workflow-prompts';

function requirePromptKey(value: unknown): WorkflowPromptKey {
    if (!isWorkflowPromptKey(value)) throw new Error('Prompt 配置无效');
    return value;
}

export async function listWorkflowPromptSettingsAction(locale?: string) {
    const authCtx = await requireUser();
    return listWorkflowPromptSettings(authCtx, locale);
}

export async function saveWorkflowPromptAction(input: {
    nodeKey: string;
    content: string;
    enabled: boolean;
}) {
    const authCtx = await requireUser();
    const parsed = parseWorkflowPromptSaveInput(input);
    if (!parsed.ok) throw new Error('Prompt 配置无效');
    const { nodeKey, content, enabled } = parsed.value;
    if (!content) {
        await prisma.userWorkflowPrompt.deleteMany({
            where: { userId: authCtx.userId, nodeKey },
        });
        return { nodeKey, content: '', enabled: true, version: 0, customized: false };
    }

    const row = await prisma.userWorkflowPrompt.upsert({
        where: { userId_nodeKey: { userId: authCtx.userId, nodeKey } },
        create: { userId: authCtx.userId, nodeKey, content, enabled },
        update: { content, enabled, version: { increment: 1 } },
        select: { nodeKey: true, content: true, enabled: true, version: true },
    });
    return { ...row, customized: true };
}

export async function resetWorkflowPromptAction(nodeKeyInput: string) {
    const authCtx = await requireUser();
    const nodeKey = requirePromptKey(nodeKeyInput);
    await prisma.userWorkflowPrompt.deleteMany({
        where: { userId: authCtx.userId, nodeKey },
    });
    return { nodeKey, content: '', enabled: true, version: 0, customized: false };
}


==============================================================================
## LeslieLeung/universal-translator

stars=11  lang=Python  updated=2026-07-09
desc: Agentic translation using reflection workflow, refactored and sugared.
files=27
interesting files: README.md, README_zh.md, universal_translator/translate/glossary.py, universal_translator/translate/prompt.py

--- README.md (3773 bytes) ---
# Universal Translator

English | [简体中文](README_zh.md)

Agentic translation using reflection workflow, refactored and sugared.

## Features

- Agentic translation w/ reflection workflow, as purposed in [translation-agent](https://github.com/andrewyng/translation-agent)
- Refactored for better readability and maintainability
- Add concurrency for better performance
- Add usage tracking for better cost control
- Sugared interface for easy usage
- Support for glossary, and additional instructions for translation
- Support for other LLMs(OpenAI, Anthropic, Anthropic Bedrock, more to come)

## Quick Start

You can checkout the [example](examples/) for a quick start.

To run the example, you need to have an OpenAI API key, and a `.env` file in the root directory of the project with the following content:

```
OPENAI_API_KEY=<your_openai_api_key>
```

Prepare the environment using [poetry](https://python-poetry.org/):

```bash
poetry install
```

Then you can run the example using the following command:

```bash
python examples/translate_openai.py
```

## Usage

```python
from universal_translator.llm.openai import OpenAI
from universal_translator.translate.translation import UniversalTranslator

# initilize the LLM provider
provider = OpenAI(api_key=openai_api_key, model="gpt-4o")
# initialize the translator
translator = UniversalTranslator(
    source_language="en", # or English
    target_language="fr", # or French
    llm_provider=provider,
    country="France",
)
# translate the text
translated_text = translator.translate(text)
```

## Advanced Usage

### Set Model And Temperature

```python
# OpenAI
provider = OpenAI(api_key=openai_api_key, model="gpt-4o", temperature=0.3)
# Anthropic
provider = Anthropic(api_key=anthropic_api_key, model="claude-3-5-sonnet-20240620", temperature=0.3)
# Anthropic Bedrock
provider = AnthropicBedrock(access_key=access_key, secret_access_key=secret_access_key, model="anthropic.claude-3-5-sonnet-20240620-v1:0", temperature=0.3)
```

### Concurrency

You can set the maximum number of concurrent requests to the LLM provider. A proper parallelization of requests can significantly improve the performance of long texts translation.

However, you should not set it too high, otherwise, you may encounter rate limit issues from the LLM provider.

```python
translator = UniversalTranslator(
        source_language="en",
        target_language="fr",
        llm_provider=provider,
        country="France",
        max_concurrent_requests=10, # default is 5
    )
```

### Usage Tracking

```python
# translate something
translator.translate(text)
# get usage
usage = translator.usage
# Usage: {'gpt-4o': Usage(total_tokens=1148, prompt_tokens=1034, completion_tokens=114)}
```

### Glossary

You can add glossary to help LLM keep a consistent translation for some specific words or phrases.

```python
translator = UniversalTranslator(
    source_language="en",
    target_language="fr",
    llm_provider=provider,
    country="France",
    glossary=[
        {"source": "hello", "target": "bonjour", "notes": "A common greeting"},
        {"source": "world", "target": "le monde"},
    ],
)
```

### Extra Instructions

You can add extra instructions to help LLM with the translation.

```python
translator = UniversalTranslator(
    source_language="en",
    target_language="fr",
    llm_provider=provider,
    country="France",
    extra_instructions="Use third person perspective."
)
```

## Credits

Inspired by [translation-agent](https://github.com/andrewyng/translation-agent). The core code of this project is refactored from a cramped utils.py to improve readability and maintainability. Additionally, it adds support for glossaries, additional instructions, and future support for other LLMs.

--- universal_translator/translate/prompt.py (5966 bytes) ---
# Step 1: Initial Translation
PROMPT_INITIAL_TRANSLATION_SYSTEM = (
    "You are an expert linguist, specializing in translation from {source_lang} to {target_lang}."
)
PROMPT_INITIAL_TRANSLATION = """Your task is to provide a professional translation from {source_lang} to {target_lang} of PART of a text.

The source text is below, delimited by XML tags <SOURCE_TEXT> and </SOURCE_TEXT>. Translate only the part within the source text delimited by <TRANSLATE_THIS> and </TRANSLATE_THIS>. You can use the rest of the source text as context, but do not translate any of the other text. Consider the glossary delimited by <GLOSSARY> and </GLOSSARY>. Also, pay attention to the extra instructions delimited by <INSTRUCTION> and </INSTRUCTION>.
Do not output anything other than the translation of the indicated part of the text. Do not include any XML tags in your output.

<SOURCE_TEXT>
{tagged_text}
</SOURCE_TEXT>

<GLOSSARY>
{glossary}
</GLOSSARY>

<INSTRUCTION>
{extra_instructions}
</INSTRUCTION>

To reiterate, you should translate only this part of the text, shown here again between <TRANSLATE_THIS> and </TRANSLATE_THIS>:
<TRANSLATE_THIS>
{chunk_to_translate}
</TRANSLATE_THIS>

Output only the translation of the portion you are asked to translate, and nothing else."""

# Step 2: Reflection on Translation
PROMPT_REFLECT_ON_TRANSLATION_SYSTEM = "You are an expert linguist specializing in translation from {source_lang} to {target_lang}. \
You will be provided with a source text and its translation and your goal is to improve the translation."
PROMPT_REFLECT_ON_TRANSLATION = """Your task is to carefully read a source text and part of a translation of that text from {source_lang} to {target_lang}, and then give constructive criticism and helpful suggestions for improving the translation.
The final style and tone of the translation should match the style of {target_lang} colloquially spoken in {country}.

The source text is below, delimited by XML tags <SOURCE_TEXT> and </SOURCE_TEXT>, and the part that has been translated is delimited by <TRANSLATE_THIS> and </TRANSLATE_THIS> within the source text. Consider the glossary delimited by <GLOSSARY> and </GLOSSARY>. Also, pay attention to the extra instructions delimited by <INSTRUCTION> and </INSTRUCTION>.
You can use the rest of the source text as context for critiquing the translated part.

<SOURCE_TEXT>
{tagged_text}
</SOURCE_TEXT>

<GLOSSARY>
{glossary}
</GLOSSARY>

<INSTRUCTION>
{extra_instructions}
</INSTRUCTION>

To reiterate, only part of the text is being translated, shown here again between <TRANSLATE_THIS> and </TRANSLATE_THIS>:
<TRANSLATE_THIS>
{chunk_to_translate}
</TRANSLATE_THIS>

The translation of the indicated part, delimited below by <TRANSLATION> and </TRANSLATION>, is as follows:
<TRANSLATION>
{translation_1_chunk}
</TRANSLATION>

When writing suggestions, pay attention to whether there are ways to improve the translation's:
(i) accuracy (by correcting errors of addition, mistranslation, omissi

==============================================================================
## 10div10/translation-agent-rag

stars=4  lang=Python  updated=2026-08-18
desc: Multi-DB RAG translation agent — FAISS translation memory, glossary, and ChromaDB style retrieval, orchestrated with a LangGraph router/critic loop.  ENGLISH - SPANISH - FRENCH
files=20
interesting files: README.md, agents/critic.py, agents/retrieval.py, agents/router.py, agents/translator.py, dbs/glossary/glossary_store.py

--- README.md (5781 bytes) ---
<div align="center">

# 🌐 Multi-DB Translation Agent

**An agentic RAG translation assistant that routes each request across three specialized vector/data stores — instead of dumping everything into one index.**

[![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=lightning&logoColor=white)](https://console.groq.com)
[![FAISS](https://img.shields.io/badge/FAISS-4267B2?style=for-the-badge&logo=meta&logoColor=white)](https://github.com/facebookresearch/faiss)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6F00?style=for-the-badge&logo=databricks&logoColor=white)](https://www.trychroma.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

[![Tests](https://img.shields.io/badge/tests-passing-2ECC71?style=flat-square&logo=pytest&logoColor=white)](./eval/test_dbs.py)
[![License](https://img.shields.io/badge/license-MIT-9B59B6?style=flat-square)](./LICENSE)
[![Free Tier Only](https://img.shields.io/badge/cost-100%25%20free-00C853?style=flat-square&logo=googledocs&logoColor=white)](#setup-all-free-tools--no-paid-services)

</div>

---

## 🧭 Architecture

```
User Input (text, src_lang, tgt_lang, domain)
        │
        ▼
   🤖 Router Agent  ── decides which DBs are worth querying
        │
   ┌────┼──────────────┬───────────────┐
   ▼                   ▼               ▼
🗂️ Translation Memory  📖 Glossary DB   🎨 Style DB
  (FAISS IVF-PQ)        (FAISS flat)    (ChromaDB)
   │                   │               │
   └───────────┬────────┴───────────────┘
               ▼
        🔤 Translator Agent (Groq / Llama 3.3 70B)
               ▼
        🧐 Critic Agent ── checks glossary terms used, tone matches
               │
        retry ─┴─ approve → ✅ Final translation + retrieval trace
```

### 🎯 Why three separate DBs

| DB | Problem it solves | Storage | Why this index |
|---|---|---|---|
| 🗂️ **Translation Memory** | "Has this been translated before?" | FAISS IVF-PQ (falls back to flat under ~2000 vectors) | Grows unbounded over time — PQ compression keeps it small (~190x smaller than flat) |
| 📖 **Glossary** | "How should this specific term be translated?" | FAISS flat + keyword prefilter | Small, static, needs exact recall — compression would only hurt here |
| 🎨 **Style Examples** | "What tone/register does this domain expect?" | ChromaDB (embedded, no server) | Small and simple — avoids running a DB server for a tiny collection |

Mixing all of this into one index would blend translation-memory hits with random style examples on every query, diluting relevance. The router agent decides **per-request** which stores are actually relevant, which also keeps latency and API cost down — most short/simple inputs skip retrieval entirely.

---

## ⚙️ Setup (all free tools — no paid services)

```bash
git clone https://github.com/10div10/translation-agent.git
cd translation-agent

python3.11 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# edit .env and add a free Groq API key from https://console.groq.com

python -m dbs.seed_all         # populates all 3 DBs with sample data
streamlit run app.py
```

Open in VS Code: `code .` — the repo includes no local model weights, so it's light to clone; embeddings (BGE-small) download once via `sentence-transformers` and cache locally.

---

## 🧪 Running tests

```bash
pytest eval/test_dbs.py -v
```

These tests cover the DB layer only (no Groq API key required), which is why CI can run them on every push for free. Agent/graph-level tests that call the LLM are intentionally kept separate.

---

## ⚠️ Known limitations

- 📉 **IVF-PQ recall** drops noticeably below ~2000 translation-memory vectors, which is why the store falls back to a flat index until it has enough data to train stable clusters. If you seed a large real corpus, recall should be evaluated (see `eval/`) before trusting IVF-PQ results.
- 🔍 **Glossary term matching** on the critic side is currently a simple substring check, so paraphrased translations may cause false-positive "missing term" retries.
- 🔁 **No true multi-hop reasoning** — the graph is a fixed pipeline (router → retrieve → translate → critique) with a bounded retry loop, not a fully autonomous agent that replans.
- 🌍 Currently scoped to **en/fr/es** for the seed data; adding language pairs just means adding rows to `dbs/seed_all.py`, no code changes needed.

---

## 🧱 Stack

<div align="left">

![LangGraph](https://img.shields.io/badge/-LangGraph-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![Groq](https://img.shields.io/badge/-Groq%20(Llama%203.3%2070B)-F55036?style=flat-square&logo=lightning&logoColor=white)
![FAISS](https://img.shields.io/badge/-FAISS-4267B2?style=flat-square&logo=meta&logoColor=white)
![ChromaDB](https://img.shields.i

--- agents/critic.py (2259 bytes) ---
"""
Critic Agent — checks the translation against the retrieved context (glossary
terms used correctly, TM reused when available) and either approves it or
sends it back to the translator with feedback, same Critic-Writer loop
pattern as the resume generator project.
"""
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, MAX_CRITIC_RETRIES

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def critique(state):
    ctx = state["retrieved_context"]
    translation = state["translation"]

    # Fast deterministic checks first (cheap, no LLM call needed)
    missing_terms = [
        t["term"] for t in ctx["glossary_terms"]
        if t["translation"].split(" (")[0].lower() not in translation.lower()
    ]
    if missing_terms and state.get("retry_count", 0) < MAX_CRITIC_RETRIES:
        state["critic_feedback"] = f"Missing required glossary term(s): {', '.join(missing_terms)}"
        state["critic_approved"] = False
        state["retry_count"] = state.get("retry_count", 0) + 1
        return state

    # LLM-based check for tone/meaning only if there's a style example to check against
    if ctx["style_examples"] and state.get("retry_count", 0) < MAX_CRITIC_RETRIES:
        example = ctx["style_examples"][0]["text"]
        prompt = (
            f"Reference tone example: \"{example}\"\n"
            f"Translation to check: \"{translation}\"\n\n"
            "Does the translation roughly match this tone/register (formal vs casual)? "
            "Reply with exactly one word: YES or NO."
        )
        resp = _get_client().chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5,
        )
        verdict = resp.choices[0].message.content.strip().upper()
        if "NO" in verdict:
            state["critic_feedback"] = "Tone/register doesn't match the expected style example."
            state["critic_approved"] = False
            state["retry_count"] = state.get("retry_count", 0) + 1
            return state

    state["critic_approved"] = True
    state["critic_feedback"] = None
    return state


--- agents/retrieval.py (789 bytes) ---
"""
Retrieval node — queries only the DBs the router flagged, and merges results
into a single context block for the translator agent.
"""
from dbs.translation_memory import tm_store
from dbs.style_examples import style_store


def retrieve(state):
    decision = state["routing_decision"]
    text = state["source_text"]
    domain = state.get("domain")

    context = {"tm_match": None, "glossary_terms": [], "style_examples": []}

    if decision["use_tm"]:
        context["tm_match"] = tm_store.query(text)

    if decision["use_glossary"]:
        context["glossary_terms"] = decision.get("_glossary_hits", [])

    if decision["use_style"]:
        context["style_examples"] = style_store.find_style(text, domain=domain)

    state["retrieved_context"] = context
    return state
