import { type NhisFetchTarget } from "@/lib/server/hyphen/fetch-contract";
import {
  hasMedicationNameInRows,
  hasMedicalMedicationHint,
  normalizeMedicationContainer,
  payloadHasMedicationNames,
  resolveMedicalRows,
  resolveMedicationRows,
} from "./employee-sync-summary.medication-normalizer";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveCheckupRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = normalized?.checkup;
  if (Array.isArray(checkup)) return checkup;
  const checkupRecord = asRecord(checkup);
  if (!checkupRecord) return null;
  if (Array.isArray(checkupRecord.overview)) return checkupRecord.overview;
  if (Array.isArray(checkupRecord.list)) return checkupRecord.list;
  if ("overview" in checkupRecord || "list" in checkupRecord) return [];
  return null;
}

function resolveSummaryPatchNeeds(normalizedJson: unknown) {
  const missing = new Set<NhisFetchTarget>();
  const medicationRows = resolveMedicationRows(normalizedJson);
  const medicalRows = resolveMedicalRows(normalizedJson);
  const checkupRows = resolveCheckupRows(normalizedJson);
  const medicationNeedsNameBackfill =
    (medicationRows != null &&
      medicationRows.length > 0 &&
      !hasMedicationNameInRows(medicationRows)) ||
    (medicationRows != null &&
      medicationRows.length === 0 &&
      medicalRows != null &&
      medicalRows.some((row) => hasMedicalMedicationHint(row)));

  if (medicationRows == null || medicationNeedsNameBackfill) {
    missing.add("medication");
  }
  if (checkupRows == null) {
    missing.add("checkupOverview");
  }
  return {
    targets: [...missing],
    medicationNeedsNameBackfill,
  };
}

function mergeSummaryNormalizedPayload(input: {
  baseNormalized: unknown;
  patchNormalized: unknown;
  targets: NhisFetchTarget[];
  medicationNameBackfill: boolean;
}) {
  const base = asRecord(input.baseNormalized) ?? {};
  const patch = asRecord(input.patchNormalized) ?? {};
  const merged: Record<string, unknown> = { ...base };

  if (input.targets.includes("medication") && patch.medication !== undefined) {
    const patchMedicationRows = resolveMedicationRows({
      medication: patch.medication,
    });
    const patchHasMedicationNames =
      patchMedicationRows != null && hasMedicationNameInRows(patchMedicationRows);
    if (!input.medicationNameBackfill || patchHasMedicationNames) {
      merged.medication = normalizeMedicationContainer(patch.medication);
    }
  }

  if (input.targets.includes("checkupOverview")) {
    const baseCheckup = asRecord(base.checkup) ?? {};
    const patchCheckup = asRecord(patch.checkup) ?? {};
    const mergedCheckup: Record<string, unknown> = { ...baseCheckup };
    if (patchCheckup.overview !== undefined) {
      mergedCheckup.overview = patchCheckup.overview;
    } else if (patch.checkup !== undefined && Array.isArray(patch.checkup)) {
      mergedCheckup.overview = patch.checkup;
    }
    merged.checkup = mergedCheckup;
  }

  return merged;
}

export {
  asArray,
  asRecord,
  mergeSummaryNormalizedPayload,
  payloadHasMedicationNames,
  resolveSummaryPatchNeeds,
};
