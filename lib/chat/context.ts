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
  normalized?: {
    topLabels?: unknown;
    scores?: Array<{ label?: unknown; value?: unknown }>;
  };
};

type CheckAiLike = {
  createdAt?: DateLike;
  labels?: unknown;
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

function parseAssessSummaryLine(line: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(.+?)\s+([\d.]+)%$/);
  if (!match) return normalizeCategoryLabel(trimmed);
  const label = normalizeCategoryLabel(match[1]);
  const percent = Number.parseFloat(match[2]);
  if (!Number.isFinite(percent)) return label;
  return `${label} ${percent.toFixed(1)}%`;
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
      if (value == null) return label;
      return `${label} ${(value * 100).toFixed(1)}%`;
    });
    return uniq(withScores, 7);
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
}) {
  const lines: string[] = [];

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

  return lines.join("\n");
}

function buildContextCardLines(promptSummaryText: string) {
  return promptSummaryText.split("\n").map((line) => line.trim());
}

export function buildUserContextSummary(
  input: UserContextSummaryInput
): UserContextSummary {
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
    contextCardLines: buildContextCardLines(promptSummaryText),
    promptSummaryText,
  };
}

function buildDataCollectionQuestions() {
  return [
    "현재 복용 중인 영양제와 약 이름을 알려주실 수 있을까요?",
    "요즘 가장 개선하고 싶은 목표를 1~2개만 알려주실래요?",
    "최근 검사 결과나 불편한 증상이 있다면 먼저 공유해 주세요.",
  ];
}

export function buildDataDrivenSuggestions(
  summary: UserContextSummary,
  desiredCount = 4
) {
  const count = clamp(desiredCount, 1, 6);
  const candidates: string[] = [];

  if (summary.latestAssess?.findings.length) {
    for (const finding of summary.latestAssess.findings.slice(0, 2)) {
      candidates.push(`${finding} 기준으로 복용 우선순위를 어떻게 잡으면 좋을까요?`);
      candidates.push(`${finding} 개선을 위해 2주 루틴으로 조정해 주세요.`);
    }
  }

  if (summary.latestQuick?.findings.length) {
    for (const finding of summary.latestQuick.findings.slice(0, 2)) {
      candidates.push(`${finding} 관련 성분은 언제 먹는 게 가장 효율적일까요?`);
    }
  }

  if (summary.recentOrders.length) {
    const firstOrder = summary.recentOrders[0];
    const firstItem = firstOrder.items[0];
    if (firstItem) {
      candidates.push(`최근 주문한 ${firstItem} 중심으로 복용 시간을 점검해 주세요.`);
      candidates.push(`최근 주문 성분과 중복될 수 있는 항목이 있는지 확인해 주세요.`);
    }
  }

  if (summary.profile?.goals.length) {
    const goal = summary.profile.goals[0];
    candidates.push(`${goal} 목표 기준으로 하루 복용 스케줄을 짜주세요.`);
  }

  if (summary.profile?.constraints.length) {
    const constraint = summary.profile.constraints[0];
    candidates.push(`${constraint} 조건에서 피해야 할 성분과 대안을 알려주세요.`);
  }

  if (summary.previousConsultations.length) {
    const recent = summary.previousConsultations[0];
    candidates.push(`지난 상담(${recent.title}) 이후에 이어서 조정할 포인트를 알려주세요.`);
  }

  if (candidates.length === 0) {
    candidates.push(...buildDataCollectionQuestions());
  }

  candidates.push("제 데이터 기준으로 이번 주에 꼭 점검할 3가지를 정리해 주세요.");

  return uniq(
    candidates
      .map((line) => line.trim())
      .filter((line) => line.length >= 12),
    count
  );
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
