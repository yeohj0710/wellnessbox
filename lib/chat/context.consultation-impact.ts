import type { ChatSession } from "@/types/chat";
import { clip, parseDate, toPlainText, uniq } from "./context.base";
import type { ConsultationLike, OrderLike, UserContextSummary } from "./context.types";

const ORDER_WINDOW_MS = 1000 * 60 * 60 * 24 * 21;

const PURCHASE_INTENT_REGEX =
  /(구매|주문|결제|장바구니|담아|시작|추천|구성|조합|뭐 먹|골라)/i;
const NARROWING_REGEX =
  /(1개|2개|한 개|두 개|하나만|두 가지만|비교|우선순위|좁혀|골라|먼저 정)/i;
const HESITATION_REGEX =
  /(고민|망설|헷갈|잘 모르|부담|복잡|어려|너무 많|결정이 안)/i;
const RETENTION_REGEX =
  /(재구매|리필|다시|계속|유지|루틴|조정|바꿔|다음 달|반복 구매)/i;

type Stage = UserContextSummary["consultationImpact"]["stage"];
type SessionLike = ConsultationLike | ChatSession;

type AnalyzedSession = {
  id: string;
  title: string;
  updatedAt: Date;
  purchaseIntent: boolean;
  narrowingIntent: boolean;
  hesitation: boolean;
  retentionIntent: boolean;
  convertedAfterConsult: boolean;
  daysToOrder: number | null;
};

function extractSessionText(session: SessionLike) {
  if (!Array.isArray(session.messages)) return "";
  return session.messages
    .map((message) => toPlainText(message?.content).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

function buildFocusPhrase(recommendedNutrients: string[]) {
  const focus = recommendedNutrients[0]?.trim();
  return focus ? `${focus} 축 기준으로` : "지금 상태 기준으로";
}

function analyzeSessions(params: {
  sessions: SessionLike[] | null | undefined;
  currentSessionId?: string | null;
  orders: OrderLike[] | null | undefined;
}) {
  const orderDates = Array.isArray(params.orders)
    ? params.orders
        .map((order) => parseDate(order.createdAt || order.updatedAt))
        .filter((value): value is Date => value instanceof Date)
        .sort((left, right) => left.getTime() - right.getTime())
    : [];

  if (!Array.isArray(params.sessions)) return [];

  return params.sessions
    .filter((session): session is SessionLike => Boolean(session))
    .filter((session) => !params.currentSessionId || session.id !== params.currentSessionId)
    .map((session) => {
      const updatedAt = parseDate(session.updatedAt);
      if (!updatedAt) return null;

      const text = extractSessionText(session);
      const nextOrder = orderDates.find((orderDate) => orderDate.getTime() > updatedAt.getTime());
      const diffMs = nextOrder ? nextOrder.getTime() - updatedAt.getTime() : null;
      const daysToOrder =
        diffMs != null ? Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))) : null;

      return {
        id: session.id || "",
        title:
          typeof session.title === "string" && session.title.trim()
            ? clip(session.title.trim(), 32)
            : "상담",
        updatedAt,
        purchaseIntent: PURCHASE_INTENT_REGEX.test(text),
        narrowingIntent: NARROWING_REGEX.test(text),
        hesitation: HESITATION_REGEX.test(text),
        retentionIntent: RETENTION_REGEX.test(text),
        convertedAfterConsult:
          diffMs != null && diffMs >= 0 && diffMs <= ORDER_WINDOW_MS,
        daysToOrder,
      } satisfies AnalyzedSession;
    })
    .filter((session): session is AnalyzedSession => session !== null)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

function buildLearnedPattern(
  convertedSessions: AnalyzedSession[],
  recommendedNutrients: string[]
) {
  const focusPhrase = buildFocusPhrase(recommendedNutrients);

  if (convertedSessions.some((session) => session.retentionIntent)) {
    return {
      label: "이전 구성과 조정 포인트를 같이 본 상담",
      prompt: `지난 주문을 기준으로 유지할 것과 조정할 것만 짧게 나눠주세요. ${focusPhrase} 바로 실행할 수 있게 정리해주세요.`,
    };
  }

  if (convertedSessions.some((session) => session.narrowingIntent)) {
    return {
      label: "후보를 1~2개로 좁힌 상담",
      prompt: `${focusPhrase} 지금 바로 시작하기 좋은 후보 1~2개만 이유와 함께 좁혀주세요.`,
    };
  }

  if (convertedSessions.some((session) => session.purchaseIntent)) {
    return {
      label: "바로 시작할 구성을 정한 상담",
      prompt: `${focusPhrase} 이번 주에 시작할 구성 1개만 정하고, 왜 그 구성이 맞는지 짧게 설명해주세요.`,
    };
  }

  return {
    label: "다음 행동이 분명한 상담",
    prompt: `${focusPhrase} 지금 가장 먼저 할 다음 행동 1가지만 정리해주세요.`,
  };
}

function resolveStage(params: {
  analyzedSessions: AnalyzedSession[];
  orderCount: number;
}) {
  const latest = params.analyzedSessions[0] ?? null;

  if (params.orderCount > 0 && (latest?.retentionIntent || params.orderCount >= 2)) {
    return "retention_ready" satisfies Stage;
  }

  if (
    params.orderCount === 0 &&
    latest &&
    latest.purchaseIntent &&
    (latest.narrowingIntent || !latest.hesitation)
  ) {
    return "ready_to_buy" satisfies Stage;
  }

  if (
    params.orderCount === 0 &&
    latest &&
    !latest.convertedAfterConsult &&
    (latest.hesitation || params.analyzedSessions.length >= 2)
  ) {
    return "stalled_in_consult" satisfies Stage;
  }

  if (latest && (latest.purchaseIntent || latest.narrowingIntent)) {
    return "needs_narrowing" satisfies Stage;
  }

  return "early_exploration" satisfies Stage;
}

export function buildConsultationImpactSummary(input: {
  orders: OrderLike[] | null | undefined;
  chatSessions: ConsultationLike[] | ChatSession[] | null | undefined;
  currentSessionId?: string | null;
  recommendedNutrients: string[];
}) {
  const analyzedSessions = analyzeSessions({
    sessions: input.chatSessions,
    currentSessionId: input.currentSessionId,
    orders: input.orders,
  });
  const convertedSessions = analyzedSessions.filter((session) => session.convertedAfterConsult);
  const stage = resolveStage({
    analyzedSessions,
    orderCount: Array.isArray(input.orders) ? input.orders.length : 0,
  });
  const learnedPattern = buildLearnedPattern(
    convertedSessions,
    input.recommendedNutrients
  );
  const latestSession = analyzedSessions[0] ?? null;
  const convertedCount = convertedSessions.length;

  const sharedEvidence = uniq(
    [
      convertedCount > 0
        ? `주문으로 이어진 상담 ${convertedCount}건에서 "${learnedPattern.label}" 패턴이 보였어요.`
        : "",
      latestSession && !latestSession.convertedAfterConsult
        ? `최근 상담 "${latestSession.title}" 이후 아직 주문 연결은 없었어요.`
        : "",
      latestSession?.hesitation
        ? "최근 상담에는 고민과 망설임 표현이 함께 보여 결정 단계가 비어 있을 가능성이 있어요."
        : "",
      latestSession?.daysToOrder != null
        ? `주문이 이어진 상담은 보통 ${latestSession.daysToOrder}일 안에 다음 행동이 정리됐어요.`
        : "",
    ].filter(Boolean),
    3
  );

  switch (stage) {
    case "retention_ready":
      return {
        stage,
        headline: "재구매는 지난 구성의 유지·조정 상담에서 가장 잘 이어져요.",
        insight:
          convertedCount > 0
            ? `이 사용자는 ${learnedPattern.label} 흐름에서 다시 구매로 이어진 적이 있어요. 이번에도 새 제안보다 유지할 것과 바꿀 것을 먼저 정리하는 편이 좋습니다.`
            : "재구매 단계에서는 새 구성을 넓게 설명하기보다 지난 주문 기준으로 유지·조정만 짧게 정리할 때 다음 행동이 빨라집니다.",
        evidence: sharedEvidence,
        learnedPattern: learnedPattern.label,
        recommendedActionLabel: "지난 주문 기준으로 조정 질문 이어가기",
        recommendedActionHref: "/my-data",
        draftPrompt: learnedPattern.prompt,
      } satisfies UserContextSummary["consultationImpact"];
    case "ready_to_buy":
      return {
        stage,
        headline: "지금은 후보를 1~2개로 좁히는 상담이 주문으로 가장 잘 이어집니다.",
        insight:
          convertedCount > 0
            ? `과거에는 ${learnedPattern.label} 패턴이 실제 주문으로 이어졌어요. 설명을 더 늘리기보다 바로 시작할 후보를 좁히는 쪽이 전환에 유리합니다.`
            : "첫 구매 직전에는 폭넓은 설명보다 바로 시작할 후보를 좁혀 주는 상담이 더 잘 먹힙니다.",
        evidence: sharedEvidence,
        learnedPattern: learnedPattern.label,
        recommendedActionLabel: "후보 1~2개로 바로 좁혀보기",
        recommendedActionHref: "/explore",
        draftPrompt: learnedPattern.prompt,
      } satisfies UserContextSummary["consultationImpact"];
    case "stalled_in_consult":
      return {
        stage,
        headline: "상담은 쌓였지만 결정 질문이 비어 있어 구매가 멈춘 상태예요.",
        insight:
          "질문을 더 넓히기보다 이번에는 하나만 정하는 질문으로 바꾸는 편이 실제 주문 연결에 더 가깝습니다.",
        evidence: sharedEvidence,
        learnedPattern: learnedPattern.label,
        recommendedActionLabel: "이번에는 하나만 결정해보기",
        recommendedActionHref: "/explore",
        draftPrompt:
          "지금 제 상황에서 이번 주에 시작할 구성 1개만 정하고, 왜 그 구성이 맞는지 짧게 설명해주세요.",
      } satisfies UserContextSummary["consultationImpact"];
    case "needs_narrowing":
      return {
        stage,
        headline: "상담 뒤 다음 행동이 분명해지면 구매 연결이 더 좋아집니다.",
        insight:
          "지금은 설명을 넓히기보다 비교 기준 하나를 세우고, 바로 실행할 조합만 남기는 흐름이 더 적절합니다.",
        evidence: sharedEvidence,
        learnedPattern: learnedPattern.label,
        recommendedActionLabel: "비교 기준 하나로 다시 묻기",
        recommendedActionHref: "/explore",
        draftPrompt:
          "제 상황에서 비교 기준 하나만 잡고, 지금 시작할 후보 2개만 남겨서 설명해주세요.",
      } satisfies UserContextSummary["consultationImpact"];
    default:
      return {
        stage,
        headline: "구매 전 상담 품질은 목표 한 가지를 또렷하게 말할 때 가장 좋아집니다.",
        insight:
          "아직은 넓은 상담보다 지금 가장 중요한 목표 하나를 잡아두면 이후 추천과 구매 연결이 훨씬 선명해집니다.",
        evidence: sharedEvidence,
        learnedPattern: learnedPattern.label,
        recommendedActionLabel: "목표 하나 기준으로 다시 시작하기",
        recommendedActionHref: "/check-ai",
        draftPrompt:
          "제 목표 한 가지를 기준으로 지금 먼저 볼 포인트와 시작 구성을 짧게 정리해주세요.",
      } satisfies UserContextSummary["consultationImpact"];
  }
}
