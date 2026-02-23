import type { UserContextSummary } from "./context.types";

function buildDataScopeLabel(actorContext: UserContextSummary["actorContext"]) {
  if (!actorContext) return "미상";
  if (!actorContext.loggedIn) return "비로그인 기기 기반";
  if (actorContext.phoneLinked) return "로그인 계정 기반(주문 포함)";
  return "로그인 계정 기반(주문 미연결)";
}

export function buildPromptSummaryText(summary: {
  profile: UserContextSummary["profile"];
  recentOrders: UserContextSummary["recentOrders"];
  latestAssess: UserContextSummary["latestAssess"];
  latestQuick: UserContextSummary["latestQuick"];
  previousConsultations: UserContextSummary["previousConsultations"];
  actorContext: UserContextSummary["actorContext"];
  recommendedNutrients: UserContextSummary["recommendedNutrients"];
  notableResponses: UserContextSummary["notableResponses"];
}) {
  const lines: string[] = [];

  lines.push(`[데이터범위] ${buildDataScopeLabel(summary.actorContext)}`);

  if (summary.profile) {
    const profileParts = [
      `성별/연령:${summary.profile.sexAge}`,
      summary.profile.goals.length
        ? `목표:${summary.profile.goals.join(", ")}`
        : "목표:없음",
      summary.profile.constraints.length
        ? `제약:${summary.profile.constraints.join(", ")}`
        : "제약:없음",
      summary.profile.conditions.length
        ? `질환:${summary.profile.conditions.join(", ")}`
        : "질환:없음",
      summary.profile.medications.length
        ? `복용약:${summary.profile.medications.join(", ")}`
        : "복용약:없음",
      summary.profile.allergies.length
        ? `알레르기:${summary.profile.allergies.join(", ")}`
        : "알레르기:없음",
    ];
    lines.push(`[프로필] ${profileParts.join(" | ")}`);
  } else {
    lines.push("[프로필] 없음");
  }

  if (summary.recentOrders.length > 0) {
    const orderText = summary.recentOrders
      .map(
        (order) =>
          `${order.orderedAt} ${order.status} (${order.items.slice(0, 3).join(", ")})`
      )
      .join(" / ");
    lines.push(`[최근주문] ${orderText}`);
  } else {
    lines.push("[최근주문] 없음");
  }

  if (summary.latestAssess) {
    lines.push(
      `[정밀검사] ${summary.latestAssess.testedAt} · ${summary.latestAssess.findings
        .slice(0, 7)
        .join(", ")}`
    );
  } else {
    lines.push("[정밀검사] 없음");
  }

  if (summary.latestQuick) {
    lines.push(
      `[빠른검사] ${summary.latestQuick.testedAt} · ${summary.latestQuick.findings
        .slice(0, 7)
        .join(", ")}`
    );
  } else {
    lines.push("[빠른검사] 없음");
  }

  if (summary.previousConsultations.length > 0) {
    const chatText = summary.previousConsultations
      .map((session) => {
        const points = [session.userPoint, session.assistantPoint]
          .filter(Boolean)
          .join(" | ");
        return `${session.updatedAt} ${session.title}${points ? ` (${points})` : ""}`;
      })
      .join(" / ");
    lines.push(`[이전상담] ${chatText}`);
  } else {
    lines.push("[이전상담] 없음");
  }

  if (summary.recommendedNutrients.length > 0) {
    lines.push(`[우선영양소] ${summary.recommendedNutrients.slice(0, 5).join(", ")}`);
  } else {
    lines.push("[우선영양소] 없음");
  }

  if (summary.notableResponses.length > 0) {
    const notable = summary.notableResponses
      .map(
        (item) =>
          `${item.source}/${item.signal}:${item.question}=${item.answer}`
      )
      .join(" / ");
    lines.push(`[문항응답] ${notable}`);
  } else {
    lines.push("[문항응답] 없음");
  }

  return lines.join("\n");
}

export function buildContextCardLines(promptSummaryText: string) {
  return promptSummaryText.split("\n").map((line) => line.trim());
}
