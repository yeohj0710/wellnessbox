import type { CheckAiResult } from "@prisma/client";
import { CHECK_AI_OPTIONS, CHECK_AI_QUESTIONS } from "@/lib/checkai";
import {
  CHECK_AI_SNAPSHOT_VERSION,
  NormalizedResult,
  QuestionSnapshotV1,
  ScoreSnapshotV1,
  SnapshotOption,
  SnapshotQuestion,
  SnapshotSource,
} from "@/lib/server/result-normalizer.types";
import {
  isRecord,
  normalizeOptionList,
  normalizeQuestionList,
  normalizeScoreList,
  readStringArray,
  resolveTopLabels,
  serializeQuestionSnapshotItems,
} from "@/lib/server/result-normalizer.shared";

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

function normalizeCheckAiQuestionSnapshot(snapshot: unknown): {
  snapshot: QuestionSnapshotV1;
  source: SnapshotSource;
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

function normalizeCheckAiScoreSnapshot(
  snapshot: unknown,
  result: unknown
): {
  snapshot: ScoreSnapshotV1;
  source: SnapshotSource;
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

export function buildCheckAiScoreSnapshot(result: unknown): ScoreSnapshotV1 {
  return normalizeCheckAiScoreSnapshot(null, result).snapshot;
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
