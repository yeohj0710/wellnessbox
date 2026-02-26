import type { NhisFetchRoutePayload } from "@/lib/server/hyphen/fetch-contract";

type SessionArtifacts = {
  cookieData?: unknown;
  stepData?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collectSessionArtifacts(
  value: unknown,
  found: SessionArtifacts,
  depth = 0
) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSessionArtifacts(item, found, depth + 1);
      if (found.cookieData !== undefined && found.stepData !== undefined) return;
    }
    return;
  }

  const record = asRecord(value);
  if (!record) return;
  const data = asRecord(record.data);
  const cookieData =
    data?.cookieData ?? data?.cookie_data ?? record.cookieData ?? record.cookie_data;
  if (found.cookieData === undefined && cookieData != null) {
    found.cookieData = cookieData;
  }
  const stepData =
    data?.stepData ?? data?.step_data ?? record.stepData ?? record.step_data;
  if (found.stepData === undefined && stepData != null) {
    found.stepData = stepData;
  }
  if (found.cookieData !== undefined && found.stepData !== undefined) return;

  for (const child of Object.values(record)) {
    collectSessionArtifacts(child, found, depth + 1);
    if (found.cookieData !== undefined && found.stepData !== undefined) return;
  }
}

export function extractSessionArtifactsFromPayload(payload: NhisFetchRoutePayload) {
  const raw = asRecord(asRecord(payload.data)?.raw);
  if (!raw) return {};
  const orderedCandidates = [
    raw.medication,
    raw.medical,
    raw.checkupOverview,
    raw.healthAge,
    raw.checkupYearly,
    raw.checkupList,
  ];
  const found: SessionArtifacts = {};
  for (const candidate of orderedCandidates) {
    collectSessionArtifacts(candidate, found);
    if (found.cookieData !== undefined && found.stepData !== undefined) break;
  }
  return found;
}
