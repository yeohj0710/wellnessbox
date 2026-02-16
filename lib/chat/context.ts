import { CODE_TO_LABEL } from "@/lib/categories";
import type { ChatSession, UserProfile } from "@/types/chat";

type DateLike = string | number | Date | null | undefined;

type MessageLike = {
  role?: string | null;
  content?: unknown;
};

type OrderLike = {
  id?: string | number | null;
  status?: string | null;
  createdAt?: DateLike;
  updatedAt?: DateLike;
  items?: unknown[];
  orderItems?: unknown[];
};

type AssessLike = {
  createdAt?: DateLike;
  summary?: unknown;
  answers?: unknown;
  normalized?: {
    topLabels?: unknown;
    scores?: Array<{ label?: unknown; value?: unknown }>;
  };
};

type CheckAiLike = {
  createdAt?: DateLike;
  labels?: unknown;
  answers?: unknown;
  normalized?: {
    topLabels?: unknown;
  };
};

type ConsultationLike = {
  id?: string | null;
  title?: string | null;
  updatedAt?: DateLike;
  messages?: MessageLike[];
};

export type UserContextSummaryInput = {
  profile?: UserProfile | null;
  orders?: OrderLike[] | null;
  assessResult?: AssessLike | null;
  checkAiResult?: CheckAiLike | null;
  chatSessions?: ConsultationLike[] | ChatSession[] | null;
  currentSessionId?: string | null;
  localAssessCats?: string[] | null;
  localCheckAiTopLabels?: string[] | null;
  actorContext?: {
    loggedIn?: boolean | null;
    phoneLinked?: boolean | null;
  } | null;
};

export type UserContextSummary = {
  version: "chat-context-v1";
  hasAnyData: boolean;
  evidenceLabels: string[];
  missingData: string[];
  profile: {
    sexAge: string;
    goals: string[];
    constraints: string[];
    conditions: string[];
    medications: string[];
    allergies: string[];
  } | null;
  recentOrders: Array<{
    orderedAt: string;
    status: string;
    items: string[];
  }>;
  latestAssess: {
    testedAt: string;
    findings: string[];
  } | null;
  latestQuick: {
    testedAt: string;
    findings: string[];
  } | null;
  previousConsultations: Array<{
    title: string;
    updatedAt: string;
    userPoint: string;
    assistantPoint: string;
  }>;
  actorContext: {
    loggedIn: boolean;
    phoneLinked: boolean;
  } | null;
  recommendedNutrients: string[];
  notableResponses: Array<{
    source: "정밀 검사" | "빠른 검사";
    question: string;
    answer: string;
    signal: "주의" | "보호" | "생활";
  }>;
  contextCardLines: string[];
  promptSummaryText: string;
};

const SUMMARY_VERSION = "chat-context-v1" as const;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function uniq(values: string[], maxItems: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= maxItems) break;
  }
  return out;
}

function clip(text: string, max = 80) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function parseDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: DateLike) {
  const date = parseDate(value);
  if (!date) return "-";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function profileSexAge(profile: UserProfile | null | undefined) {
  if (!profile) return "없음";
  const sex =
    profile.sex === "male"
      ? "남성"
      : profile.sex === "female"
      ? "여성"
      : profile.sex === "other"
      ? "기타"
      : "";
  const age = typeof profile.age === "number" ? `${profile.age}세` : "";
  const merged = [sex, age].filter(Boolean).join(" ").trim();
  return merged || "없음";
}

function normalizeCategoryLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return CODE_TO_LABEL[trimmed as keyof typeof CODE_TO_LABEL] || trimmed;
}

function stripPercentSuffix(text: string) {
  return text.replace(/\s+[\d.]+%$/, "").trim();
}

function parseAssessSummaryLine(line: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+?)\s+([\d.]+)%$/);
  if (!match) return stripPercentSuffix(normalizeCategoryLabel(trimmed));
  const label = normalizeCategoryLabel(match[1]);
  return stripPercentSuffix(label);
}

function buildAssessFindings(
  assess: AssessLike | null | undefined,
  localAssessCats?: string[] | null
) {
  const fromSummary = asStringArray(assess?.summary)
    .map(parseAssessSummaryLine)
    .filter(Boolean);

  if (fromSummary.length > 0) return uniq(fromSummary, 7);

  const topLabels = asStringArray(assess?.normalized?.topLabels).map(
    normalizeCategoryLabel
  );
  const scores = Array.isArray(assess?.normalized?.scores)
    ? assess?.normalized?.scores || []
    : [];

  if (topLabels.length > 0) {
    const withScores = topLabels.map((label, idx) => {
      const score = scores[idx];
      const value = typeof score?.value === "number" ? score.value : null;
      if (value == null) return stripPercentSuffix(label);
      return stripPercentSuffix(label);
    });
    return uniq(withScores.filter(Boolean), 7);
  }

  const local = asStringArray(localAssessCats).map(normalizeCategoryLabel);
  return uniq(local, 7);
}

function buildQuickFindings(
  checkAi: CheckAiLike | null | undefined,
  localQuick?: string[] | null
) {
  const primary = asStringArray(checkAi?.labels).map(normalizeCategoryLabel);
  if (primary.length > 0) return uniq(primary, 7);

  const normalizedTop = asStringArray(checkAi?.normalized?.topLabels).map(
    normalizeCategoryLabel
  );
  if (normalizedTop.length > 0) return uniq(normalizedTop, 7);

  const local = asStringArray(localQuick).map(normalizeCategoryLabel);
  return uniq(local, 7);
}

function normalizeAnswerText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function buildAnswerPairs(
  value: unknown
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];

  const out: Array<{ question: string; answer: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const question = normalizeAnswerText(record.question);
    const answer =
      normalizeAnswerText(record.answerLabel) || normalizeAnswerText(record.answer);
    if (!question || !answer) continue;
    out.push({
      question: clip(question, 80),
      answer: clip(answer, 40),
    });
  }
  return out;
}

const HIGH_IMPACT_QUESTION_PATTERN =
  /(임신|수유|복용 중|복용약|알레르기|질환|빈혈|혈압|당뇨|통증|두근|어지럼|불면|우울|출혈|신장|간)/;
const HIGH_IMPACT_ANSWER_PATTERN =
  /(예|있음|있어요|자주|매우|심함|높음|불편|어렵|부족|나쁨|불규칙|많음|과다|가끔|종종)/;
const LOW_IMPACT_ANSWER_PATTERN = /(아니오|없음|해당 없음|보통|괜찮|정상|복용 안 함)/;
const LIFESTYLE_QUESTION_PATTERN =
  /(수면|운동|식사|생활|습관|스트레스|음주|흡연|카페인|수분|물 섭취|활동량)/;

function classifyAnswerSignal(pair: { question: string; answer: string }) {
  const isCautionQuestion = HIGH_IMPACT_QUESTION_PATTERN.test(pair.question);
  const isCautionAnswer = HIGH_IMPACT_ANSWER_PATTERN.test(pair.answer);
  const isLowImpactAnswer = LOW_IMPACT_ANSWER_PATTERN.test(pair.answer);
  const isLifestyleQuestion = LIFESTYLE_QUESTION_PATTERN.test(pair.question);

  if (isCautionQuestion && isCautionAnswer) return "주의" as const;
  if (isLowImpactAnswer) return "보호" as const;
  if (isLifestyleQuestion) return "생활" as const;
  if (isCautionQuestion) return "주의" as const;
  return "생활" as const;
}

function scoreAnswerPair(pair: { question: string; answer: string }) {
  let score = 0;
  if (HIGH_IMPACT_QUESTION_PATTERN.test(pair.question)) score += 2;
  if (HIGH_IMPACT_ANSWER_PATTERN.test(pair.answer)) score += 2;
  if (LIFESTYLE_QUESTION_PATTERN.test(pair.question)) score += 1;
  if (LOW_IMPACT_ANSWER_PATTERN.test(pair.answer)) score += 1;
  return score;
}

function buildNotableResponses(input: {
  assessResult?: AssessLike | null;
  checkAiResult?: CheckAiLike | null;
}): UserContextSummary["notableResponses"] {
  const assessPairs = buildAnswerPairs(input.assessResult?.answers).map((pair) => ({
    ...pair,
    source: "정밀 검사" as const,
    score: scoreAnswerPair(pair),
    signal: classifyAnswerSignal(pair),
  }));
  const quickPairs = buildAnswerPairs(input.checkAiResult?.answers).map((pair) => ({
    ...pair,
    source: "빠른 검사" as const,
    score: scoreAnswerPair(pair),
    signal: classifyAnswerSignal(pair),
  }));

  const merged = [...assessPairs, ...quickPairs]
    .filter((pair) => pair.score > 0)
    .sort((left, right) => right.score - left.score);

  const deduped: typeof merged = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = `${item.source}:${item.question}:${item.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const selected: typeof deduped = [];
  const pushBySignal = (signal: "주의" | "보호" | "생활", limit: number) => {
    for (const item of deduped) {
      if (item.signal !== signal) continue;
      if (selected.includes(item)) continue;
      selected.push(item);
      if (
        selected.filter((candidate) => candidate.signal === signal).length >=
        limit
      ) {
        break;
      }
    }
  };

  pushBySignal("주의", 3);
  pushBySignal("보호", 1);
  pushBySignal("생활", 1);

  for (const item of deduped) {
    if (selected.length >= 5) break;
    if (selected.includes(item)) continue;
    selected.push(item);
  }

  return selected.slice(0, 5).map((pair) => ({
    source: pair.source,
    question: pair.question,
    answer: pair.answer,
    signal: pair.signal,
  }));
}

function buildRecommendedNutrients(input: {
  assessFindings: string[];
  quickFindings: string[];
}) {
  const labels = [
    ...input.assessFindings.slice(0, 4),
    ...input.quickFindings.slice(0, 4),
  ]
    .map((finding) => stripPercentSuffix(normalizeCategoryLabel(finding)))
    .filter(Boolean);
  return uniq(labels, 4);
}

function buildDataScopeLabel(actorContext: UserContextSummary["actorContext"]) {
  if (!actorContext) return "미상";
  if (!actorContext.loggedIn) return "비로그인 기기 기반";
  if (actorContext.phoneLinked) return "로그인 계정 기반(주문 포함)";
  return "로그인 계정 기반(주문 미연결)";
}

function normalizeOrderItem(item: unknown): string | null {
  if (typeof item === "string") {
    const text = clip(item.trim(), 60);
    return text || null;
  }
  if (!item || typeof item !== "object") return null;

  const value = item as Record<string, unknown>;
  const nameRaw =
    (typeof value.name === "string" && value.name) ||
    (typeof value.productName === "string" && value.productName) ||
    (typeof value.label === "string" && value.label) ||
    (typeof value.title === "string" && value.title) ||
    (typeof value.sku === "string" && value.sku) ||
    (typeof (value.product as Record<string, unknown> | undefined)?.name ===
      "string" &&
      ((value.product as Record<string, unknown>).name as string)) ||
    (typeof (
      (value.pharmacyProduct as Record<string, unknown> | undefined)?.product as
        | Record<string, unknown>
        | undefined
    )?.name === "string" &&
      (((value.pharmacyProduct as Record<string, unknown>).product as Record<
        string,
        unknown
      >).name as string)) ||
    "";

  const quantityRaw = value.quantity ?? value.qty;
  const quantity =
    typeof quantityRaw === "number"
      ? quantityRaw
      : typeof quantityRaw === "string" && quantityRaw.trim()
      ? Number.parseFloat(quantityRaw)
      : NaN;

  const name = clip(nameRaw.trim(), 44);
  if (!name) return null;
  if (Number.isFinite(quantity) && quantity > 0) {
    return `${name} x${quantity}`;
  }
  return name;
}

function buildRecentOrders(orders: OrderLike[] | null | undefined) {
  if (!Array.isArray(orders)) return [];

  const sorted = [...orders].sort((left, right) => {
    const l = parseDate(left.createdAt || left.updatedAt)?.getTime() || 0;
    const r = parseDate(right.createdAt || right.updatedAt)?.getTime() || 0;
    return r - l;
  });

  return sorted.slice(0, 3).map((order) => {
    const sourceItems =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : Array.isArray(order.orderItems)
        ? order.orderItems
        : [];

    const items = uniq(
      sourceItems
        .map(normalizeOrderItem)
        .filter((value): value is string => Boolean(value)),
      4
    );

    return {
      orderedAt: formatDate(order.createdAt || order.updatedAt),
      status:
        typeof order.status === "string" && order.status.trim()
          ? order.status.trim()
          : "상태 미상",
      items: items.length ? items : ["상품 정보 없음"],
    };
  });
}

function findLastMessage(messages: MessageLike[] | undefined, role: "user" | "assistant") {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== role) continue;
    const text = clip(toPlainText(message.content).replace(/\s+/g, " ").trim(), 90);
    if (text) return text;
  }
  return "";
}

function buildPreviousConsultations(
  sessions: ConsultationLike[] | ChatSession[] | null | undefined,
  currentSessionId?: string | null
) {
  if (!Array.isArray(sessions)) return [];

  const normalized = sessions
    .filter((session) => {
      if (!session) return false;
      if (currentSessionId && session.id === currentSessionId) return false;
      return true;
    })
    .sort((left, right) => {
      const l = parseDate(left.updatedAt)?.getTime() || 0;
      const r = parseDate(right.updatedAt)?.getTime() || 0;
      return r - l;
    })
    .slice(0, 3)
    .map((session) => {
      const title =
        typeof session.title === "string" && session.title.trim()
          ? clip(session.title.trim(), 30)
          : "상담";
      const userPoint = findLastMessage(session.messages as MessageLike[] | undefined, "user");
      const assistantPoint = findLastMessage(
        session.messages as MessageLike[] | undefined,
        "assistant"
      );

      return {
        title,
        updatedAt: formatDate(session.updatedAt),
        userPoint,
        assistantPoint,
      };
    })
    .filter((session) => session.userPoint || session.assistantPoint);

  return normalized;
}

function buildProfileSummary(profile?: UserProfile | null) {
  if (!profile) return null;
  const goals = uniq(asStringArray(profile.goals), 3);
  const constraints = uniq(
    [
      ...asStringArray(profile.dietaryRestrictions),
      profile.pregnantOrBreastfeeding ? "임신/수유" : "",
      profile.caffeineSensitivity ? "카페인 민감" : "",
    ].filter(Boolean),
    4
  );
  const conditions = uniq(asStringArray(profile.conditions), 3);
  const medications = uniq(asStringArray(profile.medications), 3);
  const allergies = uniq(asStringArray(profile.allergies), 3);

  if (
    goals.length === 0 &&
    constraints.length === 0 &&
    conditions.length === 0 &&
    medications.length === 0 &&
    allergies.length === 0 &&
    profileSexAge(profile) === "없음"
  ) {
    return null;
  }

  return {
    sexAge: profileSexAge(profile),
    goals,
    constraints,
    conditions,
    medications,
    allergies,
  };
}

function buildPromptSummaryText(summary: {
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

function buildContextCardLines(promptSummaryText: string) {
  return promptSummaryText.split("\n").map((line) => line.trim());
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

function buildDataCollectionQuestions() {
  return [
    "현재 복용 중인 영양제·약 기준으로 중복 성분부터 점검해 주세요.",
    "지금 가장 중요한 목표 1개 기준으로 2주 복용 루틴을 짜주세요.",
    "최근 불편 증상 기준으로 이번 주 체크리스트를 정리해 주세요.",
  ];
}

function normalizeSuggestionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "")
    .trim();
}

function classifySuggestionIntent(value: string) {
  const text = value.replace(/\s+/g, "");
  if (/(루틴|스케줄|복용시간|타이밍|아침|저녁|순서)/.test(text)) return "schedule";
  if (/(중복|과다|상호작용|주의|피해야|안전|점검)/.test(text)) return "safety";
  if (/(점검|체크|기록|모니터링|체크리스트|지표)/.test(text)) return "monitoring";
  if (/(제품|가격|추천|구매|상품)/.test(text)) return "product";
  if (/(식단|생활|습관|운동|수면)/.test(text)) return "lifestyle";
  return "general";
}

function pickDiverseSuggestions(params: {
  candidates: string[];
  count: number;
  excludeSuggestions?: string[];
}) {
  const excludeKeys = new Set(
    (params.excludeSuggestions || []).map(normalizeSuggestionKey).filter(Boolean)
  );
  const selected: string[] = [];
  const selectedKeys = new Set<string>();
  const usedIntents = new Set<string>();

  const cleaned = params.candidates
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && line.length <= 90);

  for (const candidate of cleaned) {
    const key = normalizeSuggestionKey(candidate);
    if (!key || excludeKeys.has(key) || selectedKeys.has(key)) continue;
    const intent = classifySuggestionIntent(candidate);
    if (usedIntents.has(intent)) continue;
    selected.push(candidate);
    selectedKeys.add(key);
    usedIntents.add(intent);
    if (selected.length >= params.count) return selected;
  }

  for (const candidate of cleaned) {
    const key = normalizeSuggestionKey(candidate);
    if (!key || excludeKeys.has(key) || selectedKeys.has(key)) continue;
    selected.push(candidate);
    selectedKeys.add(key);
    if (selected.length >= params.count) return selected;
  }

  return selected;
}

export function buildDataDrivenSuggestions(
  summary: UserContextSummary,
  desiredCount = 2,
  excludeSuggestions: string[] = []
) {
  const count = clamp(desiredCount, 1, 6);
  const candidates: string[] = [];

  if (summary.recommendedNutrients.length > 0) {
    for (const nutrient of summary.recommendedNutrients.slice(0, 2)) {
      candidates.push(`${nutrient} 기준으로 아침/저녁 복용 순서를 2주 계획으로 짜주세요.`);
      candidates.push(`${nutrient} 관련해 지금 줄이거나 추가할 성분을 구분해 주세요.`);
    }
  }

  if (summary.notableResponses.length) {
    for (const response of summary.notableResponses.slice(0, 1)) {
      candidates.push(
        `응답하신 "${response.question}"(${response.answer})을 반영해 이번 주 점검표를 만들어 주세요.`
      );
    }
  }

  if (summary.recentOrders.length) {
    const firstOrder = summary.recentOrders[0];
    const firstItem = firstOrder.items[0];
    if (firstItem) {
      candidates.push(`최근 주문한 ${firstItem} 기준으로 중복·과다 가능성만 먼저 점검해 주세요.`);
      candidates.push(`최근 주문 제품을 유지하면서 부족한 영양소만 보완하는 조합을 짜주세요.`);
    }
  }

  if (summary.profile?.goals.length) {
    const goal = summary.profile.goals[0];
    candidates.push(`${goal} 목표를 14일 안에 점검할 수 있는 복용·생활 루틴을 정리해 주세요.`);
  }

  if (summary.profile?.constraints.length) {
    const constraint = summary.profile.constraints[0];
    candidates.push(`${constraint} 조건에서 피해야 할 성분과 대체 성분을 표로 정리해 주세요.`);
  }

  if (summary.previousConsultations.length) {
    const recent = summary.previousConsultations[0];
    candidates.push(`지난 상담(${recent.title}) 이후 지금 가장 먼저 조정할 2가지를 뽑아 주세요.`);
  }

  if (candidates.length === 0) {
    candidates.push(...buildDataCollectionQuestions());
  }

  candidates.push("제 데이터 기준으로 이번 주에 바로 실행할 2가지를 정리해 주세요.");

  const selected = pickDiverseSuggestions({
    candidates,
    count,
    excludeSuggestions,
  });
  if (selected.length >= count) return selected.slice(0, count);

  const fallback = buildDataCollectionQuestions();
  return pickDiverseSuggestions({
    candidates: selected.concat(fallback),
    count,
    excludeSuggestions,
  }).slice(0, count);
}

export function toPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(toPlainText).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.value === "string") return record.value;
    if (Array.isArray(record.parts)) return record.parts.map(toPlainText).join(" ");
    if (Array.isArray(record.content))
      return record.content.map(toPlainText).join(" ");
    if (Array.isArray(record.children))
      return record.children.map(toPlainText).join(" ");
  }
  return "";
}
