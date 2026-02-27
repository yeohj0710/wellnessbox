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

const MEDICATION_RECENT_LIMIT = 3;
const MEDICATION_HISTORY_LOOKBACK = 8;
const MEDICATION_DERIVED_PHARMACY_LABEL = "\uc57d\uad6d \uc870\uc81c";
const MEDICATION_DERIVED_VISIT_SUFFIX = " \uc9c4\ub8cc";

function extractMedicationRowsFromRaw(rawJson: unknown): ReportMedicationRow[] {
  const root = asRecord(rawJson);
  const data = asRecord(root?.data) ?? root;
  const raw = asRecord(data?.raw);
  const medicationPayload = raw?.medication;
  if (!medicationPayload) return [];

  const treatment = normalizeTreatmentPayload(
    medicationPayload as Record<string, unknown>
  );
  if (!Array.isArray(treatment.list) || treatment.list.length === 0) return [];

  const pseudoNormalized = {
    medication: {
      list: treatment.list,
    },
  };
  return extractMedicationRows(pseudoNormalized).rows;
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

async function resolveRecentMedicationRows(input: {
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

  appendRows(input.primaryRows);
  if (byVisit.size >= MEDICATION_RECENT_LIMIT) {
    return [...byVisit.values()]
      .sort((left, right) => {
        const scoreDiff =
          parseMedicationDateScore(right.row.date) -
          parseMedicationDateScore(left.row.date);
        if (scoreDiff !== 0) return scoreDiff;
        return left.order - right.order;
      })
      .slice(0, MEDICATION_RECENT_LIMIT)
      .map((item) => item.row);
  }

  const historySnapshots = await db.b2bHealthDataSnapshot.findMany({
    where: {
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      sourceMode: "hyphen",
      ...(input.latestSnapshotId ? { id: { not: input.latestSnapshotId } } : {}),
    },
    orderBy: { fetchedAt: "desc" },
    select: { normalizedJson: true },
    take: MEDICATION_HISTORY_LOOKBACK,
  });

  for (const snapshot of historySnapshots) {
    const rows = extractMedicationRows(snapshot.normalizedJson).rows;
    if (rows.length === 0) continue;
    appendRows(rows);
    if (byVisit.size >= MEDICATION_RECENT_LIMIT) break;
  }

  return [...byVisit.values()]
    .sort((left, right) => {
      const scoreDiff =
        parseMedicationDateScore(right.row.date) -
        parseMedicationDateScore(left.row.date);
      if (scoreDiff !== 0) return scoreDiff;
      return left.order - right.order;
    })
    .slice(0, MEDICATION_RECENT_LIMIT)
    .map((item) => item.row);
}

export async function resolveReportMedicationRows(
  input: ResolveReportMedicationRowsInput
): Promise<ResolveReportMedicationRowsResult> {
  const medicationExtraction = extractMedicationRows(input.normalizedJson);
  const medicationRowsFromRaw = extractMedicationRowsFromRaw(input.rawJson);
  const primaryRows =
    medicationRowsFromRaw.length > 0
      ? medicationRowsFromRaw
      : medicationExtraction.rows;
  const rows =
    input.latestSnapshotId && primaryRows.length < MEDICATION_RECENT_LIMIT
      ? await resolveRecentMedicationRows({
          employeeId: input.employeeId,
          periodKey: input.periodKey,
          latestSnapshotId: input.latestSnapshotId,
          primaryRows,
        })
      : primaryRows;

  return {
    rows,
    containerState: medicationExtraction.containerState,
  };
}
