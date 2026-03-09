import "server-only";

import { LAYOUT_TEMPLATE_VERSION } from "@/lib/b2b/export/layout-dsl";
import type { LayoutDocument } from "@/lib/b2b/export/layout-types";

const MIN_REPORT_HISTORY_PER_PERIOD = 1;
const MAX_REPORT_HISTORY_PER_PERIOD = 20;
const DEFAULT_REPORT_HISTORY_PER_PERIOD = 5;

export function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export function parseStoredLayout(raw: unknown): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const layout = raw as LayoutDocument;
  if (!Array.isArray(layout.pages) || layout.pages.length === 0) return null;
  if (!layout.pageSizeMm || typeof layout.pageSizeMm.width !== "number") return null;
  if (typeof layout.pageSizeMm.height !== "number") return null;
  return layout;
}

export function isCurrentLayoutVersion(layout: LayoutDocument | null) {
  if (!layout) return false;
  return layout.layoutVersion === LAYOUT_TEMPLATE_VERSION;
}

export function resolveReportHistoryPerPeriodLimit() {
  const raw = Number(process.env.B2B_REPORT_HISTORY_PER_PERIOD);
  if (!Number.isFinite(raw)) return DEFAULT_REPORT_HISTORY_PER_PERIOD;
  const rounded = Math.round(raw);
  return Math.min(
    MAX_REPORT_HISTORY_PER_PERIOD,
    Math.max(MIN_REPORT_HISTORY_PER_PERIOD, rounded)
  );
}

export function resolvePayloadVersion(reportPayload: unknown) {
  if (!reportPayload || typeof reportPayload !== "object") return null;
  const payload = reportPayload as { meta?: { payloadVersion?: unknown } };
  const raw = payload.meta?.payloadVersion;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.round(raw);
}

export function parseMaybeJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function resolveRowsLengthFromContainer(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const record = parseMaybeJsonRecord(value);
  if (!record) return 0;
  const listLike = record.list ?? record.rows ?? record.items ?? record.history;
  if (Array.isArray(listLike)) return listLike.length;
  const dataRecord = parseMaybeJsonRecord(record.data);
  if (Array.isArray(dataRecord?.list)) return dataRecord.list.length;
  return 0;
}

export function hasAnyTreatmentRows(input: {
  normalizedJson: unknown;
  rawJson: unknown;
}) {
  const normalized = parseMaybeJsonRecord(input.normalizedJson);
  const normalizedMedicationLen = resolveRowsLengthFromContainer(normalized?.medication);
  const normalizedMedicalLen = resolveRowsLengthFromContainer(normalized?.medical);
  if (normalizedMedicationLen > 0 || normalizedMedicalLen > 0) return true;

  const root = parseMaybeJsonRecord(input.rawJson);
  if (!root) return false;
  const rootRaw = parseMaybeJsonRecord(root.raw);
  const rootRawRaw = parseMaybeJsonRecord(rootRaw?.raw);
  const rootData = parseMaybeJsonRecord(root.data);
  const rootDataRaw = parseMaybeJsonRecord(rootData?.raw);
  const rootPayload = parseMaybeJsonRecord(root.payload);
  const rootPayloadRaw = parseMaybeJsonRecord(rootPayload?.raw);
  const rootPayloadData = parseMaybeJsonRecord(rootPayload?.data);
  const rootPayloadDataRaw = parseMaybeJsonRecord(rootPayloadData?.raw);

  const rawCandidates = [
    rootRaw?.medical,
    rootRaw?.medication,
    rootRawRaw?.medical,
    rootRawRaw?.medication,
    rootDataRaw?.medical,
    rootDataRaw?.medication,
    rootData?.medical,
    rootData?.medication,
    rootPayloadDataRaw?.medical,
    rootPayloadDataRaw?.medication,
    rootPayloadRaw?.medical,
    rootPayloadRaw?.medication,
    rootPayloadData?.medical,
    rootPayloadData?.medication,
    root.medical,
    root.medication,
  ];

  return rawCandidates.some((candidate) => resolveRowsLengthFromContainer(candidate) > 0);
}

export function resolveMedicationRowsLengthFromReportPayload(reportPayload: unknown) {
  const payload = parseMaybeJsonRecord(reportPayload);
  const health = parseMaybeJsonRecord(payload?.health);
  const medications = health?.medications;
  return Array.isArray(medications) ? medications.length : 0;
}
