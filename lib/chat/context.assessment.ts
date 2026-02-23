import {
  asStringArray,
  clip,
  normalizeCategoryLabel,
  stripPercentSuffix,
  uniq,
} from "./context.base";
import type {
  AssessLike,
  CheckAiLike,
  UserContextSummary,
} from "./context.types";

function parseAssessSummaryLine(line: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+?)\s+([\d.]+)%$/);
  if (!match) return stripPercentSuffix(normalizeCategoryLabel(trimmed));
  const label = normalizeCategoryLabel(match[1]);
  return stripPercentSuffix(label);
}

export function buildAssessFindings(
  assess: AssessLike | null | undefined,
  localAssessCats?: string[] | null
) {
  const fromSummary = asStringArray(assess?.summary)
    .map(parseAssessSummaryLine)
    .filter(Boolean);

  if (fromSummary.length > 0) return uniq(fromSummary, 7);

  const topLabels = asStringArray(assess?.normalized?.topLabels).map(
    normalizeCategoryLabel
  );
  const scores = Array.isArray(assess?.normalized?.scores)
    ? assess?.normalized?.scores || []
    : [];

  if (topLabels.length > 0) {
    const withScores = topLabels.map((label, idx) => {
      const score = scores[idx];
      const value = typeof score?.value === "number" ? score.value : null;
      if (value == null) return stripPercentSuffix(label);
      return stripPercentSuffix(label);
    });
    return uniq(withScores.filter(Boolean), 7);
  }

  const local = asStringArray(localAssessCats).map(normalizeCategoryLabel);
  return uniq(local, 7);
}

export function buildQuickFindings(
  checkAi: CheckAiLike | null | undefined,
  localQuick?: string[] | null
) {
  const primary = asStringArray(checkAi?.labels).map(normalizeCategoryLabel);
  if (primary.length > 0) return uniq(primary, 7);

  const normalizedTop = asStringArray(checkAi?.normalized?.topLabels).map(
    normalizeCategoryLabel
  );
  if (normalizedTop.length > 0) return uniq(normalizedTop, 7);

  const local = asStringArray(localQuick).map(normalizeCategoryLabel);
  return uniq(local, 7);
}

function normalizeAnswerText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function buildAnswerPairs(
  value: unknown
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];

  const out: Array<{ question: string; answer: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = normalizeAnswerText(record.question);
    const answer =
      normalizeAnswerText(record.answerLabel) || normalizeAnswerText(record.answer);
    if (!question || !answer) continue;
    out.push({
      question: clip(question, 80),
      answer: clip(answer, 40),
    });
  }
  return out;
}

const HIGH_IMPACT_QUESTION_PATTERN =
  /(임신|수유|복용 중|복용약|알레르기|질환|빈혈|혈압|당뇨|통증|두근|어지럼|불면|우울|출혈|신장|간)/;
const HIGH_IMPACT_ANSWER_PATTERN =
  /(예|있음|있어요|자주|매우|심함|높음|불편|어렵|부족|나쁨|불규칙|많음|과다|가끔|종종)/;
const LOW_IMPACT_ANSWER_PATTERN = /(아니오|없음|해당 없음|보통|괜찮|정상|복용 안 함)/;
const LIFESTYLE_QUESTION_PATTERN =
  /(수면|운동|식사|생활|습관|스트레스|음주|흡연|카페인|수분|물 섭취|활동량)/;

function classifyAnswerSignal(pair: { question: string; answer: string }) {
  const isCautionQuestion = HIGH_IMPACT_QUESTION_PATTERN.test(pair.question);
  const isCautionAnswer = HIGH_IMPACT_ANSWER_PATTERN.test(pair.answer);
  const isLowImpactAnswer = LOW_IMPACT_ANSWER_PATTERN.test(pair.answer);
  const isLifestyleQuestion = LIFESTYLE_QUESTION_PATTERN.test(pair.question);

  if (isCautionQuestion && isCautionAnswer) return "주의" as const;
  if (isLowImpactAnswer) return "보호" as const;
  if (isLifestyleQuestion) return "생활" as const;
  if (isCautionQuestion) return "주의" as const;
  return "생활" as const;
}

function scoreAnswerPair(pair: { question: string; answer: string }) {
  let score = 0;
  if (HIGH_IMPACT_QUESTION_PATTERN.test(pair.question)) score += 2;
  if (HIGH_IMPACT_ANSWER_PATTERN.test(pair.answer)) score += 2;
  if (LIFESTYLE_QUESTION_PATTERN.test(pair.question)) score += 1;
  if (LOW_IMPACT_ANSWER_PATTERN.test(pair.answer)) score += 1;
  return score;
}

export function buildNotableResponses(input: {
  assessResult?: AssessLike | null;
  checkAiResult?: CheckAiLike | null;
}): UserContextSummary["notableResponses"] {
  const assessPairs = buildAnswerPairs(input.assessResult?.answers).map((pair) => ({
    ...pair,
    source: "정밀 검사" as const,
    score: scoreAnswerPair(pair),
    signal: classifyAnswerSignal(pair),
  }));
  const quickPairs = buildAnswerPairs(input.checkAiResult?.answers).map((pair) => ({
    ...pair,
    source: "빠른 검사" as const,
    score: scoreAnswerPair(pair),
    signal: classifyAnswerSignal(pair),
  }));

  const merged = [...assessPairs, ...quickPairs]
    .filter((pair) => pair.score > 0)
    .sort((left, right) => right.score - left.score);

  const deduped: typeof merged = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = `${item.source}:${item.question}:${item.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const selected: typeof deduped = [];
  const pushBySignal = (signal: "주의" | "보호" | "생활", limit: number) => {
    for (const item of deduped) {
      if (item.signal !== signal) continue;
      if (selected.includes(item)) continue;
      selected.push(item);
      if (
        selected.filter((candidate) => candidate.signal === signal).length >=
        limit
      ) {
        break;
      }
    }
  };

  pushBySignal("주의", 3);
  pushBySignal("보호", 1);
  pushBySignal("생활", 1);

  for (const item of deduped) {
    if (selected.length >= 5) break;
    if (selected.includes(item)) continue;
    selected.push(item);
  }

  return selected.slice(0, 5).map((pair) => ({
    source: pair.source,
    question: pair.question,
    answer: pair.answer,
    signal: pair.signal,
  }));
}

export function buildRecommendedNutrients(input: {
  assessFindings: string[];
  quickFindings: string[];
}) {
  const labels = [
    ...input.assessFindings.slice(0, 4),
    ...input.quickFindings.slice(0, 4),
  ]
    .map((finding) => stripPercentSuffix(normalizeCategoryLabel(finding)))
    .filter(Boolean);
  return uniq(labels, 4);
}
