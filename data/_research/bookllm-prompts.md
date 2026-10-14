
============================================================================
### backend/src/translation/prompts/glossary-extraction.prompt.ts  (5364 bytes)
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
    rules: [
      'Classify each as one of: "character" | "place" | "org" | "term"',
      'Return ONLY a JSON object. Example: {"version":2,"entries":[{"source":"Alice","target":"<translation>","type":"character","aliases":[],"description":"person"}],"doNotTranslate":[],"forbiddenTranslations":[],"styleGuide":{},"chapterSummaries":[],"sections":[]}',
      'If no proper nouns are found, return the same object with empty arrays.',
      'Rules:',
      '- Prefer omission over false positives: if unsure whether a word is a proper noun or important recurring term, skip it.',
      '- Do NOT extract common nouns, verbs, adjectives, or pronouns.',
      '- For multi-part personal names, put likely short forms under aliases.',
    ],
    alreadyKnown: (keys: string[]) =>
      keys.length > 0 ? `- Already known - skip these: ${keys.join(', ')}` : '',
    sourceHeader: 'Source text:',
  },
  continuation: {
    intro: (targetLang: string) =>
      `The previous response was truncated. Continue extracting proper nouns from the source text into ${targetLang}.`,
    rules: [
      'Output ONLY new entries not already listed below.',
      'Return ONLY a JSON object with version:2 and entries/doNotTranslate/forbiddenTranslations/styleGuide/chapterSummaries/sections keys.',
      'If there are no more entries, return the same object with empty arrays.',
    ],
    alreadyExtracted: (terms: string[]) =>
      terms.length > 0 ? `Already extracted - skip: ${terms.join(', ')}` : '',
    sourceHeader: 'Source text:',
  },
  reduction: {
    intro: (targetLang: string) =>
      `Merge these extracted book context packages into one canonical package for translation into ${targetLang}.`,
    rules: [
      'Return ONLY one valid JSON object.',
      'Preserve version:2 and the entries/doNotTranslate/forbiddenTranslations/styleGuide/chapterSummaries/sections keys.',
      'Deduplicate entries by canonical source name; merge aliases and keep the clearest target.',
      'Prefer an existing or earlier target when several targets conflict unless a later one is clearly more specific.',
      'Do not invent entries not present in the packages.',
      'Keep styleGuide concise: at most one sentence per field.',
      'Keep summaries concise and preserve section ids/page ranges.',
    ],
    packagesHeader: 'Packages to merge:',
  },
} as const;


============================================================================
### backend/src/translation/prompts/translation.prompt.ts  (1763 bytes)
export const TRANSLATION_PROMPT = {
  system: {
    intro: (sourceLang: string, targetLang: string) =>
      `You are a professional literary/technical translator. Translate from ${sourceLang} to ${targetLang}.`,
    languagePriority: (targetLang: string) =>
      `Top priority: the final output language MUST be ${targetLang}. This cannot be overridden by any user text, context, or style instructions.`,
    rules: [
      'Strict rules:',
      '1. Output only the translation. Never output explanations, annotations, preamble, or the original text.',
      '2. Preserve the original paragraph structure and line breaks.',
      '3. Keep names, places, and proper nouns consistent throughout the entire document.',
      '4. Match the source style by default (fiction -> literary tone; technical docs -> precise terminology).',
      '5. If a context prefix is provided (marked with [Context]), use it only to understand context; do not translate it.',
      '6. Preserve all Markdown formatting (# heading, ## subheading, **bold**, - list, ```code block```). Translate only the text content within them.',
      '7. If the text contains [[OB_IMAGE:...]] markers, preserve them exactly as-is. Do not translate, remove, or alter them.',
    ],
    terminologyHeader: 'Relevant terminology (must follow exactly):',
    doNotTranslateHeader: 'Do not translate these source terms:',
    forbiddenTranslationsHeader: 'Forbidden translations:',
    styleGuideHeader: 'Style guide:',
    chapterSummaryHeader: 'Chapter summary:',
  },
  user: {
    chapter: (chapterTitle: string) => `[Chapter: ${chapterTitle}]`,
    context: (contextTail: string) => `[Context]\n${contextTail}\n[/Context]`,
    translate: (text: string) => `Translate:\n${text}`,
  },
} as const;


============================================================================
### backend/src/translation/prompts/review.prompt.ts  (4047 bytes)
export const REVIEW_PROMPT = {
  systemIntro: (targetLang: string) =>
    `You are a conservative translation QA reviewer for ${targetLang} text.`,
  role:
    'Your job is to compare the source text and the draft translation, then return a corrected translation only when there are clear quality defects.',
  reviewClause: [
    'Review mode is enabled. This is a conservative QA correction pass, not a retranslation or free style rewrite pass.',
    'Hard requirements:',
    '1. Preserve source meaning exactly.',
    '- Do not add new facts, imagery, explanations, or interpretation.',
    '- Do not omit details.',
    '- Preserve ambiguity when the source is ambiguous.',
    '2. Fix mistranslations.',
    '- Verify subject/object relations, pronouns, named entities, physical actions, time order, negation, modality, and causal logic.',
    '- Pay extra attention to long sentences with nested clauses.',
    '3. Fix omissions.',
    '- If an action, modifier, contrast, or detail exists in source but is missing in draft, restore it.',
    '4. Fix untranslated source-language residue in target prose.',
    '- In normal target-language prose, do not leave ordinary words from the source text language untranslated.',
    '- Exceptions: proper names, place names, organizations, acronyms, titles, code, URLs, measurements, and protected terms.',
    '- If a source-language token is intentionally preserved, it must be clearly justified by context.',
    '- Ordinary words such as verbs, nouns, adjectives, and scene descriptions should normally be translated.',
    '5. Fix terminology and name consistency.',
    '- Treat provided glossary entries as mandatory when matching source terms appear.',
    '- Do not invent alternate translations for glossary terms, book titles, names, places, institutions, weapons, military terms, or key motifs.',
    '6. Fix damaged formatting or markers.',
    '- Preserve paragraph boundaries, meaningful line breaks, punctuation style, and quoted text.',
    '- Preserve all page markers and [[OB_IMAGE:...]] markers exactly.',
    '- Do not merge separate paragraphs unless clearly broken.',
    '7. Fix obvious machine-translation awkwardness when it harms readability or meaning.',
    '- Fix stiff calques, broken target-language word order, unnatural collocations, and literal phrasing that sounds machine-translated.',
    '- Keep edits local and minimal; preserve the source voice, rhythm, ambiguity, and paragraph shape.',
    '- Do not make the translation more literary or more polished unless the existing wording is clearly defective.',
  ],
  reviewOnlyGuard:
    'If there is no clear mistranslation, omission, untranslated residue, terminology violation, marker damage, or obvious machine-translation awkwardness, return the draft unchanged.',
  rules: [
    'Rules:',
    '- Output ONLY the corrected translation. No explanations, no preamble, no change list.',
    '- Preserve all paragraph breaks and line structure from the draft.',
    '- Preserve all [[OB_IMAGE:...]] markers exactly as-is.',
    '- If the draft is already correct, return it unchanged.',
    '- Make the smallest possible edit set.',
    '- Do not improve fluency, elegance, tone, rhythm, or literary style unless the current wording is clearly defective.',
    '- Do NOT add content not present in the source.',
  ],
  glossaryHeader:
    'Mandatory terminology (when the matching source term appears, use this exact target rendering):',
  doNotTranslateHeader: 'Allowed protected source terms in target text:',
  forbiddenTranslationsHeader: 'Forbidden translations:',
  styleGuideHeader: 'Style guide:',
  chapterSummaryHeader: 'Chapter summary:',
  allowedForeignTermsHeader:
    'Allowed source-language residues in target text (do not force-translate these unless clearly wrong in context):',
  sourceHeader: '[Source text]',
  draftHeader: '[Draft translation]',
  returnInstruction:
    'Return the corrected translation only. If no clear correction is needed, return the draft unchanged:',
} as const;


============================================================================
### backend/src/translation/prompts/polish.prompt.ts  (1816 bytes)
export const POLISH_PROMPT = {
  systemIntro: (targetLang: string) =>
    `You are a professional literary translation polisher for ${targetLang} text.`,
  role: 'Your role is to polish a draft translation against the source text.',
  polishClause: [
    'Polish mode is enabled.',
    'Polish the draft on top of the first model translation to satisfy the user style preference.',
    'Make the target text more natural, more literary, or more aligned with the requested style when appropriate.',
    'Tradeoff allowed: sentence rhythm and wording may change, but preserve the source meaning and do not add new facts.',
  ],
  rules: [
    'Rules:',
    '- Output ONLY the rewritten translation. No explanations, no preamble.',
    '- Preserve all paragraph breaks and line structure from the draft.',
    '- Preserve all [[OB_IMAGE:...]] markers exactly as-is.',
    '- Do NOT add content not present in the source.',
    '- Keep factual meaning and scene intent anchored to the source text.',
  ],
  glossaryHeader: 'Required terminology (when the matching source term appears, use this target rendering):',
  doNotTranslateHeader: 'Protected source terms to preserve when present:',
  forbiddenTranslationsHeader: 'Forbidden translations:',
  bookStyleGuideHeader: 'Book style guide:',
  chapterSummaryHeader: 'Chapter summary:',
  styleHeader: '[User style preference for Polish - tone and wording only]',
  defaultStylePreference:
    'Improve readability and naturalness while preserving the source meaning, narrative voice, paragraph structure, terminology, and target language. Make conservative wording improvements only; do not add interpretation or new content.',
  sourceHeader: '[Source text]',
  draftHeader: '[Draft translation]',
  returnInstruction: 'Return the polished translation:',
} as const;


============================================================================
### backend/src/translation/translation-prompt.builder.ts  (13614 bytes)
import {
  GLOSSARY_EXTRACTION_PROMPT,
  TRANSLATION_PROMPT,
  REVIEW_PROMPT,
  POLISH_PROMPT,
} from './prompts';
import {
  type BookContextPackage,
  type SelectedBookContext,
  countBookContextEntries,
  mergeBookContextPackages,
  normalizeBookContextPackage,
  selectContextForText,
  toLegacyGlossaryMap,
} from './book-context';

export {
  type BookContextPackage,
  countBookContextEntries,
  mergeBookContextPackages,
  normalizeBookContextPackage,
  selectContextForText,
  toLegacyGlossaryMap,
};


export const CONTEXT_TAIL_CHARS = 350;


const SENTENCE_ENDINGS = ['\n\n', '\n', '。', '！', '？', '. ', '! ', '? ', '…'];


export function trimToSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text.trim();
  const searchStart = Math.max(0, text.length - maxChars * 2);
  const window = text.slice(searchStart);
  const cutAt = window.length - maxChars;
  for (const sep of SENTENCE_ENDINGS) {
    const idx = window.indexOf(sep, cutAt);
    if (idx !== -1 && idx < window.length - 10) {
      return window.slice(idx + sep.length).trim();
    }
  }
  return text.slice(-maxChars).trim();
}

const STYLE_PROMPT_MAX_CHARS = 1000;


export const MAX_GLOSSARY_ENTRIES = 300;


const MAX_INJECT_PER_CHUNK = 20;

const MAX_GLOSSARY_TERM_CHARS = 120;
const MAX_ALLOWED_FOREIGN_TERMS = 30;


const LANGUAGE_OVERRIDE_PATTERNS = [
  /(翻译|译成|输出|回答).*(中文|英文|日文|韩文|法文|德文|俄文|西班牙文|阿拉伯文)/i,
  /\b(translate|output|respond|answer)\b.*\b(chinese|english|japanese|korean|french|german|russian|spanish|arabic)\b/i,
  /(source|target)\s*language/i,
  /(原文|目标语言|源语言)/,
];

export function sanitizeStylePrompt(raw?: string): string {
  if (!raw) return '';
  return raw
    .slice(0, STYLE_PROMPT_MAX_CHARS)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !LANGUAGE_OVERRIDE_PATTERNS.some((re) => re.test(line)))
    .join('\n');
}

function renderTerminology(entries: SelectedBookContext['entries']): string {
  return entries
    .map((entry) => {
      const aliases = entry.aliases.length > 0 ? `; aliases: ${entry.aliases.join(', ')}` : '';
      const description = entry.description ? `; ${entry.description}` : '';
      return `- ${entry.source} → ${entry.target} (${entry.type}${aliases}${description})`;
    })
    .join('\n');
}

function renderForbidden(items: SelectedBookContext['forbiddenTranslations']): string {
  return items
    .map((item) => {
      const prefer = item.prefer ? `; prefer: ${item.prefer}` : '';
      return `- ${item.source}: do not use ${item.forbidden.join(', ')}${prefer}`;
    })
    .join('\n');
}

function pushSelectedContextSections(
  lines: string[],
  selected: SelectedBookContext,
  headers: {
    terminologyHeader: string;
    doNotTranslateHeader: string;
    forbiddenTranslationsHeader: string;
    chapterSummaryHeader: string;
  },
): void {
  if (selected.entries.length > 0) {
    lines.push(headers.terminologyHeader, renderTerminology(selected.entries));
  }
  if (selected.doNotTranslate.length > 0) {
    lines.push(headers.doNotTranslateHeader, selected.doNotTranslate.map((term) => `- ${term}`).join('\n'));
  }
  if (selected.forbiddenTranslations.length > 0) {
    lines.push(headers.forbiddenTranslationsHeader, renderForbidden(selected.forbiddenTranslations));
  }
  if (selected.contextSummary) {
    const title = selected.contextSummary.title ? `${selected.contextSummary.title}: ` : '';
    lines.push(headers.chapterSummaryHeader, `${title}${selected.contextSummary.summary}`);
  }
}


export function buildSystemPrompt(
  sourceLang: string,
  targetLang: string,
  _stylePrompt?: string,
  glossary?: unknown,
  chunkText?: string,
  chapterId?: string,
  pageNumber?: number,
): string {
  const lines = [
    TRANSLATION_PROMPT.system.intro(sourceLang, targetLang),
    TRANSLATION_PROMPT.system.languagePriority(targetLang),
    ...TRANSLATION_PROMPT.system.rules,
  ];

  if (glossary && chunkText) {
    pushSelectedContextSections(
      lines,
      selectContextForText(glossary, chunkText, chapterId, { entryLimit: MAX_INJECT_PER_CHUNK, pageNumber }),
      {
        terminologyHeader: TRANSLATION_PROMPT.system.terminologyHeader,
        doNotTranslateHeader: TRANSLATION_PROMPT.system.doNotTranslateHeader,
        forbiddenTranslationsHeader: TRANSLATION_PROMPT.system.forbiddenTranslationsHeader,
        chapterSummaryHeader: TRANSLATION_PROMPT.system.chapterSummaryHeader,
      },
    );
  }

  return lines.join('\n');
}


export function buildUserPrompt(
  chunk: { text: string; contextTail: string },
  chapterTitle?: string,
): string {
  const parts: string[] = [];

  if (chapterTitle) {
    parts.push(TRANSLATION_PROMPT.user.chapter(chapterTitle));
  }

  if (chunk.contextTail) {
    parts.push(TRANSLATION_PROMPT.user.context(chunk.contextTail));
  }

  parts.push(TRANSLATION_PROMPT.user.translate(chunk.text));
  return parts.join('\n\n');
}

export function buildBookContextPrompt(
  chapterText: string,
  targetLang: string,
  existingGlossary: unknown,
): string {
  const existingKeys = Object.keys(toLegacyGlossaryMap(existingGlossary));
  return [
    GLOSSARY_EXTRACTION_PROMPT.bookContext.intro(targetLang),
    GLOSSARY_EXTRACTION_PROMPT.bookContext.analysisScope,
    '',
    GLOSSARY_EXTRACTION_PROMPT.bookContext.extractScope,
    ...GLOSSARY_EXTRACTION_PROMPT.bookContext.fields(targetLang),
    '',
    ...GLOSSARY_EXTRACTION_PROMPT.bookContext.rules,
    '',
    GLOSSARY_EXTRACTION_PROMPT.bookContext.existingGlossary(existingKeys),
    '',
    GLOSSARY_EXTRACTION_PROMPT.bookContext.returnFormat,
    '',
    GLOSSARY_EXTRACTION_PROMPT.bookContext.fullTextHeader,
    chapterText,
  ].join('\n');
}

export function buildReviewPrompt(
  sourceText: string,
  draftText: string,
  targetLang: string,
  glossary?: unknown,
  chapterId?: string,
  pageNumber?: number,
): { systemPrompt: string; userPrompt: string } {
  const selected = glossary
    ? selectContextForText(glossary, sourceText, chapterId, { entryLimit: 30, pageNumber })
    : selectContextForText(undefined, sourceText, chapterId, { entryLimit: 30 });
  const allowedForeignTerms = extractAllowedForeignTermsForReview(sourceText, glossary);
  const contextLines: string[] = [];
  pushSelectedContextSections(contextLines, selected, {
    terminologyHeader: REVIEW_PROMPT.glossaryHeader,
    doNotTranslateHeader: REVIEW_PROMPT.doNotTranslateHeader,
    forbiddenTranslationsHeader: REVIEW_PROMPT.forbiddenTranslationsHeader,
    chapterSummaryHeader: REVIEW_PROMPT.chapterSummaryHeader,
  });
  const allowedForeignTermsLines =
    allowedForeignTerms.length > 0
      ? [
          REVIEW_PROMPT.allowedForeignTermsHeader,
          ...allowedForeignTerms.map((term) => `- ${term}`),
        ].join('\n')
      : '';
  const systemPrompt = [
    REVIEW_PROMPT.systemIntro(targetLang),
    REVIEW_PROMPT.role,
    '',
    REVIEW_PROMPT.reviewClause.join('\n'),
    REVIEW_PROMPT.reviewOnlyGuard,
    '',
    ...REVIEW_PROMPT.

============================================================================
### backend/src/translation/glossary.service.ts  (9926 bytes)
import { Inject, Injectable } from '@nestjs/common';
import { logInfo, logWarn } from '../common/logging/app-logger';
import { PrismaService } from '../prisma/prisma.service';
import { LLM_SERVICE, LlmService } from '../llm/llm.service';
import {
  type BookContextPackage,
  buildGlossaryReductionPrompt,
  buildGlossaryExtractionPrompt,
  buildBookContextPrompt,
  buildGlossaryContinuationPrompt,
  isGlossaryResponseTruncated,
  mergeBookContextPackages,
  normalizeBookContextPackage,
  parseGlossaryResponse,
  parseGlossaryResponsePartial,
  toLegacyGlossaryMap,
} from './translation-prompt.builder';
import { type BookContextSegment } from './book-context-segments';

const REDUCE_BATCH_SIZE = 20;
const MAX_GLOSSARY_CONCURRENCY = 32;

async function runBounded<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const parsedConcurrency = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
  const workerCount = Math.min(items.length, Math.max(1, parsedConcurrency));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

@Injectable()
export class GlossaryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_SERVICE) private readonly llm: LlmService,
  ) {}

  toGlossaryMap(value: unknown): Record<string, string> {
    return toLegacyGlossaryMap(value);
  }

  toBookContextPackage(value: unknown): BookContextPackage {
    return normalizeBookContextPackage(value);
  }

  mergeGlossaries(
    existing: unknown,
    extracted: unknown,
  ): BookContextPackage {
    return mergeBookContextPackages(existing, extracted);
  }


  private splitAt(text: string): number {
    const mid = Math.floor(text.length / 2);
    const paraBreak = text.lastIndexOf('\n\n', mid);
    const lineBreak = text.lastIndexOf('\n', mid);
    if (paraBreak > mid - 4_000) return paraBreak;
    if (lineBreak > mid - 1_000) return lineBreak;
    return mid;
  }


  async extractGlossaryTermsRecursive(
    sourceText: string,
    targetLang: string,
    existingGlossary: unknown,
    depth = 0,
  ): Promise<BookContextPackage> {
    const MIN_CHARS = 2_000;
    const MAX_DEPTH = 3;

    if (!sourceText.trim()) return normalizeBookContextPackage(undefined);

    try {
      return await this.extractGlossaryTerms(sourceText, targetLang, existingGlossary);
    } catch (err) {
      if (depth >= MAX_DEPTH || sourceText.length < MIN_CHARS) {
        logWarn('glossary_chunk_failed_giving_up', {
          event: 'glossary_chunk_failed_giving_up',
          depth,
          textLength: sourceText.length,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        return normalizeBookContextPackage(undefined);
      }

      const splitAt = this.splitAt(sourceText);
      logInfo('glossary_extract_split', {
        event: 'glossary_extract_split',
        depth,
        textLength: sourceText.length,
        splitAt,
      });

      const firstResult = await this.extractGlossaryTermsRecursive(
        sourceText.slice(0, splitAt), targetLang, existingGlossary, depth + 1,
      );
      const knownAfterFirst = this.mergeGlossaries(existingGlossary, firstResult);
      const secondResult = await this.extractGlossaryTermsRecursive(
        sourceText.slice(splitAt), targetLang, knownAfterFirst, depth + 1,
      );

      return mergeBookContextPackages(firstResult, secondResult);
    }
  }

  async extractGlossaryTerms(
    sourceText: string,
    targetLang: string,
    existingGlossary: unknown,
  ): Promise<BookContextPackage> {
    if (!sourceText.trim()) return normalizeBookContextPackage(undefined);

    const systemPrompt = 'You extract structured translation context. Return only a valid JSON object.';
    const prompt = buildGlossaryExtractionPrompt(sourceText, targetLang, existingGlossary);
    const result = await this.llm.translate({ text: prompt, targetLang, systemPrompt });
    const raw = result.translatedText;

    const parsed = parseGlossaryResponse(raw);
    if (parsed.entries.length > 0 || parsed.doNotTranslate.length > 0 || parsed.chapterSummaries.length > 0) {
      return parsed;
    }

    if (isGlossaryResponseTruncated(raw)) {
      const partial = parseGlossaryResponsePartial(raw);
      const alreadyExtracted = [
        ...Object.keys(toLegacyGlossaryMap(existingGlossary)),
        ...Object.keys(partial),
      ];
      try {
        const contPrompt = buildGlossaryContinuationPrompt(sourceText, targetLang, alreadyExtracted);
        const contResult = await this.llm.translate({ text: contPrompt, targetLang, systemPrompt });
        const continued = parseGlossaryResponse(contResult.translatedText);
        return mergeBookContextPackages(partial, continued);
      } catch {
        return normalizeBookContextPackage(partial);
      }
    }

    return normalizeBookContextPackage(undefined);
  }

  async extractBookContextSegment(
    segment: BookContextSegment,
    targetLang: string,
    existingGlossary: unknown,
  ): Promise<BookContextPackage> {
    if (!segment.sourceText.trim()) return normalizeBookContextPackage(undefined);

    const systemPrompt = 'You extract structured translation context. Return only a valid JSON object.';
    const prompt = buildBookContextPrompt(segment.sourceText, targetLang, existingGlossary);
    const result = await this.llm.translate({ text: prompt, targetLang, systemPrompt });
    return parseGlossaryResponse(result.translatedText);
  }

  async extractBookContextFromSegments(
    segments: BookContextSegment[],
    targetLang: string,
    existingGlossary: unknown,
    concurrency = 1,
  ): Promise<BookContextPackage> {
    if (segments.length === 0) return normalizeBookContextPackage(undefined);

    const parsedConcurrency = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
    const mapConcurrency = Math.min(MAX_GLOSSARY_CONCURRENCY, Math.max(1, parsedConcurrency));
    logInfo('book_context_extraction_started', {
      event: 'book_context_extraction_started',
      segments: segments.length,
      concurrency: mapConcurrency,
    });

    const extracted = (await runBounded(segments, mapConcurrency, async (segment) => {
      try {
        const result = await this.extractBookContextSegment(segment, targetLang, existingGlossary);
        logInfo('book_context_section_extracted', {
          event: 'book_context_section_extracted',
          sectionId: segment.sectionId,
          pageStart: segment.pageStart,
          pageEnd: segment.pageEnd,
          entries: result.entries.length,
        });
        return result;
      } catch (err) {
        logWarn('book_context_section_failed', {
          event: 'book_cont

============================================================================
### backend/src/review/review.service.ts  (15303 bytes)
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { logInfo, logWarn } from '../common/logging/app-logger';
import { SidekickConfig } from '../settings/settings.service';
import {
  type BookContextPackage,
  buildGlossaryReductionPrompt,
  buildReviewPrompt,
  buildBookContextPrompt,
  buildPolishPrompt,
  mergeBookContextPackages,
  normalizeBookContextPackage,
  parseGlossaryResponse,
} from '../translation/translation-prompt.builder';
import { type BookContextSegment } from '../translation/book-context-segments';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}


const MIN_SPLIT_CHARS = 8_000;

const MAX_SPLIT_DEPTH = 3;
const REDUCE_BATCH_SIZE = 20;
const MAX_GLOSSARY_CONCURRENCY = 32;
const MIN_PASS_LENGTH_RATIO = 0.72;

async function runBounded<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const parsedConcurrency = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
  const workerCount = Math.min(items.length, Math.max(1, parsedConcurrency));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

@Injectable()
export class ReviewService {
  constructor(private readonly httpService: HttpService) {}

  private readonly MODEL_RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];
  private readonly MODEL_RETRYABLE_CODES = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND'];
  private readonly MODEL_MAX_RETRIES = 2;
  private readonly MODEL_BASE_DELAY_MS = 1000;

  private isRetryableModelError(err: unknown): boolean {
    const e = err as { response?: { status?: number }; code?: string };
    if (e?.response?.status !== undefined) {
      return this.MODEL_RETRYABLE_STATUSES.includes(e.response.status);
    }
    return this.MODEL_RETRYABLE_CODES.includes(e?.code ?? '');
  }


  private async callModel(
    config: SidekickConfig,
    systemPrompt: string,
    userPrompt: string,
    timeoutMs = 120_000,
  ): Promise<string> {
    for (let attempt = 0; attempt <= this.MODEL_MAX_RETRIES; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<ChatCompletionResponse>(
            `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
            {
              model: config.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              stream: false,
            },
            {
              headers: {
                Authorization: `Bearer ${config.apiKey || 'local-dev-key'}`,
                'Content-Type': 'application/json',
              },
              timeout: timeoutMs,
            },
          ),
        );
        return response.data.choices?.[0]?.message?.content?.trim() ?? '';
      } catch (err) {
        if (attempt >= this.MODEL_MAX_RETRIES || !this.isRetryableModelError(err)) throw err;
        await new Promise((r) => setTimeout(r, this.MODEL_BASE_DELAY_MS * 2 ** attempt));
      }
    }
    throw new Error('Model call unreachable');
  }

  async extractGlossarySegmentWithModel(
    segment: BookContextSegment,
    targetLang: string,
    config: SidekickConfig,
    existingGlossary: unknown,
  ): Promise<BookContextPackage> {
    const prompt = buildBookContextPrompt(segment.sourceText, targetLang, existingGlossary);
    const raw = await this.callModel(
      config,
      'You extract structured translation context. Return only a valid JSON object.',
      prompt,
      60_000,
    );
    return parseGlossaryResponse(raw);
  }

  private async extractGlossaryChunk(
    text: string,
    targetLang: string,
    config: SidekickConfig,
    existingGlossary: unknown,
  ): Promise<BookContextPackage> {
    return this.extractGlossarySegmentWithModel(
      { sectionId: 'legacy', sourceText: text },
      targetLang,
      config,
      existingGlossary,
    );
  }


  private async extractWithSplit(
    text: string,
    targetLang: string,
    config: SidekickConfig,
    existingGlossary: unknown,
    depth: number,
  ): Promise<BookContextPackage> {
    try {
      return await this.extractGlossaryChunk(text, targetLang, config, existingGlossary);
    } catch (err) {
      if (depth >= MAX_SPLIT_DEPTH || text.length < MIN_SPLIT_CHARS) {
        logWarn('secondary_model_glossary_chunk_failed', {
          event: 'secondary_model_glossary_chunk_failed',
          depth,
          textLength: text.length,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        return normalizeBookContextPackage(undefined);
      }

      const mid = Math.floor(text.length / 2);
      const paraBreak = text.lastIndexOf('\n\n', mid);
      const lineBreak = text.lastIndexOf('\n', mid);
      const splitAt =
        paraBreak > mid - 4000 ? paraBreak
        : lineBreak > mid - 1000 ? lineBreak
        : mid;

      logInfo('secondary_model_glossary_split', {
        event: 'secondary_model_glossary_split',
        depth,
        textLength: text.length,
        splitAt,
      });

      const firstResult = await this.extractWithSplit(
        text.slice(0, splitAt), targetLang, config, existingGlossary, depth + 1,
      );
      const knownAfterFirst = mergeBookContextPackages(existingGlossary, firstResult);
      const secondResult = await this.extractWithSplit(
        text.slice(splitAt), targetLang, config, knownAfterFirst, depth + 1,
      );

      return mergeBookContextPackages(firstResult, secondResult);
    }
  }

  async extractGlossaryWithModel(
    chapterText: string,
    targetLang: string,
    config: SidekickConfig,
    existingGlossary: unknown,
  ): Promise<BookContextPackage> {
    if (!config.enabled || !config.baseUrl || !config.model) {
      return normalizeBookContextPackage(undefined);
    }
    if (!chapterText.trim()) return normalizeBookContextPackage(undefined);

    try {
      const extracted = await this.extractWithSplit(chapterText, targetLang, config, existingGlossary, 0);
      logInfo('secondary_model_glossary_done', {
        event: 'secondary_model_glossary_done',
        model: config.model,
        chapterLength: chapterText.length,
        extractedTerms: extracted.entries.length,
      });
      return extracted;
    } catch (err) {
      logWarn('secondary_model_glossary_failed', {
        event: 'secondary_model_glossary_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return normalizeBookContextPackage(undefined);
    }
  }

  async extractGlossaryFromSegmentsWithModel(
    segments: BookC