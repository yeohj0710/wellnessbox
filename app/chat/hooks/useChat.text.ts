const META_LINE_PATTERNS = [
  /^\s*(근거|참고 데이터|내부 요약|분석 결과)\s*:\s*[^\n\r]*/gim,
  /^\s*(evidence|summary_json|rag_sources_json)\s*:\s*[^\n\r]*/gim,
];

// A block is "structured" when any of its lines is markdown syntax that depends
// on the line break surviving. Such blocks must never be re-flowed into prose.
const STRUCTURED_LINE_PATTERN = /^\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>\s?|\||```|~~~)/;
const SENTENCE_END_SPLIT_PATTERN = /(?<=[.!?。])\s+/;
const CODE_FENCE_PATTERN = /(```|~~~)[\s\S]*?(?:\1|$)/g;
const CODE_PLACEHOLDER = (index: number) => `[[wb-code-${index}]]`;

function stripMetaLines(text: string) {
  let next = text;
  for (const pattern of META_LINE_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return next;
}

/**
 * Lifts fenced code blocks out before formatting so no spacing rule can reflow
 * them, then restores them untouched.
 */
function protectCodeBlocks(text: string) {
  const blocks: string[] = [];
  const masked = text.replace(CODE_FENCE_PATTERN, (match) => {
    const index = blocks.push(match) - 1;
    return CODE_PLACEHOLDER(index);
  });

  return {
    masked,
    restore: (value: string) =>
      value.replace(
        /\[\[wb-code-(\d+)\]\]/g,
        (_match, index: string) => blocks[Number(index)] ?? ""
      ),
  };
}

function isStructuredBlock(block: string) {
  return block.split("\n").some((line) => STRUCTURED_LINE_PATTERN.test(line));
}

function normalizeRecommendationHeading(text: string) {
  return text.replace(
    /추천\s*제품\s*\(\s*7일\s*기준\s*(?:예상가|가격가?|가격)\s*\)/g,
    "추천 제품(7일 기준 가격)"
  );
}

function normalizeInlineNumberedList(text: string) {
  return text
    .replace(/^[ \t]*([1-9])\)[ \t]+/gm, "$1. ")
    .replace(/\n{3,}/g, "\n\n");
}

function normalizeOrdinalBullets(text: string) {
  const ordinalLines = text.match(/^[ \t]*(?:첫째|둘째|셋째|넷째)\s*,/gm);
  if (!ordinalLines || ordinalLines.length < 2) {
    return text;
  }

  return text
    .replace(/^[ \t]*(첫째|둘째|셋째|넷째)\s*,\s*/gm, "- ")
    .replace(/\n{3,}/g, "\n\n");
}

function splitParagraphSentences(paragraph: string) {
  return paragraph
    .split(SENTENCE_END_SPLIT_PATTERN)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function groupSentences(sentences: string[]) {
  const chunks: string[] = [];
  let bucket: string[] = [];

  for (const sentence of sentences) {
    const bucketText = bucket.join(" ");
    const shouldFlush =
      bucket.length >= 2 ||
      sentence.length > 95 ||
      (bucketText.length > 0 && bucketText.length + sentence.length > 165);

    if (shouldFlush && bucket.length > 0) {
      chunks.push(bucket.join(" "));
      bucket = [sentence];
      continue;
    }

    bucket.push(sentence);
  }

  if (bucket.length > 0) {
    chunks.push(bucket.join(" "));
  }

  return chunks;
}

/**
 * Breaks up wall-of-text paragraphs. Only plain single-line prose is eligible:
 * a block carrying markdown structure, or one the model already split across
 * lines, keeps its line breaks — re-flowing it would collapse the structure
 * into a run-on paragraph.
 */
function rebalanceLongParagraphs(text: string) {
  const paragraphs = text.split(/\n{2,}/);

  const nextParagraphs = paragraphs.flatMap((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return [];
    if (isStructuredBlock(trimmed)) return [trimmed];
    if (trimmed.includes("\n")) return [trimmed];
    if (trimmed.length < 150) return [trimmed];

    const sentences = splitParagraphSentences(trimmed);
    if (sentences.length < 2) return [trimmed];

    const chunks = groupSentences(sentences);
    return chunks.length > 1 ? chunks : [trimmed];
  });

  return nextParagraphs.join("\n\n");
}

/**
 * Separates a list from the prose around it. Markers are matched at line start
 * only, so a hyphen inside a sentence never splits a paragraph, and indented
 * continuation lines stay attached to their list item.
 */
function insertSpacingAroundLists(text: string) {
  return text
    .replace(
      /^(?![ \t]*(?:[-*+]\s|\d+\.\s))(\S.*)\n(?=[ \t]*(?:[-*+]\s|\d+\.\s))/gm,
      "$1\n\n"
    )
    .replace(
      /^([ \t]*(?:[-*+]\s|\d+\.\s).*)\n(?![ \t]*(?:[-*+]\s|\d+\.\s)|[ \t]+\S|[ \t]*$)/gm,
      "$1\n\n"
    );
}

function insertSpacingBeforeQuestion(text: string) {
  return text.replace(/([^\n])\n((?:어떨까요|괜찮을까요|가능할까요|알려주실 수 있을까요)\??)$/gm, "$1\n\n$2");
}

function formatAssistantText(text: string) {
  const { masked, restore } = protectCodeBlocks(text);

  let next = normalizeRecommendationHeading(masked);
  next = normalizeInlineNumberedList(next);
  next = normalizeOrdinalBullets(next);
  next = rebalanceLongParagraphs(next);
  next = insertSpacingAroundLists(next);
  next = insertSpacingBeforeQuestion(next);

  next = next
    .replace(/([^\n])\n(추천 제품\(7일 기준 가격\))/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n");

  return restore(next).trim();
}

export function normalizeNewlines(text: string) {
  return (text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "");
}

export function sanitizeAssistantText(text: string, finalize = false) {
  const cleaned = normalizeNewlines(stripMetaLines(text));
  if (!finalize) {
    return cleaned;
  }
  return formatAssistantText(cleaned);
}
