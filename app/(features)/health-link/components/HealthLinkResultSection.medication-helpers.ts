"use client";

import type { MedicationDigest } from "../utils";

export type MedicationAnalysisModel = {
  latestMedication: MedicationDigest["recentMedications"][number] | null;
  primaryPurpose: string | null;
  summaryItems: Array<{ label: string; value: string }>;
  insights: string[];
  nextActions: string[];
};

export function normalizeCompactText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildMedicationAnalysisModel(
  medicationDigest: MedicationDigest
): MedicationAnalysisModel {
  const latestMedication = medicationDigest.recentMedications[0] ?? null;
  const primaryCondition =
    normalizeCompactText(medicationDigest.topConditions[0]?.label) ?? null;
  const primaryPurpose =
    normalizeCompactText(latestMedication?.effect) ?? primaryCondition;

  const summaryItems = [
    {
      label: "기준 기록",
      value: normalizeCompactText(latestMedication?.date) ?? "최근 기록",
    },
    {
      label: "복약 이력",
      value: `${medicationDigest.totalRows.toLocaleString("ko-KR")}건`,
    },
    {
      label: "고유 약품",
      value: `${medicationDigest.uniqueMedicineCount.toLocaleString("ko-KR")}종`,
    },
  ];

  const insights: string[] = [];
  if (latestMedication) {
    insights.push(
      `가장 최근 복약은 ${latestMedication.medicine} 기록을 기준으로 정리했어요.`
    );
  } else {
    insights.push("가장 최근 복약 기록이 없어 요약 중심으로 보여드려요.");
  }

  if (primaryPurpose) {
    insights.push(`복용 목적은 ${primaryPurpose} 관련으로 확인돼요.`);
  } else {
    insights.push("복용 목적 정보가 없어 약품명 중심으로 안내해드려요.");
  }

  if (medicationDigest.totalRows <= 1) {
    insights.push("현재는 복약 기록이 1건이라 최근 이력 중심으로 분석했어요.");
  } else {
    insights.push("복약 이력이 여러 건이라 최근 순서대로 변화를 함께 보여드려요.");
  }

  const nextActions = [
    "복약 정보가 바뀌었다면 다시 조회해서 최신 기록으로 확인해 주세요.",
    "건강검진 결과를 함께 연동하면 수치 기반 분석까지 더 정확하게 받을 수 있어요.",
  ];

  if (medicationDigest.totalRows > 1) {
    nextActions.unshift(
      `최근 기록 외에도 ${
        medicationDigest.totalRows - 1
      }건이 더 있어요. 아래 최근 이력에서 함께 확인해 주세요.`
    );
  }

  return {
    latestMedication,
    primaryPurpose,
    summaryItems,
    insights,
    nextActions,
  };
}
