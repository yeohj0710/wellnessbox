import "server-only";

import { toNumber } from "@/lib/b2b/analyzer-helpers";

export type CoreMetricStatus = "normal" | "caution" | "high" | "unknown";

function parseBloodPressure(value: string) {
  const match = value.replace(/\s/g, "").match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  return { systolic, diastolic };
}

export function inferHealthMetricStatus(
  metricKey: string,
  valueText: string
): CoreMetricStatus {
  const numeric = toNumber(valueText);
  if (metricKey === "bloodPressure") {
    const bp = parseBloodPressure(valueText);
    if (!bp) return "unknown";
    if (bp.systolic >= 140 || bp.diastolic >= 90) return "high";
    if (bp.systolic >= 130 || bp.diastolic >= 80) return "caution";
    return "normal";
  }
  if (numeric == null) return "unknown";

  switch (metricKey) {
    case "bmi":
      if (numeric >= 30) return "high";
      if (numeric >= 25) return "caution";
      return "normal";
    case "glucose":
      if (numeric >= 126) return "high";
      if (numeric >= 100) return "caution";
      return "normal";
    case "cholesterol":
      if (numeric >= 240) return "high";
      if (numeric >= 200) return "caution";
      return "normal";
    case "triglyceride":
      if (numeric >= 200) return "high";
      if (numeric >= 150) return "caution";
      return "normal";
    case "ldl":
      if (numeric >= 160) return "high";
      if (numeric >= 130) return "caution";
      return "normal";
    case "hdl":
      if (numeric < 40) return "caution";
      return "normal";
    default:
      return "unknown";
  }
}

export function resolveHealthSeverityPenalty(status: CoreMetricStatus) {
  if (status === "high") return 18;
  if (status === "caution") return 10;
  return 0;
}
