import type {
  NhisFetchRoutePayload,
  NhisFetchTarget,
} from "@/lib/server/hyphen/fetch-contract";
import { asRecord } from "./employee-sync-summary.normalizer";

export const RAW_TARGET_KEY_MAP: Record<NhisFetchTarget, string> = {
  medical: "medical",
  medication: "medication",
  checkupList: "checkupList",
  checkupYearly: "checkupYearly",
  checkupOverview: "checkupOverview",
  healthAge: "healthAge",
};

export function hasRawTargetPayload(
  raw: Record<string, unknown> | null,
  target: NhisFetchTarget
) {
  if (!raw) return false;
  const key = RAW_TARGET_KEY_MAP[target];
  if (!key) return false;
  return raw[key] != null;
}

export function mergeRawPayloadByTargets(input: {
  baseRaw: NhisFetchRoutePayload["data"] extends infer T
    ? T extends { raw?: infer R }
      ? R
      : unknown
    : unknown;
  patchRaw: NhisFetchRoutePayload["data"] extends infer T
    ? T extends { raw?: infer R }
      ? R
      : unknown
    : unknown;
  targets: NhisFetchTarget[];
}) {
  const base = asRecord(input.baseRaw);
  const patch = asRecord(input.patchRaw);
  if (!base && !patch) return null;

  const merged: Record<string, unknown> = { ...(base ?? {}) };
  for (const target of input.targets) {
    const rawKey = RAW_TARGET_KEY_MAP[target];
    if (!rawKey) continue;
    if (patch && Object.prototype.hasOwnProperty.call(patch, rawKey)) {
      merged[rawKey] = patch[rawKey];
    }
  }

  return merged;
}

export function payloadHasRequestedRawTargets(
  payload: NhisFetchRoutePayload,
  targets: NhisFetchTarget[]
) {
  const raw = asRecord(payload.data?.raw);
  if (!raw) return false;
  for (const target of targets) {
    const key = RAW_TARGET_KEY_MAP[target];
    if (!key) continue;
    if (raw[key] == null) return false;
  }
  return true;
}
