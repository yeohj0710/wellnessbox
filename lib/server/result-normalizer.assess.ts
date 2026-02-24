import type { AssessmentResult } from "@prisma/client";
import { sectionA, sectionB } from "@/app/assess/data/questions";
import {
  ASSESS_SNAPSHOT_VERSION,
  NormalizedResult,
  QuestionSnapshotV1,
  ScoreSnapshotV1,
  SnapshotQuestion,
  SnapshotSource,
} from "@/lib/server/result-normalizer.types";
import {
  asNumber,
  isRecord,
  normalizeQuestionList,
  normalizeScoreList,
  readStringArray,
  resolveTopLabels,
  serializeQuestionSnapshotItems,
} from "@/lib/server/result-normalizer.shared";

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

function normalizeAssessQuestionSnapshot(snapshot: unknown): {
  snapshot: QuestionSnapshotV1;
  source: SnapshotSource;
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

function normalizeAssessScoreSnapshot(
  snapshot: unknown,
  cResult: unknown
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

export function buildAssessQuestionSnapshot(): QuestionSnapshotV1 {
  const questions = serializeQuestionSnapshotItems(ASSESS_QUESTIONS);
  return {
    version: ASSESS_SNAPSHOT_VERSION,
    kind: "assess",
    questions,
  };
}

export function buildAssessScoreSnapshot(cResult: unknown): ScoreSnapshotV1 {
  return normalizeAssessScoreSnapshot(null, cResult).snapshot;
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
