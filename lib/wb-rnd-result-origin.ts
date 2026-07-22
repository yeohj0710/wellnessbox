export type WbRndResultOrigin =
  | {
      kind: "rnd_execution";
      label: "R&D 실행 결과";
      executionId: string;
      generatedAt: string;
    }
  | {
      kind: "local_snapshot";
      label: "로컬 스냅샷 결과";
      snapshotId: string;
      generatedAt: string;
      reason: string;
    };

type OriginInput = {
  source: "rnd" | "fallback";
  response: unknown;
  requestedAt: string;
  fallbackReason: string | null;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveWbRndResultOrigin(input: OriginInput): WbRndResultOrigin {
  if (input.source === "rnd") {
    if (!record(input.response) || typeof input.response.execution_id !== "string") {
      throw new Error("WB_RND_RESULT_ORIGIN_missing_execution_id");
    }
    const metadata = record(input.response.metadata) ? input.response.metadata : null;
    const generatedAt = metadata?.generated_at;
    if (typeof generatedAt !== "string") {
      throw new Error("WB_RND_RESULT_ORIGIN_missing_generated_at");
    }
    return {
      kind: "rnd_execution",
      label: "R&D 실행 결과",
      executionId: input.response.execution_id,
      generatedAt,
    };
  }

  if (!input.fallbackReason) {
    throw new Error("WB_RND_RESULT_ORIGIN_missing_fallback_reason");
  }
  const fallbackExecutionId =
    record(input.response) && typeof input.response.execution_id === "string"
      ? input.response.execution_id
      : null;
  return {
    kind: "local_snapshot",
    label: "로컬 스냅샷 결과",
    snapshotId: fallbackExecutionId
      ? `snapshot_${fallbackExecutionId.replace(/^exec_/, "")}`
      : `snapshot_${input.requestedAt.replace(/[^0-9]/g, "")}`,
    generatedAt: input.requestedAt,
    reason: input.fallbackReason,
  };
}
