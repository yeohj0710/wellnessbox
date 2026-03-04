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

function extractMedicationRowsFromRawPayload(payload: unknown): ReportMedicationRow[] {
  const record = asRecord(payload);
  if (!record) return [];

  const treatment = normalizeTreatmentPayload(
    record as Record<string, unknown>
  );
  if (!Array.isArray(treatment.list) || treatment.list.length === 0) return [];

  const pseudoNormalized = {
    medication: {
      list: treatment.list,
    },
  };
  return extractMedicationRows(pseudoNormalized).rows;
}

function resolveRawPayloadByKey(rawJson: unknown, key: "medication" | "medical") {
  const root = asRecord(rawJson);
  if (!root) return null;

  const rootRaw = asRecord(root.raw);
  if (rootRaw && rootRaw[key] !== undefined) {
    return rootRaw[key];
  }

  const data = asRecord(root.data);
  const dataRaw = asRecord(data?.raw);
  if (dataRaw && dataRaw[key] !== undefined) {
    return dataRaw[key];
  }

  if (root[key] !== undefined) {
    return root[key];
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
