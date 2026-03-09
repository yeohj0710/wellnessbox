import { asRecord } from "@/lib/b2b/report-payload-shared";
import {
  collectMedicationEffectsByKeys,
  collectMedicationNamesByKeys,
  hasNamedEntry,
  isDerivedMedicationLabel,
  isLikelyPharmacyVisit,
  MEDICATION_DATE_KEYS,
  MEDICATION_DERIVED_PHARMACY_LABEL,
  MEDICATION_DOSAGE_KEYS,
  MEDICATION_EFFECT_KEYS,
  MEDICATION_HOSPITAL_KEYS,
  MEDICATION_NAME_KEYS,
  MEDICATION_VISIT_TYPE_KEYS,
  pickFirstByKeys,
  resolveMedicationDateScore,
  resolveMedicationFallbackName,
  resolveMedicationVisitKey,
  resolveRowsFromContainer,
  resolveVisitLimit,
  type MedicationRow,
} from "@/lib/b2b/report-payload-health-medication-helpers";

export type MedicationContainerState = "present" | "missing" | "unrecognized";

type ExtractMedicationRowsOptions = {
  maxVisits?: number | null;
};

export function extractMedicationRows(
  normalizedJson: unknown,
  options?: ExtractMedicationRowsOptions
): {
  rows: MedicationRow[];
  containerState: MedicationContainerState;
} {
  const normalized = asRecord(normalizedJson);
  if (!normalized || !("medication" in normalized)) {
    return { rows: [], containerState: "missing" };
  }

  const medicationRaw = normalized.medication;
  const medicationRecord = asRecord(medicationRaw);
  const medicationRows = resolveRowsFromContainer(medicationRaw);
  const medicalRows = resolveRowsFromContainer(normalized.medical);

  const containerState: MedicationContainerState =
    Array.isArray(medicationRaw) ||
    Array.isArray(medicationRecord?.list) ||
    Array.isArray(medicationRecord?.rows) ||
    Array.isArray(medicationRecord?.items) ||
    Array.isArray(medicationRecord?.history)
      ? "present"
      : medicationRecord
        ? "unrecognized"
        : "missing";

  const byVisit = new Map<
    string,
    { entries: MedicationRow[]; score: number; firstIndex: number }
  >();

  for (const [index, row] of medicationRows.entries()) {
    const hospitalName = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) || null;
    const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS);
    const pharmacyVisit = isLikelyPharmacyVisit({ visitType, hospitalName });
    const medicationNames = collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS);
    const medicationName =
      (medicationNames.length > 0 ? medicationNames.join(", ") : null) ??
      resolveMedicationFallbackName(row, pharmacyVisit);
    if (!medicationName) continue;
    const medicationEffects = collectMedicationEffectsByKeys(
      row,
      MEDICATION_EFFECT_KEYS
    );

    const entry: MedicationRow = {
      medicationName,
      hospitalName,
      date: pickFirstByKeys(row, MEDICATION_DATE_KEYS) || null,
      dosageDay: pickFirstByKeys(row, MEDICATION_DOSAGE_KEYS) || null,
      medicationEffects,
    };

    const visitKey = resolveMedicationVisitKey(row, index);
    const score = resolveMedicationDateScore(row);
    const group = byVisit.get(visitKey);
    if (!group) {
      byVisit.set(visitKey, {
        entries: [entry],
        score,
        firstIndex: index,
      });
      continue;
    }
    group.entries.push(entry);
    if (score > group.score) group.score = score;
  }

  const hasNamedFromMedication = [...byVisit.values()].some((group) =>
    hasNamedEntry(group.entries)
  );
  if ((!hasNamedFromMedication || byVisit.size === 0) && medicalRows.length > 0) {
    const offset = medicationRows.length;
    for (const [index, row] of medicalRows.entries()) {
      const mergedIndex = offset + index;
      const visitKey = resolveMedicationVisitKey(row, mergedIndex);
      if (byVisit.has(visitKey)) continue;

      const hospitalName = pickFirstByKeys(row, MEDICATION_HOSPITAL_KEYS) || null;
      const visitType = pickFirstByKeys(row, MEDICATION_VISIT_TYPE_KEYS);
      const pharmacyVisit = isLikelyPharmacyVisit({ visitType, hospitalName });
      const medicationNames = collectMedicationNamesByKeys(row, MEDICATION_NAME_KEYS);
      const medicationName =
        (medicationNames.length > 0 ? medicationNames.join(", ") : null) ??
        resolveMedicationFallbackName(row, pharmacyVisit);
      if (!medicationName) continue;
      const medicationEffects = collectMedicationEffectsByKeys(
        row,
        MEDICATION_EFFECT_KEYS
      );

      const score = resolveMedicationDateScore(row);
      byVisit.set(visitKey, {
        entries: [
          {
            medicationName,
            hospitalName,
            date: pickFirstByKeys(row, MEDICATION_DATE_KEYS) || null,
            dosageDay: pickFirstByKeys(row, MEDICATION_DOSAGE_KEYS) || null,
            medicationEffects,
          },
        ],
        score,
        firstIndex: mergedIndex,
      });
    }
  }

  const visitLimit = resolveVisitLimit(options?.maxVisits);
  const rows = [...byVisit.values()]
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) return scoreDiff;
      return left.firstIndex - right.firstIndex;
    })
    .slice(0, visitLimit ?? undefined)
    .map((group) => {
      const representative =
        group.entries.find(
          (item) => !isDerivedMedicationLabel(item.medicationName)
        ) ?? group.entries[0];
      if (!representative) {
        return {
          medicationName: "-",
          hospitalName: null,
          date: null,
          dosageDay: null,
          medicationEffects: [],
        };
      }

      const names: string[] = [];
      const seenNames = new Set<string>();
      for (const item of group.entries) {
        const name = item.medicationName.trim();
        if (!name || seenNames.has(name)) continue;
        seenNames.add(name);
        names.push(name);
      }
      const effects: string[] = [];
      const seenEffects = new Set<string>();
      for (const item of group.entries) {
        for (const effect of item.medicationEffects) {
          const normalized = effect.trim();
          if (!normalized || seenEffects.has(normalized)) continue;
          seenEffects.add(normalized);
          effects.push(normalized);
        }
      }

      return {
        ...representative,
        medicationName:
          names.length > 0
            ? names.join(", ")
            : representative.medicationName,
        medicationEffects: effects,
      };
    });

  return {
    rows,
    containerState,
  };
}

export {
  MEDICATION_DERIVED_PHARMACY_LABEL,
} from "@/lib/b2b/report-payload-health-medication-helpers";
