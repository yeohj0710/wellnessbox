export const ASSESS_SNAPSHOT_VERSION = 1 as const;
export const CHECK_AI_SNAPSHOT_VERSION = 1 as const;

export type SnapshotSource = "snapshot" | "legacy" | "fallback";

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

export type NormalizedScore = {
  code?: string;
  label: string;
  value: number;
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
  questionSource: SnapshotSource;
  scoreSource: SnapshotSource;
  questions: SnapshotQuestion[];
  options: SnapshotOption[];
  scores: NormalizedScore[];
  topLabels: string[];
  createdAt?: string;
  tzOffsetMinutes?: number;
};
