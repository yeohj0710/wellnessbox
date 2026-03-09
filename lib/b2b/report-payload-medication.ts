import db from "@/lib/db";
import {
  extractMedicationRows,
  type MedicationContainerState,
} from "@/lib/b2b/report-payload-health";
import {
  extractMedicationRowsFromRaw,
  extractRowsFromHistorySnapshot,
  hasNamedMedicationRows,
  medicationVisitKey,
  mergeMedicationRows,
  pickPreferredMedicationRow,
  prioritizeMedicationRows,
  ReportMedicationRow,
  selectSortedRowsFromVisitMap,
} from "@/lib/b2b/report-payload-medication-helpers";

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
const REPORT_MEDICATION_VISIT_LIMIT = 120;

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
  const prioritizedRows = prioritizeMedicationRows(rows);

  return {
    rows: prioritizedRows.slice(0, REPORT_MEDICATION_VISIT_LIMIT),
    containerState: medicationExtraction.containerState,
  };
}
