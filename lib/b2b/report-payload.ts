import "server-only";

import db from "@/lib/db";
import { maskBirthDate, maskPhone } from "@/lib/b2b/identity";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export type B2bReportPayload = {
  meta: {
    employeeId: string;
    employeeName: string;
    birthDateMasked: string;
    phoneMasked: string;
    generatedAt: string;
    variantIndex: number;
    stylePreset: string;
  };
  health: {
    fetchedAt: string | null;
    metrics: Array<{
      metric: string;
      value: string;
      unit: string | null;
    }>;
    medications: Array<{
      medicationName: string;
      hospitalName: string | null;
      date: string | null;
      dosageDay: string | null;
    }>;
  };
  survey: {
    templateVersion: number | null;
    selectedSections: string[];
    answers: Array<{
      questionKey: string;
      sectionKey: string | null;
      answerText: string | null;
      answerValue: string | null;
    }>;
    updatedAt: string | null;
  };
  analysis: {
    version: number | null;
    payload: unknown;
    updatedAt: string | null;
  };
  pharmacist: {
    note: string | null;
    recommendations: string | null;
    cautions: string | null;
    updatedAt: string | null;
  };
};

function extractHealthMetrics(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const checkup = asRecord(normalized?.checkup);
  const overview = asArray(checkup?.overview);
  const metrics: Array<{ metric: string; value: string; unit: string | null }> = [];
  const seen = new Set<string>();

  for (const item of overview) {
    const row = asRecord(item);
    if (!row) continue;
    const metric = toText(row.itemName ?? row.metric ?? row.inspectItem ?? row.type);
    const value = toText(row.value ?? row.itemData ?? row.result);
    const unitRaw = toText(row.unit);
    const unit = unitRaw.length > 0 ? unitRaw : null;
    if (!metric || !value) continue;
    const uniqueKey = `${metric}|${value}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    metrics.push({ metric, value, unit });
    if (metrics.length >= 12) break;
  }

  return metrics;
}

function extractMedicationRows(normalizedJson: unknown) {
  const normalized = asRecord(normalizedJson);
  const medication = asRecord(normalized?.medication);
  const list = asArray(medication?.list);
  const rows: Array<{
    medicationName: string;
    hospitalName: string | null;
    date: string | null;
    dosageDay: string | null;
  }> = [];

  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const medicationName = toText(row.medicineNm ?? row.drug_MEDI_PRDC_NM ?? row.MEDI_PRDC_NM);
    if (!medicationName) continue;
    rows.push({
      medicationName,
      hospitalName: toText(row.hospitalNm || row.hspNm) || null,
      date: toText(row.diagDate || row.medDate || row.detail_PRSC_YMD) || null,
      dosageDay: toText(row.dosageDay) || null,
    });
    if (rows.length >= 3) break;
  }

  return rows;
}

export async function buildB2bReportPayload(input: {
  employeeId: string;
  variantIndex: number;
  stylePreset: string;
}) {
  const [employee, latestHealth, latestSurvey, latestAnalysis, latestNote] =
    await Promise.all([
      db.b2bEmployee.findUnique({
        where: { id: input.employeeId },
      }),
      db.b2bHealthDataSnapshot.findFirst({
        where: { employeeId: input.employeeId },
        orderBy: { fetchedAt: "desc" },
      }),
      db.b2bSurveyResponse.findFirst({
        where: { employeeId: input.employeeId },
        include: {
          answers: {
            orderBy: [{ sectionKey: "asc" }, { questionKey: "asc" }],
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.b2bAnalysisResult.findFirst({
        where: { employeeId: input.employeeId },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      }),
      db.b2bPharmacistNote.findFirst({
        where: { employeeId: input.employeeId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  if (!employee) {
    throw new Error("Employee not found");
  }

  const metrics = extractHealthMetrics(latestHealth?.normalizedJson);
  const medications = extractMedicationRows(latestHealth?.normalizedJson);

  const payload: B2bReportPayload = {
    meta: {
      employeeId: employee.id,
      employeeName: employee.name,
      birthDateMasked: maskBirthDate(employee.birthDate),
      phoneMasked: maskPhone(employee.phoneNormalized),
      generatedAt: new Date().toISOString(),
      variantIndex: input.variantIndex,
      stylePreset: input.stylePreset,
    },
    health: {
      fetchedAt: latestHealth?.fetchedAt?.toISOString() ?? null,
      metrics,
      medications,
    },
    survey: {
      templateVersion: latestSurvey?.templateVersion ?? null,
      selectedSections: latestSurvey?.selectedSections ?? [],
      answers:
        latestSurvey?.answers.map((answer) => ({
          questionKey: answer.questionKey,
          sectionKey: answer.sectionKey ?? null,
          answerText: answer.answerText ?? null,
          answerValue: answer.answerValue ?? null,
        })) ?? [],
      updatedAt: latestSurvey?.updatedAt?.toISOString() ?? null,
    },
    analysis: {
      version: latestAnalysis?.version ?? null,
      payload: latestAnalysis?.payload ?? null,
      updatedAt:
        latestAnalysis?.updatedAt?.toISOString() ??
        latestAnalysis?.createdAt?.toISOString() ??
        null,
    },
    pharmacist: {
      note: latestNote?.note ?? null,
      recommendations: latestNote?.recommendations ?? null,
      cautions: latestNote?.cautions ?? null,
      updatedAt: latestNote?.updatedAt?.toISOString() ?? null,
    },
  };

  return payload;
}
