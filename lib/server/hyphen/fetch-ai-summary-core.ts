import type { NhisFetchRoutePayload } from "./fetch-contract";
import { buildFallbackSummary, mergeAiSummary } from "./fetch-ai-summary-compose";
import { requestOpenAiSummary } from "./fetch-ai-summary-openai";
import {
  asRecord,
  buildNhisAiSnapshot,
} from "./fetch-ai-summary-snapshot";

export type { NhisAiSummary } from "./fetch-ai-summary-model";

export async function enrichNhisPayloadWithAiSummary(
  payload: NhisFetchRoutePayload
): Promise<NhisFetchRoutePayload> {
  if (!payload.ok) return payload;

  const data = asRecord(payload.data);
  if (!data) return payload;

  const normalized = asRecord(data.normalized);
  if (!normalized) return payload;

  const snapshot = buildNhisAiSnapshot(normalized);
  const fallback = buildFallbackSummary(snapshot);
  const hasAnalyzableData =
    snapshot.checkupCount > 0 || snapshot.medicationCount > 0;
  if (!hasAnalyzableData) {
    normalized.aiSummary = fallback;
    return payload;
  }

  const aiDraft = await requestOpenAiSummary(snapshot);
  normalized.aiSummary = aiDraft
    ? mergeAiSummary(aiDraft, fallback)
    : fallback;

  return payload;
}
