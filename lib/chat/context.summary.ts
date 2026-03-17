import {
  formatDate,
  uniq,
} from "./context.base";
import {
  buildAssessFindings,
  buildNotableResponses,
  buildQuickFindings,
  buildRecommendedNutrients,
} from "./context.assessment";
import { buildJourneySegmentSummary } from "./context.journey-segmentation";
import { buildExplainabilitySummary } from "./context.explainability";
import { buildConsultationImpactSummary } from "./context.consultation-impact";
import { buildDataAssetSummary } from "./context.data-asset";
import { buildRecentOrders, buildPreviousConsultations } from "./context.history";
import { buildSafetyEscalationSummary } from "./context.safety-escalation";
import { buildProfileSummary } from "./context.profile";
import { buildContextCardLines, buildPromptSummaryText } from "./context.prompt";
import {
  SUMMARY_VERSION,
  type HealthLinkLike,
  type UserContextSummaryInput,
  type UserContextSummary,
} from "./context.types";

function buildHealthLinkSummary(input: HealthLinkLike | null | undefined) {
  const record =
    input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  if (!record) return null;

  const headline = typeof record.headline === "string" ? record.headline.trim() : "";
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const highlights = Array.isArray(record.highlights)
    ? record.highlights
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const nextSteps = Array.isArray(record.nextSteps)
    ? record.nextSteps
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const topMedicines = Array.isArray(record.topMedicines)
    ? record.topMedicines
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          return typeof (item as { label?: unknown }).label === "string"
            ? ((item as { label?: string }).label ?? "").trim()
            : "";
        })
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const topConditions = Array.isArray(record.topConditions)
    ? record.topConditions
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          return typeof (item as { label?: unknown }).label === "string"
            ? ((item as { label?: string }).label ?? "").trim()
            : "";
        })
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const riskLevelRaw =
    typeof record.riskLevel === "string" ? record.riskLevel : "unknown";
  const riskLevel =
    riskLevelRaw === "low" ||
    riskLevelRaw === "medium" ||
    riskLevelRaw === "high" ||
    riskLevelRaw === "unknown"
      ? riskLevelRaw
      : "unknown";

  const hasData =
    !!headline ||
    !!summary ||
    highlights.length > 0 ||
    nextSteps.length > 0 ||
    topMedicines.length > 0 ||
    topConditions.length > 0;
  if (!hasData) return null;

  const fetchedAt =
    typeof record.fetchedAt === "string" ||
    typeof record.fetchedAt === "number" ||
    record.fetchedAt instanceof Date
      ? formatDate(record.fetchedAt)
      : "-";

  return {
    fetchedAt,
    riskLevel,
    headline,
    summary,
    highlights,
    nextSteps,
    topMedicines,
    topConditions,
  } satisfies UserContextSummary["healthLink"];
}

export function buildUserContextSummary(
  input: UserContextSummaryInput
): UserContextSummary {
  const actorContext =
    input.actorContext &&
    (typeof input.actorContext.loggedIn === "boolean" ||
      typeof input.actorContext.phoneLinked === "boolean")
      ? {
          loggedIn: !!input.actorContext.loggedIn,
          phoneLinked: !!input.actorContext.phoneLinked,
        }
      : null;
  const profile = buildProfileSummary(input.profile);
  const recentOrders = buildRecentOrders(input.orders);
  const assessFindings = buildAssessFindings(
    input.assessResult,
    input.localAssessCats
  );
  const quickFindings = buildQuickFindings(
    input.checkAiResult,
    input.localCheckAiTopLabels
  );
  const previousConsultations = buildPreviousConsultations(
    input.chatSessions,
    input.currentSessionId
  );
  const healthLink = buildHealthLinkSummary(input.healthLink);
  const notableResponses = buildNotableResponses({
    assessResult: input.assessResult,
    checkAiResult: input.checkAiResult,
  });
  const recommendedNutrients = buildRecommendedNutrients({
    assessFindings,
    quickFindings,
  });
  const consultationImpact = buildConsultationImpactSummary({
    orders: input.orders,
    chatSessions: input.chatSessions,
    currentSessionId: input.currentSessionId,
    recommendedNutrients,
  });

  const latestAssess =
    assessFindings.length > 0
      ? {
          testedAt: formatDate(input.assessResult?.createdAt),
          findings: assessFindings.slice(0, 7),
        }
      : null;

  const latestQuick =
    quickFindings.length > 0
      ? {
          testedAt: formatDate(input.checkAiResult?.createdAt),
          findings: quickFindings.slice(0, 7),
        }
      : null;

  const evidenceLabels = uniq(
    [
      profile ? "프로필" : "",
      recentOrders.length > 0 ? "최근 주문" : "",
      latestAssess ? "정밀 검사" : "",
      latestQuick ? "빠른 검사" : "",
      healthLink ? "건강링크" : "",
      previousConsultations.length > 0 ? "이전 상담" : "",
    ].filter(Boolean),
    6
  );

  const missingData = uniq(
    [
      profile ? "" : "프로필 없음",
      recentOrders.length > 0 ? "" : "주문 없음",
      latestAssess ? "" : "정밀 검사 없음",
      latestQuick ? "" : "빠른 검사 없음",
      healthLink ? "" : "건강링크 없음",
      previousConsultations.length > 0 ? "" : "이전 상담 없음",
    ].filter(Boolean),
    6
  );

  const explainability = buildExplainabilitySummary({
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    healthLink,
    previousConsultations,
    recommendedNutrients,
    notableResponses,
    missingData,
  });
  const dataAsset = buildDataAssetSummary({
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    healthLink,
    previousConsultations,
    recommendedNutrients,
  });
  const safetyEscalation = buildSafetyEscalationSummary({
    profile,
    healthLink,
    notableResponses,
    previousConsultations,
  });
  const journeySegment = buildJourneySegmentSummary({
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    healthLink,
    previousConsultations,
    recommendedNutrients,
    notableResponses,
    safetyEscalation,
    consultationImpact,
  });

  const promptSummaryText = buildPromptSummaryText({
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    healthLink,
    previousConsultations,
    actorContext,
    recommendedNutrients,
    notableResponses,
    explainability,
    dataAsset,
    safetyEscalation,
    consultationImpact,
    journeySegment,
  });

  return {
    version: SUMMARY_VERSION,
    hasAnyData: evidenceLabels.length > 0,
    evidenceLabels,
    missingData,
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    healthLink,
    previousConsultations,
    actorContext,
    recommendedNutrients,
    notableResponses,
    explainability,
    dataAsset,
    safetyEscalation,
    consultationImpact,
    journeySegment,
    contextCardLines: buildContextCardLines(promptSummaryText),
    promptSummaryText,
  };
}
