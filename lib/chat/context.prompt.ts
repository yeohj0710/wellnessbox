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
  healthLink: UserContextSummary["healthLink"];
  previousConsultations: UserContextSummary["previousConsultations"];
  actorContext: UserContextSummary["actorContext"];
  recommendedNutrients: UserContextSummary["recommendedNutrients"];
  notableResponses: UserContextSummary["notableResponses"];
  explainability: UserContextSummary["explainability"];
  dataAsset: UserContextSummary["dataAsset"];
  safetyEscalation: UserContextSummary["safetyEscalation"];
  consultationImpact: UserContextSummary["consultationImpact"];
  journeySegment: UserContextSummary["journeySegment"];
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
      `[정밀검사] ${summary.latestAssess.testedAt} | ${summary.latestAssess.findings
        .slice(0, 7)
        .join(", ")}`
    );
  } else {
    lines.push("[정밀검사] 없음");
  }

  if (summary.latestQuick) {
    lines.push(
      `[빠른검사] ${summary.latestQuick.testedAt} | ${summary.latestQuick.findings
        .slice(0, 7)
        .join(", ")}`
    );
  } else {
    lines.push("[빠른검사] 없음");
  }

  if (summary.healthLink) {
    const healthLinkParts = [
      summary.healthLink.fetchedAt && summary.healthLink.fetchedAt !== "-"
        ? `조회:${summary.healthLink.fetchedAt}`
        : "",
      summary.healthLink.riskLevel !== "unknown"
        ? `위험도:${summary.healthLink.riskLevel}`
        : "",
      summary.healthLink.headline ? `헤드라인:${summary.healthLink.headline}` : "",
      summary.healthLink.topMedicines.length > 0
        ? `복약:${summary.healthLink.topMedicines.join(", ")}`
        : "",
      summary.healthLink.topConditions.length > 0
        ? `주의:${summary.healthLink.topConditions.join(", ")}`
        : "",
      summary.healthLink.highlights.length > 0
        ? `요약:${summary.healthLink.highlights.join(" / ")}`
        : summary.healthLink.summary
        ? `요약:${summary.healthLink.summary}`
        : "",
    ].filter(Boolean);
    lines.push(`[건강링크] ${healthLinkParts.join(" | ")}`);
  } else {
    lines.push("[건강링크] 없음");
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
    lines.push(`[추천영양소] ${summary.recommendedNutrients.slice(0, 5).join(", ")}`);
  } else {
    lines.push("[추천영양소] 없음");
  }

  if (summary.notableResponses.length > 0) {
    const notable = summary.notableResponses
      .map((item) => `${item.source}/${item.signal}:${item.question}=${item.answer}`)
      .join(" / ");
    lines.push(`[문항응답] ${notable}`);
  } else {
    lines.push("[문항응답] 없음");
  }

  if (summary.explainability.fitReasons.length > 0) {
    lines.push(
      `[개인화근거] ${summary.explainability.fitReasons.slice(0, 3).join(" / ")}`
    );
  }

  if (summary.explainability.uncertaintyNotes.length > 0) {
    lines.push(
      `[불확실성] ${summary.explainability.uncertaintyNotes
        .slice(0, 2)
        .join(" / ")}`
    );
  }

  if (summary.explainability.pharmacistReviewPoints.length > 0) {
    lines.push(
      `[약사검토포인트] ${summary.explainability.pharmacistReviewPoints
        .slice(0, 2)
        .join(" / ")}`
    );
  }

  lines.push(`[데이터자산] ${summary.dataAsset.strengthLabel} | ${summary.dataAsset.headline}`);

  if (summary.dataAsset.reasonLines.length > 0) {
    lines.push(
      `[데이터자산근거] ${summary.dataAsset.reasonLines.slice(0, 3).join(" / ")}`
    );
  }

  lines.push(
    `[안전성에스컬레이션] ${summary.safetyEscalation.badgeLabel} | ${summary.safetyEscalation.headline}`
  );

  if (summary.safetyEscalation.reasonLines.length > 0) {
    lines.push(
      `[안전근거] ${summary.safetyEscalation.reasonLines.slice(0, 3).join(" / ")}`
    );
  }

  if (summary.safetyEscalation.needsMoreInfo.length > 0) {
    lines.push(
      `[추가확인필요] ${summary.safetyEscalation.needsMoreInfo
        .slice(0, 2)
        .join(" / ")}`
    );
  }

  lines.push(
    `[상담영향학습] ${summary.consultationImpact.headline} | ${summary.consultationImpact.insight}`
  );

  if (summary.consultationImpact.evidence.length > 0) {
    lines.push(
      `[상담영향근거] ${summary.consultationImpact.evidence
        .slice(0, 3)
        .join(" / ")}`
    );
  }

  lines.push(
    `[상담다음행동] ${summary.consultationImpact.recommendedActionLabel} | ${summary.consultationImpact.learnedPattern}`
  );

  lines.push(
    `[행동세그먼트] ${summary.journeySegment.label} | ${summary.journeySegment.headline}`
  );

  if (summary.journeySegment.reasonLines.length > 0) {
    lines.push(
      `[세그먼트근거] ${summary.journeySegment.reasonLines.slice(0, 3).join(" / ")}`
    );
  }

  return lines.join("\n");
}

export function buildContextCardLines(promptSummaryText: string) {
  return promptSummaryText.split("\n").map((line) => line.trim());
}
