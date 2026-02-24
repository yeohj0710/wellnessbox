export {
  ASSESS_SNAPSHOT_VERSION,
  CHECK_AI_SNAPSHOT_VERSION,
} from "@/lib/server/result-normalizer.types";
export type {
  NormalizedResult,
  QuestionSnapshotV1,
  ScoreSnapshotV1,
  SnapshotOption,
  SnapshotQuestion,
} from "@/lib/server/result-normalizer.types";

export {
  buildAssessQuestionSnapshot,
  buildAssessScoreSnapshot,
  normalizeAssessmentResult,
  pickAssessResultSummary,
} from "@/lib/server/result-normalizer.assess";
export {
  buildCheckAiQuestionSnapshot,
  buildCheckAiScoreSnapshot,
  normalizeCheckAiResult,
  pickCheckAiResultSummary,
} from "@/lib/server/result-normalizer.check-ai";

export function assertSnapshotVersion(
  snapshot: { version?: number } | null,
  label: string
) {
  if (!snapshot || typeof snapshot.version !== "number") {
    throw new Error(`${label} missing snapshot version`);
  }
}
