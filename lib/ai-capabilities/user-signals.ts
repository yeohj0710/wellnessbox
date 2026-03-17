import type { UserContextSummary } from "@/lib/chat/context";

type UserHealthRisk = NonNullable<UserContextSummary["healthLink"]>["riskLevel"];

export type UserCapabilitySignals = {
  orderCount: number;
  hasOrders: boolean;
  hasAssess: boolean;
  hasQuick: boolean;
  hasResults: boolean;
  hasHealthLink: boolean;
  hasRecommended: boolean;
  hasPreviousConsultations: boolean;
  evidenceScore: number;
  healthRisk: UserHealthRisk | "unknown";
  medicationCount: number;
  conditionCount: number;
  hasMedicationContext: boolean;
  hasConditionContext: boolean;
  hasCautionSignals: boolean;
  isSafetySensitive: boolean;
  recentOrderDays: number;
  recentConsultationDays: number;
  latestResultAgeDays: number;
  journeySegmentId: UserContextSummary["journeySegment"]["id"];
  dataAssetStage: UserContextSummary["dataAsset"]["stage"];
  hasCompoundingData: boolean;
};

function parseDate(value: string | null | undefined) {
  if (!value || value === "-") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysSince(value: string | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

export function buildUserCapabilitySignals(
  summary: UserContextSummary
): UserCapabilitySignals {
  const medicationCount =
    (summary.profile?.medications.length ?? 0) +
    (summary.healthLink?.topMedicines.length ?? 0);
  const conditionCount =
    (summary.profile?.conditions.length ?? 0) +
    (summary.healthLink?.topConditions.length ?? 0);
  const hasCautionSignals = summary.notableResponses.some(
    (item) => item.signal === "주의"
  );
  const healthRisk = summary.healthLink?.riskLevel ?? "unknown";
  const isSafetySensitive =
    summary.safetyEscalation.level !== "routine" ||
    healthRisk === "high" ||
    healthRisk === "medium" ||
    medicationCount > 0 ||
    conditionCount > 0 ||
    hasCautionSignals;

  let evidenceScore = 0;
  if (summary.profile) evidenceScore += 1;
  if (summary.latestAssess) evidenceScore += 2;
  if (summary.latestQuick) evidenceScore += 1;
  if (summary.healthLink) evidenceScore += 1;
  if (summary.previousConsultations.length > 0) evidenceScore += 1;

  return {
    orderCount: summary.recentOrders.length,
    hasOrders: summary.recentOrders.length > 0,
    hasAssess: Boolean(summary.latestAssess),
    hasQuick: Boolean(summary.latestQuick),
    hasResults: Boolean(summary.latestAssess || summary.latestQuick),
    hasHealthLink: Boolean(summary.healthLink),
    hasRecommended: summary.recommendedNutrients.length > 0,
    hasPreviousConsultations: summary.previousConsultations.length > 0,
    evidenceScore,
    healthRisk,
    medicationCount,
    conditionCount,
    hasMedicationContext: medicationCount > 0,
    hasConditionContext: conditionCount > 0,
    hasCautionSignals,
    isSafetySensitive,
    recentOrderDays: daysSince(summary.recentOrders[0]?.orderedAt),
    recentConsultationDays: daysSince(summary.previousConsultations[0]?.updatedAt),
    latestResultAgeDays: Math.min(
      daysSince(summary.latestAssess?.testedAt),
      daysSince(summary.latestQuick?.testedAt)
    ),
    journeySegmentId: summary.journeySegment.id,
    dataAssetStage: summary.dataAsset.stage,
    hasCompoundingData:
      summary.dataAsset.stage === "compounding" ||
      summary.dataAsset.stage === "follow_through",
  };
}

export function hasRecentConsultationSignal(
  signals: UserCapabilitySignals,
  withinDays = 21
) {
  return signals.recentConsultationDays <= withinDays;
}

export function hasRecentOrderSignal(
  signals: UserCapabilitySignals,
  withinDays = 45
) {
  return signals.recentOrderDays <= withinDays;
}

export function shouldPrioritizeConsultation(
  signals: UserCapabilitySignals,
  withinDays = 35
) {
  return signals.isSafetySensitive && !hasRecentConsultationSignal(signals, withinDays);
}
