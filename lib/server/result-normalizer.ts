import type { AssessmentResult, CheckAiResult } from "@prisma/client";
import { CHECK_AI_OPTIONS, CHECK_AI_QUESTIONS } from "@/lib/checkai";
import { sectionA, sectionB } from "@/app/assess/data/questions";

export const ASSESS_SNAPSHOT_VERSION = 1 as const;
export const CHECK_AI_SNAPSHOT_VERSION = 1 as const;

export type SnapshotOption = { value: unknown; label: string };
export type SnapshotQuestion = {
  id: string;
  text: string;
  type?: string;
  options?: SnapshotOption[];
  min?: number;
  max?: number;
};

export type QuestionSnapshotV1 = {
  version: number;
  kind: "assess" | "check-ai";
  questions: SnapshotQuestion[];
  options?: SnapshotOption[];
};

export type ScoreSnapshotV1 = {
  version: number;
  kind: "assess" | "check-ai";
  scores: NormalizedScore[];
  topLabels?: string[];
};

export type NormalizedResult = {
  kind: "assess" | "check-ai";
  snapshotVersion: number;
  questionSource: "snapshot" | "legacy" | "fallback";
  scoreSource: "snapshot" | "legacy" | "fallback";
  questions: SnapshotQuestion[];
  options: SnapshotOption[];
  scores: NormalizedScore[];
  topLabels: string[];
  createdAt?: string;
  tzOffsetMinutes?: number;
};

type NormalizedScore = { code?: string; label: string; value: number };

const ASSESS_QUESTIONS: SnapshotQuestion[] = [...sectionA, ...sectionB].map(
  (question) => ({
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options ?? undefined,
    min: question.min ?? undefined,
    max: question.max ?? undefined,
  })
);

const CHECK_AI_QUESTION_ITEMS: SnapshotQuestion[] = CHECK_AI_QUESTIONS.map(
  (text, idx) => ({
    id: `Q${idx + 1}`,
    text,
    type: "choice",
  })
);

const CHECK_AI_OPTIONS_LIST: SnapshotOption[] = CHECK_AI_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeQuestionList(
  source: unknown,
  includeIndex = false
): SnapshotQuestion[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((question, idx) =>
      normalizeSnapshotQuestion(question, includeIndex ? idx : undefined)
    )
    .filter((question): question is SnapshotQuestion => !!question);
}

function normalizeOptionList(source: unknown): SnapshotOption[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((option) => normalizeOption(option))
    .filter((option): option is SnapshotOption => !!option);
}

function normalizeScoreList(source: unknown): NormalizedScore[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((score) => normalizeScore(score))
    .filter((score): score is NormalizedScore => !!score);
}

function resolveTopLabels(
  source: unknown,
  fallbackScores: NormalizedScore[]
): string[] {
  const labels = readStringArray(source);
  return labels.length > 0 ? labels : fallbackScores.map((score) => score.label);
}

function serializeQuestionSnapshotItems(
  questions: SnapshotQuestion[]
): SnapshotQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    text: question.text,
    ...(question.type ? { type: question.type } : {}),
    ...(question.options ? { options: question.options } : {}),
    ...(typeof question.min === "number" ? { min: question.min } : {}),
    ...(typeof question.max === "number" ? { max: question.max } : {}),
  }));
}

function normalizeAssessQuestionSnapshot(snapshot: unknown): {
  snapshot: QuestionSnapshotV1;
  source: NormalizedResult["questionSource"];
} {
  if (isRecord(snapshot) && typeof snapshot.version === "number") {
    const questions = Array.isArray(snapshot.questions)
      ? normalizeQuestionList(snapshot.questions)
      : ASSESS_QUESTIONS;
    return {
      snapshot: {
        version: snapshot.version,
        kind: "assess",
        questions,
      },
      source: "snapshot",
    };
  }

  if (Array.isArray(snapshot)) {
    const questions = normalizeQuestionList(snapshot);
    return {
      snapshot: {
        version: ASSESS_SNAPSHOT_VERSION,
        kind: "assess",
        questions: questions.length ? questions : ASSESS_QUESTIONS,
      },
      source: "legacy",
    };
  }

  return {
    snapshot: {
      version: ASSESS_SNAPSHOT_VERSION,
      kind: "assess",
      questions: ASSESS_QUESTIONS,
    },
    source: "fallback",
  };
}

function normalizeCheckAiQuestionSnapshot(snapshot: unknown): {
  snapshot: QuestionSnapshotV1;
  source: NormalizedResult["questionSource"];
} {
  if (isRecord(snapshot) && typeof snapshot.version === "number") {
    const questions = Array.isArray(snapshot.questions)
      ? normalizeQuestionList(snapshot.questions)
      : CHECK_AI_QUESTION_ITEMS;
    const options = Array.isArray(snapshot.options)
      ? normalizeOptionList(snapshot.options)
      : CHECK_AI_OPTIONS_LIST;
    return {
      snapshot: {
        version: snapshot.version,
        kind: "check-ai",
        questions: questions.length ? questions : CHECK_AI_QUESTION_ITEMS,
        options: options.length ? options : CHECK_AI_OPTIONS_LIST,
      },
      source: "snapshot",
    };
  }

  if (isRecord(snapshot) && Array.isArray(snapshot.questions)) {
    const questions = normalizeQuestionList(snapshot.questions, true);
    const options = Array.isArray(snapshot.options)
      ? normalizeOptionList(snapshot.options)
      : CHECK_AI_OPTIONS_LIST;
    return {
      snapshot: {
        version: CHECK_AI_SNAPSHOT_VERSION,
        kind: "check-ai",
        questions: questions.length ? questions : CHECK_AI_QUESTION_ITEMS,
        options: options.length ? options : CHECK_AI_OPTIONS_LIST,
      },
      source: "legacy",
    };
  }

  return {
    snapshot: {
      version: CHECK_AI_SNAPSHOT_VERSION,
      kind: "check-ai",
      questions: CHECK_AI_QUESTION_ITEMS,
      options: CHECK_AI_OPTIONS_LIST,
    },
    source: "fallback",
  };
}

function normalizeSnapshotQuestion(
  question: unknown,
  idx?: number
): SnapshotQuestion | null {
  if (typeof question === "string") {
    return {
      id: typeof idx === "number" ? `Q${idx + 1}` : question,
      text: question,
    };
  }
  if (!isRecord(question)) return null;
  const id =
    typeof question.id === "string"
      ? question.id
      : typeof idx === "number"
      ? `Q${idx + 1}`
      : "";
  const text = typeof question.text === "string" ? question.text : "";
  if (!id || !text) return null;
  return {
    id,
    text,
    type: typeof question.type === "string" ? question.type : undefined,
    options: Array.isArray(question.options)
      ? question.options
          .map((opt) => normalizeOption(opt))
          .filter((opt): opt is SnapshotOption => !!opt)
      : undefined,
    min: asNumber(question.min),
    max: asNumber(question.max),
  };
}

function normalizeOption(option: unknown): SnapshotOption | null {
  if (!isRecord(option)) return null;
  const label = typeof option.label === "string" ? option.label : null;
  if (!label || !Object.prototype.hasOwnProperty.call(option, "value")) {
    return null;
  }
  return { value: option.value, label };
}

function normalizeAssessScoreSnapshot(
  snapshot: unknown,
  cResult: unknown
): {
  snapshot: ScoreSnapshotV1;
  source: NormalizedResult["scoreSource"];
} {
  if (isRecord(snapshot) && typeof snapshot.version === "number") {
    const scores = normalizeScoreList(snapshot.scores);
    const topLabels = resolveTopLabels(snapshot.topLabels, scores);
    return {
      snapshot: {
        version: snapshot.version,
        kind: "assess",
        scores,
        topLabels,
      },
      source: "snapshot",
    };
  }

  if (isRecord(cResult) && Array.isArray(cResult.catsOrdered)) {
    const labels = readStringArray(cResult.catsOrdered);
    const percents = Array.isArray(cResult.percents)
      ? cResult.percents.map((value) => asNumber(value) ?? 0)
      : [];
    const scores = labels.map((label, idx) => ({
      label,
      value: percents[idx] ?? 0,
    }));
    return {
      snapshot: {
        version: ASSESS_SNAPSHOT_VERSION,
        kind: "assess",
        scores,
        topLabels: labels,
      },
      source: "legacy",
    };
  }

  return {
    snapshot: {
      version: ASSESS_SNAPSHOT_VERSION,
      kind: "assess",
      scores: [],
      topLabels: [],
    },
    source: "fallback",
  };
}

function normalizeCheckAiScoreSnapshot(
  snapshot: unknown,
  result: unknown
): {
  snapshot: ScoreSnapshotV1;
  source: NormalizedResult["scoreSource"];
} {
  if (isRecord(snapshot) && typeof snapshot.version === "number") {
    const scores = normalizeScoreList(snapshot.scores);
    const topLabels = resolveTopLabels(snapshot.topLabels, scores);
    return {
      snapshot: {
        version: snapshot.version,
        kind: "check-ai",
        scores,
        topLabels,
      },
      source: "snapshot",
    };
  }

  const scoresFromResult = isRecord(result)
    ? normalizeScoreList(result.scores)
    : [];

  if (
    scoresFromResult.length ||
    (isRecord(result) && Array.isArray(result.topLabels))
  ) {
    const topLabels =
      isRecord(result) && Array.isArray(result.topLabels)
        ? readStringArray(result.topLabels)
        : scoresFromResult
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((score) => score.label);
    return {
      snapshot: {
        version: CHECK_AI_SNAPSHOT_VERSION,
        kind: "check-ai",
        scores: scoresFromResult,
        topLabels,
      },
      source: "legacy",
    };
  }

  return {
    snapshot: {
      version: CHECK_AI_SNAPSHOT_VERSION,
      kind: "check-ai",
      scores: [],
      topLabels: [],
    },
    source: "fallback",
  };
}

function normalizeScore(
  score: unknown
): NormalizedScore | null {
  if (!isRecord(score)) return null;
  const label = typeof score.label === "string" ? score.label : null;
  if (!label) return null;
  const code = typeof score.code === "string" ? score.code : undefined;
  const value = asNumber(score.prob ?? score.value ?? score.percent) ?? 0;
  if (code) {
    return { code, label, value };
  }
  return { label, value };
}

export function buildAssessQuestionSnapshot(): QuestionSnapshotV1 {
  const questions = serializeQuestionSnapshotItems(ASSESS_QUESTIONS);
  return {
    version: ASSESS_SNAPSHOT_VERSION,
    kind: "assess",
    questions,
  };
}

export function buildCheckAiQuestionSnapshot(
  incoming?: unknown
): QuestionSnapshotV1 {
  const normalized = normalizeCheckAiQuestionSnapshot(incoming);
  const questions = serializeQuestionSnapshotItems(normalized.snapshot.questions);
  return {
    version: CHECK_AI_SNAPSHOT_VERSION,
    kind: "check-ai",
    questions,
    options: normalized.snapshot.options ?? CHECK_AI_OPTIONS_LIST,
  };
}

export function buildAssessScoreSnapshot(cResult: unknown): ScoreSnapshotV1 {
  return normalizeAssessScoreSnapshot(null, cResult).snapshot;
}

export function buildCheckAiScoreSnapshot(result: unknown): ScoreSnapshotV1 {
  return normalizeCheckAiScoreSnapshot(null, result).snapshot;
}

export function normalizeAssessmentResult(
  record: AssessmentResult
): NormalizedResult {
  const { snapshot: questionSnapshot, source: questionSource } =
    normalizeAssessQuestionSnapshot(record.questionSnapshot);
  const { snapshot: scoreSnapshot, source: scoreSource } =
    normalizeAssessScoreSnapshot(record.scoreSnapshot, record.cResult);
  return {
    kind: "assess",
    snapshotVersion: questionSnapshot.version,
    questionSource,
    scoreSource,
    questions: questionSnapshot.questions,
    options: [],
    scores: scoreSnapshot.scores,
    topLabels: scoreSnapshot.topLabels ?? [],
    createdAt: record.createdAt?.toISOString(),
    tzOffsetMinutes: record.tzOffsetMinutes ?? 0,
  };
}

export function normalizeCheckAiResult(record: CheckAiResult): NormalizedResult {
  const { snapshot: questionSnapshot, source: questionSource } =
    normalizeCheckAiQuestionSnapshot(record.questionSnapshot);
  const { snapshot: scoreSnapshot, source: scoreSource } =
    normalizeCheckAiScoreSnapshot(record.scoreSnapshot, record.result);
  return {
    kind: "check-ai",
    snapshotVersion: questionSnapshot.version,
    questionSource,
    scoreSource,
    questions: questionSnapshot.questions,
    options: questionSnapshot.options ?? [],
    scores: scoreSnapshot.scores,
    topLabels: scoreSnapshot.topLabels ?? [],
    createdAt: record.createdAt?.toISOString(),
    tzOffsetMinutes: record.tzOffsetMinutes ?? 0,
  };
}

export function pickCheckAiResultSummary(result: unknown): { topLabels: string[] } {
  const topLabels = isRecord(result) ? readStringArray(result.topLabels) : [];
  return { topLabels };
}

export function pickAssessResultSummary(
  scoreSnapshot: ScoreSnapshotV1,
  fallback?: unknown
): { catsOrdered: string[]; percents: number[] } {
  if (scoreSnapshot.scores.length) {
    const catsOrdered = scoreSnapshot.scores.map((score) => score.label);
    const percents = scoreSnapshot.scores.map((score) => score.value);
    return { catsOrdered, percents };
  }
  if (isRecord(fallback) && Array.isArray(fallback.catsOrdered)) {
    return {
      catsOrdered: readStringArray(fallback.catsOrdered),
      percents: Array.isArray(fallback.percents)
        ? fallback.percents.filter(
            (value): value is number => typeof value === "number"
          )
        : [],
    };
  }
  return { catsOrdered: [], percents: [] };
}

export function assertSnapshotVersion(snapshot: { version?: number } | null, label: string) {
  if (!snapshot || typeof snapshot.version !== "number") {
    throw new Error(`${label} missing snapshot version`);
  }
}
