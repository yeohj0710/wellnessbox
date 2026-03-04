import db from "@/lib/db";
import {
  extractMedicationRows,
  type MedicationContainerState,
} from "@/lib/b2b/report-payload-health";
import { asRecord } from "@/lib/b2b/report-payload-shared";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";

type ReportMedicationRow = {
  medicationName: string;
  hospitalName: string | null;
  date: string | null;
  dosageDay: string | null;
};

type ResolveReportMedicationRowsInput = {
  employeeId: string;
  periodKey: string;
  latestSnapshotId: string | null;
  normalizedJson: unknown;
  rawJson: unknown;
};

type ResolveReportMedicationRowsResult = {
  rows: ReportMedicationRow[];
  containerState: MedicationContainerState;
};

const MEDICATION_HISTORY_LOOKBACK = 8;
const MEDICATION_CROSS_PERIOD_HISTORY_LOOKBACK = 12;
const REPORT_MEDICATION_VISIT_LIMIT = 3;
const MEDICATION_DERIVED_PHARMACY_LABEL = "\uc57d\uad6d \uc870\uc81c";
const MEDICATION_DERIVED_VISIT_SUFFIX = " \uc9c4\ub8cc";

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return value;
  if (
    !text.startsWith("{") &&
    !text.startsWith("[")
  ) {
    return value;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

function asParsedRecord(value: unknown) {
  return asRecord(parseMaybeJson(value));
}

function extractMedicationRowsFromRawPayload(payload: unknown): ReportMedicationRow[] {
  const candidates: unknown[] = [];
  const seen = new Set<unknown>();
  const appendCandidate = (value: unknown) => {
    const parsed = parseMaybeJson(value);
    if (!parsed || seen.has(parsed)) return;
    seen.add(parsed);
    candidates.push(parsed);
  };

  appendCandidate(payload);

  const root = asParsedRecord(payload);
  if (root) {
    appendCandidate(root.raw);
    appendCandidate(root.data);
    appendCandidate(asParsedRecord(root.data)?.raw);
    appendCandidate(root.payload);
    appendCandidate(asParsedRecord(root.payload)?.data);
    appendCandidate(asParsedRecord(asParsedRecord(root.payload)?.data)?.raw);
  }

  for (const candidate of candidates) {
    const record = asParsedRecord(candidate);
    if (!record) continue;
    const treatment = normalizeTreatmentPayload(record as Record<string, unknown>);
    if (!Array.isArray(treatment.list) || treatment.list.length === 0) continue;

    const pseudoNormalized = {
      medication: {
        list: treatment.list,
      },
    };
    const rows = extractMedicationRows(pseudoNormalized).rows;
    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function resolveRawPayloadByKey(rawJson: unknown, key: "medication" | "medical") {
  const root = asParsedRecord(rawJson);
  if (!root) return null;

  const rootRaw = asParsedRecord(root.raw);
  const rootRawRaw = asParsedRecord(rootRaw?.raw);
  const rootRawData = asParsedRecord(rootRaw?.data);
  const rootRawDataRaw = asParsedRecord(rootRawData?.raw);
  const rootData = asParsedRecord(root.data);
  const rootDataRaw = asParsedRecord(rootData?.raw);
  const rootPayload = asParsedRecord(root.payload);
  const rootPayloadRaw = asParsedRecord(rootPayload?.raw);
  const rootPayloadData = asParsedRecord(rootPayload?.data);
  const rootPayloadDataRaw = asParsedRecord(rootPayloadData?.raw);

  const candidates = [
    rootRaw?.[key],
    rootRawRaw?.[key],
    rootRawData?.[key],
    rootRawDataRaw?.[key],
    rootDataRaw?.[key],
    rootData?.[key],
    rootPayloadDataRaw?.[key],
    rootPayloadRaw?.[key],
    rootPayloadData?.[key],
    root[key],
  ];

  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    const parsedCandidate = parseMaybeJson(candidate);
    if (parsedCandidate !== undefined) {
      return parsedCandidate;
    }
  }
  return null;
}

function extractMedicationRowsFromRaw(rawJson: unknown): ReportMedicationRow[] {
  const medicationPayload = resolveRawPayloadByKey(rawJson, "medication");
  const medicalPayload = resolveRawPayloadByKey(rawJson, "medical");

  const medicationRows = extractMedicationRowsFromRawPayload(medicationPayload);
  const medicalRows = extractMedicationRowsFromRawPayload(medicalPayload);
  if (medicationRows.length === 0 && medicalRows.length === 0) return [];

  return mergeMedicationRows({
    primaryRows: medicationRows.length > 0 ? medicationRows : medicalRows,
    fallbackRows: medicationRows.length > 0 ? medicalRows : [],
  });
}

function parseMedicationDateScore(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    const score = Number(digits.slice(0, 8));
    return Number.isFinite(score) ? score : 0;
  }
  if (digits.length >= 6) {
    const score = Number(`${digits.slice(0, 6)}01`);
    return Number.isFinite(score) ? score : 0;
  }
  return 0;
}

function medicationVisitKey(row: ReportMedicationRow, fallbackIndex: number) {
  const date = (row.date ?? "").trim();
  const hospital = (row.hospitalName ?? "").trim();
  if (!date && !hospital) return `unknown-${fallbackIndex}`;
  return `${date}|${hospital}`;
}

function isDerivedMedicationLabel(name: string | null | undefined) {
  const text = (name ?? "").trim();
  if (!text) return true;
  return (
    text === MEDICATION_DERIVED_PHARMACY_LABEL ||
    text.endsWith(MEDICATION_DERIVED_VISIT_SUFFIX)
  );
}

function medicationNameQuality(name: string | null | undefined) {
  const text = (name ?? "").trim();
  if (!text) return 0;
  if (isDerivedMedicationLabel(text)) return 1;
  return 2;
}

function hasNamedMedicationRows(rows: ReportMedicationRow[]) {
  return rows.some((row) => medicationNameQuality(row.medicationName) >= 2);
}

function selectSortedRowsFromVisitMap(
  byVisit: Map<string, { row: ReportMedicationRow; order: number }>
) {
  return [...byVisit.values()]
    .sort((left, right) => {
      const scoreDiff =
        parseMedicationDateScore(right.row.date) -
        parseMedicationDateScore(left.row.date);
      if (scoreDiff !== 0) return scoreDiff;
      const qualityDiff =
        medicationNameQuality(right.row.medicationName) -
        medicationNameQuality(left.row.medicationName);
      if (qualityDiff !== 0) return qualityDiff;
      return left.order - right.order;
    })
    .map((item) => item.row);
}

function mergeMedicationRows(input: {
  primaryRows: ReportMedicationRow[];
  fallbackRows: ReportMedicationRow[];
}) {
  const byVisit = new Map<string, { row: ReportMedicationRow; order: number }>();
  let order = 0;

  const appendRows = (rows: ReportMedicationRow[]) => {
    for (const row of rows) {
      const key = medicationVisitKey(row, order);
      const existing = byVisit.get(key);
      if (!existing) {
        byVisit.set(key, { row, order });
        order += 1;
        continue;
      }
      existing.row = pickPreferredMedicationRow(existing.row, row);
    }
  };

  appendRows(input.primaryRows);
  appendRows(input.fallbackRows);

  return selectSortedRowsFromVisitMap(byVisit);
}

function pickPreferredMedicationRow(
  left: ReportMedicationRow,
  right: ReportMedicationRow
) {
  const leftQuality = medicationNameQuality(left.medicationName);
  const rightQuality = medicationNameQuality(right.medicationName);
  if (rightQuality > leftQuality) return right;
  if (leftQuality > rightQuality) return left;

  const leftDate = parseMedicationDateScore(left.date);
  const rightDate = parseMedicationDateScore(right.date);
  if (rightDate > leftDate) return right;
  if (leftDate > rightDate) return left;

  const leftNameLength = (left.medicationName ?? "").trim().length;
  const rightNameLength = (right.medicationName ?? "").trim().length;
  if (rightNameLength > leftNameLength) return right;
  return left;
}

function extractRowsFromHistorySnapshot(snapshot: {
  normalizedJson: unknown;
  rawJson: unknown;
}) {
  const rowsFromRaw = extractMedicationRowsFromRaw(snapshot.rawJson);
  const rowsFromNormalized = extractMedicationRows(snapshot.normalizedJson).rows;
  return mergeMedicationRows({
    primaryRows: rowsFromRaw.length > 0 ? rowsFromRaw : rowsFromNormalized,
    fallbackRows: rowsFromRaw.length > 0 ? rowsFromNormalized : rowsFromRaw,
  });
}

async function resolveMedicationRowsFromHistory(input: {
  employeeId: string;
  periodKey: string;
  latestSnapshotId: string | null;
  primaryRows: ReportMedicationRow[];
}) {
  const byVisit = new Map<string, { row: ReportMedicationRow; order: number }>();
  let order = 0;

  const appendRows = (rows: ReportMedicationRow[]) => {
    for (const row of rows) {
      const key = medicationVisitKey(row, order);
      const existing = byVisit.get(key);
      if (!existing) {
        byVisit.set(key, { row, order });
        order += 1;
        continue;
      }
      existing.row = pickPreferredMedicationRow(existing.row, row);
    }
  };

  const buildRows = () => selectSortedRowsFromVisitMap(byVisit);
  const hasNamedRows = () => hasNamedMedicationRows(buildRows());

  appendRows(input.primaryRows);
  if (input.primaryRows.length > 0 && hasNamedRows()) {
    return buildRows();
  }

  const samePeriodHistorySnapshots = await db.b2bHealthDataSnapshot.findMany({
    where: {
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      sourceMode: "hyphen",
      ...(input.latestSnapshotId ? { id: { not: input.latestSnapshotId } } : {}),
    },
    orderBy: { fetchedAt: "desc" },
    select: { normalizedJson: true, rawJson: true },
    take: MEDICATION_HISTORY_LOOKBACK,
  });

  for (const snapshot of samePeriodHistorySnapshots) {
    const rows = extractRowsFromHistorySnapshot(snapshot);
    if (rows.length === 0) continue;
    appendRows(rows);
    if (hasNamedRows()) return buildRows();
  }

  const crossPeriodHistorySnapshots = await db.b2bHealthDataSnapshot.findMany({
    where: {
      employeeId: input.employeeId,
      sourceMode: "hyphen",
      periodKey: { not: input.periodKey },
      ...(input.latestSnapshotId ? { id: { not: input.latestSnapshotId } } : {}),
    },
    orderBy: { fetchedAt: "desc" },
    select: { normalizedJson: true, rawJson: true },
    take: MEDICATION_CROSS_PERIOD_HISTORY_LOOKBACK,
  });

  for (const snapshot of crossPeriodHistorySnapshots) {
    const rows = extractRowsFromHistorySnapshot(snapshot);
    if (rows.length === 0) continue;
    appendRows(rows);
  }

  return buildRows();
}

export async function resolveReportMedicationRows(
  input: ResolveReportMedicationRowsInput
): Promise<ResolveReportMedicationRowsResult> {
  const medicationExtraction = extractMedicationRows(input.normalizedJson);
  const medicationRowsFromRaw = extractMedicationRowsFromRaw(input.rawJson);
  const primaryRows = mergeMedicationRows({
    primaryRows:
      medicationRowsFromRaw.length > 0
        ? medicationRowsFromRaw
        : medicationExtraction.rows,
    fallbackRows:
      medicationRowsFromRaw.length > 0 ? medicationExtraction.rows : [],
  });
  const shouldBackfillFromHistory =
    Boolean(input.latestSnapshotId) &&
    (primaryRows.length === 0 || !hasNamedMedicationRows(primaryRows));
  const rows =
    shouldBackfillFromHistory
      ? await resolveMedicationRowsFromHistory({
          employeeId: input.employeeId,
          periodKey: input.periodKey,
          latestSnapshotId: input.latestSnapshotId,
          primaryRows,
        })
      : primaryRows;

  return {
    rows: rows.slice(0, REPORT_MEDICATION_VISIT_LIMIT),
    containerState: medicationExtraction.containerState,
  };
}
