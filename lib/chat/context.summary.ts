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
import { buildRecentOrders, buildPreviousConsultations } from "./context.history";
import { buildProfileSummary } from "./context.profile";
import { buildContextCardLines, buildPromptSummaryText } from "./context.prompt";
import {
  SUMMARY_VERSION,
  type UserContextSummaryInput,
  type UserContextSummary,
} from "./context.types";

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
  const notableResponses = buildNotableResponses({
    assessResult: input.assessResult,
    checkAiResult: input.checkAiResult,
  });
  const recommendedNutrients = buildRecommendedNutrients({
    assessFindings,
    quickFindings,
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
      previousConsultations.length > 0 ? "이전 상담" : "",
    ].filter(Boolean),
    5
  );

  const missingData = uniq(
    [
      profile ? "" : "프로필 없음",
      recentOrders.length > 0 ? "" : "주문 없음",
      latestAssess ? "" : "정밀 검사 없음",
      latestQuick ? "" : "빠른 검사 없음",
      previousConsultations.length > 0 ? "" : "이전 상담 없음",
    ].filter(Boolean),
    5
  );

  const promptSummaryText = buildPromptSummaryText({
    profile,
    recentOrders,
    latestAssess,
    latestQuick,
    previousConsultations,
    actorContext,
    recommendedNutrients,
    notableResponses,
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
    previousConsultations,
    actorContext,
    recommendedNutrients,
    notableResponses,
    contextCardLines: buildContextCardLines(promptSummaryText),
    promptSummaryText,
  };
}
