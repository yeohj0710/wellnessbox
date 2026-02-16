import type { UserContextSummary } from "@/lib/chat/context";

type EnforcePersonalizedResponseInput = {
  rawText: string;
  summary: UserContextSummary;
  userText?: string;
};

const GENERIC_FALLBACK_PATTERNS: RegExp[] = [
  /정보가\s*부족/i,
  /질문.*명확하지/i,
  /구체적인\s*답변.*어렵/i,
  /파악하기\s*어려/i,
  /추가\s*정보.*필요/i,
  /추가\s*정보.*요청/i,
  /몇\s*가지\s*질문/i,
  /정확한\s*상담.*위해.*질문/i,
  /양해\s*부탁/i,
  /어떤\s*건강기능식품/i,
];

function cleanText(text: string) {
  return text.replace(/\r/g, "").trim();
}

function clip(text: string, max = 80) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function getEvidenceTokens(summary: UserContextSummary) {
  const tokens = new Set<string>();

  for (const label of summary.evidenceLabels) {
    if (label) tokens.add(label);
  }

  for (const order of summary.recentOrders.slice(0, 2)) {
    if (order.orderedAt && order.orderedAt !== "-") tokens.add(order.orderedAt);
    if (order.status) tokens.add(order.status);
    for (const item of order.items.slice(0, 3)) {
      if (item) tokens.add(item.replace(/\s*x\d+(\.\d+)?$/i, "").trim());
      if (item) tokens.add(item);
    }
  }

  for (const finding of summary.latestAssess?.findings.slice(0, 4) || []) {
    if (finding) tokens.add(finding);
    const labelOnly = finding.replace(/\s+[\d.]+%$/, "").trim();
    if (labelOnly) tokens.add(labelOnly);
  }

  for (const finding of summary.latestQuick?.findings.slice(0, 4) || []) {
    if (finding) tokens.add(finding);
  }

  if (summary.latestAssess?.testedAt && summary.latestAssess.testedAt !== "-") {
    tokens.add(summary.latestAssess.testedAt);
  }
  if (summary.latestQuick?.testedAt && summary.latestQuick.testedAt !== "-") {
    tokens.add(summary.latestQuick.testedAt);
  }

  if (summary.profile) {
    if (summary.profile.sexAge && summary.profile.sexAge !== "없음") {
      tokens.add(summary.profile.sexAge);
    }
    for (const goal of summary.profile.goals.slice(0, 2)) tokens.add(goal);
    for (const condition of summary.profile.conditions.slice(0, 2)) {
      tokens.add(condition);
    }
    for (const medication of summary.profile.medications.slice(0, 2)) {
      tokens.add(medication);
    }
    for (const allergy of summary.profile.allergies.slice(0, 2)) tokens.add(allergy);
  }

  return Array.from(tokens).filter(Boolean);
}

function hasEvidenceMention(text: string, summary: UserContextSummary) {
  return getEvidenceTokens(summary).some((token) => token && text.includes(token));
}

function buildDataSnippet(summary: UserContextSummary) {
  const order = summary.recentOrders[0];
  if (order) {
    return `최근 주문 ${order.orderedAt} ${order.status} (${order.items
      .slice(0, 3)
      .join(", ")})`;
  }

  if (summary.latestAssess) {
    return `정밀 검사 ${summary.latestAssess.testedAt} (${summary.latestAssess.findings
      .slice(0, 3)
      .join(", ")})`;
  }

  if (summary.latestQuick) {
    return `빠른 검사 ${summary.latestQuick.testedAt} (${summary.latestQuick.findings
      .slice(0, 3)
      .join(", ")})`;
  }

  if (summary.profile) {
    const goal = summary.profile.goals[0];
    const condition = summary.profile.conditions[0];
    return `프로필 ${summary.profile.sexAge}${
      goal ? ` · 목표 ${goal}` : ""
    }${condition ? ` · 질환 ${condition}` : ""}`;
  }

  const consultation = summary.previousConsultations[0];
  if (consultation) {
    return `이전 상담 ${consultation.updatedAt} ${consultation.title}`;
  }

  return "";
}

function buildMissingQuestions(summary: UserContextSummary) {
  const questions: string[] = [];

  if (!summary.profile || summary.profile.goals.length === 0) {
    questions.push("현재 가장 먼저 개선하고 싶은 목표 1~2가지를 알려주세요.");
  }

  if (
    !summary.profile ||
    (summary.profile.medications.length === 0 &&
      summary.profile.conditions.length === 0)
  ) {
    questions.push("현재 복용 중인 약이나 진단받은 질환이 있으면 알려주세요.");
  }

  if (!summary.latestAssess && !summary.latestQuick) {
    questions.push("최근 검사 결과나 현재 불편한 증상이 있으면 공유해 주세요.");
  }

  if (questions.length === 0) {
    questions.push("현재 복용 시간(아침/점심/저녁) 정보를 알려주시면 더 정밀하게 조정해드릴게요.");
  }

  return questions.slice(0, 2);
}

function buildPersonalizedFallback(
  summary: UserContextSummary,
  userText?: string
) {
  const lines: string[] = [];
  const requestHead = clip(userText || "요청", 50);

  lines.push(`요청하신 내용(${requestHead}) 기준으로 제 데이터 기반 맞춤안을 바로 정리해드릴게요.`);

  const evidenceBlocks: string[] = [];
  if (summary.latestAssess) {
    evidenceBlocks.push(
      `정밀 검사(${summary.latestAssess.testedAt})에서 ${summary.latestAssess.findings
        .slice(0, 3)
        .join(", ")}가 확인됩니다.`
    );
  }
  if (summary.latestQuick) {
    evidenceBlocks.push(
      `빠른 검사(${summary.latestQuick.testedAt})에서는 ${summary.latestQuick.findings
        .slice(0, 3)
        .join(", ")}가 우선 항목입니다.`
    );
  }
  if (summary.recentOrders.length > 0) {
    const order = summary.recentOrders[0];
    evidenceBlocks.push(
      `최근 주문(${order.orderedAt})은 ${order.items.slice(0, 3).join(", ")} 조합입니다.`
    );
  }
  if (summary.profile) {
    const parts: string[] = [];
    if (summary.profile.sexAge !== "없음") parts.push(summary.profile.sexAge);
    if (summary.profile.goals.length > 0) {
      parts.push(`목표 ${summary.profile.goals.slice(0, 2).join("/")}`);
    }
    if (summary.profile.medications.length > 0) {
      parts.push(`복용약 ${summary.profile.medications.slice(0, 2).join(", ")}`);
    }
    if (summary.profile.conditions.length > 0) {
      parts.push(`질환 ${summary.profile.conditions.slice(0, 2).join(", ")}`);
    }
    if (parts.length > 0) {
      evidenceBlocks.push(`프로필 핵심은 ${parts.join(" · ")}입니다.`);
    }
  }

  if (evidenceBlocks.length > 0) {
    lines.push(evidenceBlocks[0]);
  }

  const steps: string[] = [];
  if (summary.recentOrders.length > 0) {
    steps.push("최근 주문 성분은 현재 루틴과 중복 여부를 먼저 점검하고, 2주간 고정 시간대로 복용해 반응을 기록하세요.");
  }
  if (summary.latestAssess || summary.latestQuick) {
    steps.push("검사 상위 항목 중심으로 우선순위를 1~2개로 좁혀서 복용 성분 수를 단순화하세요.");
  }
  if (summary.profile?.medications.length) {
    steps.push("복용약과의 상호작용 가능성이 있는 성분은 신규 추가 전에 약사 확인을 거치세요.");
  }
  if (steps.length === 0) {
    steps.push("현재 데이터 기준 핵심 목표 1개를 정하고 그 목표에 맞는 루틴으로 2주간 유지해 주세요.");
  }

  lines.push(`1. ${steps[0]}`);
  if (steps[1]) lines.push(`2. ${steps[1]}`);

  const questions = buildMissingQuestions(summary);
  if (questions.length > 0) {
    lines.push("정확도 보완을 위해 아래 1~2가지만 알려주세요.");
    questions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question}`);
    });
  }

  return lines.join("\n\n");
}

function buildNoDataFallback(summary: UserContextSummary) {
  const questions = [
    "현재 복용 중인 영양제/약 이름을 알려주세요.",
    "가장 먼저 개선하고 싶은 목표 1~2가지를 알려주세요.",
    "최근 검사 결과나 불편한 증상이 있으면 알려주세요.",
  ];

  return [
    "현재 개인 데이터가 부족해서 일반론 대신 핵심 정보부터 빠르게 확인할게요.",
    `1. ${questions[0]}`,
    `2. ${questions[1]}`,
    `3. ${questions[2]}`,
  ].join("\n\n");
}

function looksGenericDeflection(text: string) {
  return GENERIC_FALLBACK_PATTERNS.some((pattern) => pattern.test(text));
}

function asksForKnownData(text: string, summary: UserContextSummary) {
  const normalized = text.replace(/\s+/g, "");

  const asksMedication =
    /복용중인약|복용중인약물|현재복용중인약/.test(normalized) ||
    /현재복용중인약물/.test(normalized);
  if (asksMedication && (summary.profile?.medications.length || summary.profile?.conditions.length)) {
    return true;
  }

  const asksGoal = /개선하고싶은목표|건강목표/.test(normalized);
  if (asksGoal && summary.profile?.goals.length) return true;

  const asksProduct = /어떤건강기능식품|특정한건강기능식품/.test(normalized);
  if (asksProduct && summary.recentOrders.length > 0) return true;

  return false;
}

export function enforcePersonalizedResponse(
  input: EnforcePersonalizedResponseInput
) {
  const raw = cleanText(input.rawText || "");
  const summary = input.summary;

  if (!summary.hasAnyData) {
    if (!raw) return buildNoDataFallback(summary);
    return raw;
  }

  if (!raw) {
    return buildPersonalizedFallback(summary, input.userText);
  }

  const evidenceMentioned = hasEvidenceMention(raw, summary);
  const genericDeflection = looksGenericDeflection(raw);
  const repeatedKnownQuestion = asksForKnownData(raw, summary);
  const shouldOverride =
    repeatedKnownQuestion || (genericDeflection && !evidenceMentioned);

  let result = shouldOverride
    ? buildPersonalizedFallback(summary, input.userText)
    : raw;

  if (!hasEvidenceMention(result, summary)) {
    const snippet = buildDataSnippet(summary);
    if (snippet) return `${result}\n\n${snippet}`;
  }

  return result;
}
