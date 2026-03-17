import { buildUserContextSummary } from "@/lib/chat/context";
import {
  normalizeAssessmentResult,
  normalizeCheckAiResult,
} from "@/lib/server/result-normalizer";
import type { UserProfile as ChatUserProfile } from "@/types/chat";
import type { MyDataCollections } from "./myDataPageData";
import { formatDate } from "./myDataPagePrimitives";

type TimelineItem = {
  label: string;
  detail: string;
  occurredAt: Date | string | null;
};

type ChangeCard = {
  label: string;
  title: string;
  body: string;
};

export type MyDataJourneyInsight = {
  stageLabel: string;
  tone: "slate" | "sky" | "emerald" | "amber";
  title: string;
  description: string;
  helper: string;
  evidenceChips: string[];
  changeCards: ChangeCard[];
  timeline: TimelineItem[];
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

export function buildMyDataContextSummary(input: {
  profileData: unknown;
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const latestAssess = input.assessResults[0];
  const latestCheck = input.checkAiResults[0];
  const latestAssessNormalized = latestAssess
    ? normalizeAssessmentResult(latestAssess)
    : null;
  const latestCheckNormalized = latestCheck
    ? normalizeCheckAiResult(latestCheck)
    : null;

  return buildUserContextSummary({
    profile: parseProfileData(input.profileData),
    orders: input.orders,
    assessResult: latestAssess
      ? {
          createdAt: latestAssess.createdAt,
          normalized: {
            topLabels: latestAssessNormalized?.topLabels ?? [],
          },
          answers: latestAssess.answers,
          summary: latestAssess.cResult,
        }
      : null,
    checkAiResult: latestCheck
      ? {
          createdAt: latestCheck.createdAt,
          normalized: {
            topLabels: latestCheckNormalized?.topLabels ?? [],
          },
          answers: latestCheck.answers,
          labels: latestCheckNormalized?.topLabels ?? [],
        }
      : null,
    healthLink: input.healthLink,
    chatSessions: input.chatSessions,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseProfileData(data: unknown): ChatUserProfile | null {
  const record = asRecord(data);
  if (!record) return null;

  const profile: ChatUserProfile = {
    name: typeof record.name === "string" ? record.name : undefined,
    age: asNumber(record.age),
    sex:
      record.sex === "male" || record.sex === "female" || record.sex === "other"
        ? record.sex
        : undefined,
    heightCm: asNumber(record.heightCm),
    weightKg: asNumber(record.weightKg),
    conditions: asStringArray(record.conditions),
    medications: asStringArray(record.medications),
    allergies: asStringArray(record.allergies),
    goals: asStringArray(record.goals),
    dietaryRestrictions: asStringArray(record.dietaryRestrictions),
    pregnantOrBreastfeeding: asBoolean(record.pregnantOrBreastfeeding),
    caffeineSensitivity: asBoolean(record.caffeineSensitivity),
  };

  const hasAnyValue = Object.values(profile).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined;
  });

  return hasAnyValue ? profile : null;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function buildTimeline(input: {
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const latestAssess = input.assessResults[0];
  const latestCheck = input.checkAiResults[0];
  const latestOrder = input.orders[0];
  const latestChat = input.chatSessions[0];
  const healthLink = input.healthLink;

  const assessLabels = latestAssess
    ? normalizeAssessmentResult(latestAssess).topLabels
    : [];
  const checkLabels = latestCheck ? normalizeCheckAiResult(latestCheck).topLabels : [];
  const orderItems = uniqueStrings(
    (latestOrder?.orderItems || [])
      .map((item) => item.pharmacyProduct?.product?.name ?? "")
      .filter(Boolean),
    3
  );

  const items: Array<TimelineItem | null> = [
    latestOrder
      ? {
          label: "주문",
          detail:
            orderItems.length > 0
              ? `${orderItems.join(", ")} 주문`
              : `주문 #${latestOrder.id}`,
          occurredAt: latestOrder.createdAt,
        }
      : null,
    latestAssess
      ? {
          label: "정밀 검사",
          detail:
            assessLabels.length > 0
              ? `${assessLabels.join(", ")} 축이 높게 나왔어요`
              : "정밀 검사 결과가 저장됐어요",
          occurredAt: latestAssess.createdAt,
        }
      : null,
    latestCheck
      ? {
          label: "빠른 검사",
          detail:
            checkLabels.length > 0
              ? `${checkLabels.join(", ")} 중심으로 읽혔어요`
              : "빠른 검사 결과가 저장됐어요",
          occurredAt: latestCheck.createdAt,
        }
      : null,
    latestChat
      ? {
          label: "AI 상담",
          detail: latestChat.title || "최근 상담이 이어졌어요",
          occurredAt: latestChat.updatedAt,
        }
      : null,
    healthLink
      ? {
          label: "건강링크",
          detail:
            healthLink.headline ||
            healthLink.metricInsights[0]?.interpretation ||
            "건강링크 데이터가 연결됐어요",
          occurredAt: healthLink.fetchedAt,
        }
      : null,
  ];

  return items
    .filter((item): item is TimelineItem => item !== null)
    .sort((left, right) => {
      const leftAt = toDate(left.occurredAt)?.getTime() ?? 0;
      const rightAt = toDate(right.occurredAt)?.getTime() ?? 0;
      return rightAt - leftAt;
    })
    .slice(0, 5);
}

function buildStage(input: {
  ordersCount: number;
  lastOrderDays: number | null;
  latestResultDays: number | null;
  latestChatDays: number | null;
  summary: ReturnType<typeof buildUserContextSummary>;
}) {
  if (input.ordersCount > 0) {
    if (input.lastOrderDays != null && input.lastOrderDays <= 14) {
      return {
        stageLabel: "실행 중",
        tone: "emerald" as const,
        title: "검사와 상담이 실제 복용 단계로 이어졌어요",
        description:
          "지금은 무엇을 볼지보다 복용 후 체감과 유지 여부를 확인하는 구간에 가까워요.",
        helper:
          "주문 후 1~2주차에 체감 기록이 붙으면 다음 구성 조정이 훨씬 쉬워져요.",
        primaryAction: {
          href: "/chat?from=my-data-journey",
          label: "체감 상담 이어가기",
        },
        secondaryAction: {
          href: "/my-orders",
          label: "주문 흐름 확인하기",
        },
      };
    }

    if (input.lastOrderDays != null && input.lastOrderDays <= 35) {
      return {
        stageLabel: "체감 확인",
        tone: "sky" as const,
        title: "이전 선택이 나에게 맞는지 점검하기 좋은 시점이에요",
        description:
          "주문 이후 시간이 조금 지나, 유지할지 조정할지 판단할 근거가 쌓이는 구간이에요.",
        helper:
          "체감이 애매하면 같은 구성을 반복하기보다 지금 느끼는 변화부터 짧게 정리해보는 편이 좋아요.",
        primaryAction: {
          href: "/chat?from=my-data-journey",
          label: "지금 느낌 정리하기",
        },
        secondaryAction: {
          href: "/explore",
          label: "구성 다시 비교하기",
        },
      };
    }

    return {
      stageLabel: "복귀 점검",
      tone: "amber" as const,
      title: "여정이 조금 멈춘 상태라, 가볍게 다시 연결하는 편이 좋아요",
      description:
        "예전 데이터는 남아 있지만 최근 실행이 줄어들어, 동일 구성 반복보다 재시작 설계가 더 잘 맞을 수 있어요.",
      helper:
        "오랜 공백 뒤에는 7일치 재시작이나 약사 점검이 다시 움직이기 가장 쉬운 진입점이에요.",
      primaryAction: {
        href: "/?package=7#home-products",
        label: "7일치로 다시 시작하기",
      },
      secondaryAction: {
        href: "/chat?from=my-data-journey",
        label: "약사와 먼저 점검하기",
      },
    };
  }

  if (
    input.summary.latestAssess &&
    (input.summary.latestQuick || input.summary.previousConsultations.length > 0)
  ) {
    return {
      stageLabel: "결정 직전",
      tone: "sky" as const,
      title: "검사와 상담이 쌓여 있어, 이제 선택을 연결하면 되는 상태예요",
      description:
        "막연한 탐색 단계를 지나서 어떤 축이 맞는지 윤곽이 이미 잡혀 있어요.",
      helper:
        "결정이 식기 전에 7일치로 먼저 비교하거나 상담을 이어가면 전환이 훨씬 자연스러워져요.",
      primaryAction: {
        href: "/explore",
        label: "맞춤 상품 보러가기",
      },
      secondaryAction: {
        href: "/chat?from=my-data-journey",
        label: "상담 이어가기",
      },
    };
  }

  if (input.latestResultDays != null || input.latestChatDays != null) {
    return {
      stageLabel: "탐색 심화",
      tone: "slate" as const,
      title: "초기 정보가 쌓이기 시작해, 다음 질문이 더 중요해진 단계예요",
      description:
        "지금은 기록 하나를 더 남길 때마다 추천의 방향이 훨씬 선명해질 수 있어요.",
      helper:
        "빠른 검사나 정밀 검사 한 번 더, 혹은 상담 한 번이 탐색을 행동으로 바꿔주는 구간이에요.",
      primaryAction: {
        href: "/check-ai",
        label: "빠른 검사 다시 하기",
      },
      secondaryAction: {
        href: "/assess",
        label: "정밀 검사 이어가기",
      },
    };
  }

  return {
    stageLabel: "입문 탐색",
    tone: "slate" as const,
    title: "아직 여정의 첫 기록이 많지 않아, 한 번 더 남기는 것이 중요해요",
    description:
      "정보가 적을수록 상품보다 내 상태를 먼저 남겨두는 편이 이후 추천과 상담의 질을 올려줘요.",
    helper:
      "시작 단계에서는 혜택보다 기록의 첫 축을 만드는 일이 가장 큰 레버리지예요.",
    primaryAction: {
      href: "/check-ai",
      label: "빠른 검사 시작하기",
    },
    secondaryAction: {
      href: "/chat?from=my-data-journey",
      label: "AI 상담 열기",
    },
  };
}

function buildNextCheckpoint(input: {
  lastOrderDays: number | null;
  latestResultDays: number | null;
  latestChatDays: number | null;
  ordersCount: number;
}) {
  if (input.ordersCount > 0 && input.lastOrderDays != null && input.lastOrderDays <= 14) {
    return {
      title: "복용 2주차쯤 다시 보면 좋아요",
      body: `마지막 주문 후 ${input.lastOrderDays}일째라, 지금부터 1주 안에 체감이나 불편감을 한 번 정리해두면 다음 조정이 쉬워져요.`,
    };
  }

  if (input.ordersCount > 0 && input.lastOrderDays != null) {
    return {
      title: "재시작 전 점검 시점이에요",
      body: `마지막 주문 후 ${input.lastOrderDays}일이 지나, 그대로 반복할지 가볍게 다시 시작할지 정리해볼 구간이에요.`,
    };
  }

  if (input.latestResultDays != null && input.latestResultDays <= 7) {
    return {
      title: "이번 주 안에 연결하면 좋아요",
      body: "최근 검사 결과의 열기가 남아 있을 때 상품 비교나 상담으로 이어가면 결정 피로가 훨씬 적어요.",
    };
  }

  if (input.latestChatDays != null && input.latestChatDays <= 7) {
    return {
      title: "상담 기억이 남아 있을 때 다시 들어오면 좋아요",
      body: "최근 상담 내용을 기준으로 바로 후보를 좁힐 수 있는 시기예요.",
    };
  }

  return {
    title: "이번 주에 기록 하나를 더 남겨보세요",
    body: "검사, 상담, 주문 중 하나만 더 이어져도 내 상태를 해석하는 연결선이 크게 늘어납니다.",
  };
}

export function buildMyDataJourneyInsight(input: {
  profileData: unknown;
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}): MyDataJourneyInsight | null {
  const latestAssess = input.assessResults[0];
  const latestCheck = input.checkAiResults[0];
  const summary = buildMyDataContextSummary(input);

  if (!summary.hasAnyData) return null;

  const timeline = buildTimeline(input);
  const latestResultAt = [latestAssess?.createdAt, latestCheck?.createdAt]
    .map((value) => toDate(value ?? null))
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
  const latestResultDays = daysSince(latestResultAt);
  const latestChatDays = daysSince(input.chatSessions[0]?.updatedAt);
  const lastOrderDays = daysSince(input.orders[0]?.createdAt);
  const stage = buildStage({
    ordersCount: input.orders.length,
    lastOrderDays,
    latestResultDays,
    latestChatDays,
    summary,
  });
  const nextCheckpoint = buildNextCheckpoint({
    lastOrderDays,
    latestResultDays,
    latestChatDays,
    ordersCount: input.orders.length,
  });
  const evidenceChips = uniqueStrings(
    [
      ...summary.evidenceLabels,
      ...summary.recommendedNutrients.slice(0, 3),
    ],
    6
  );

  const latestTimeline = timeline[0];
  const latestChangeTitle = latestTimeline
    ? `${latestTimeline.label} 데이터가 가장 최근에 추가됐어요`
    : "최근 기록이 쌓였어요";
  const latestChangeBody = latestTimeline
    ? `${formatDate(latestTimeline.occurredAt)} 기준으로 ${latestTimeline.detail}`
    : "최근 데이터가 새로 들어왔어요.";

  const signalTitle =
    summary.recommendedNutrients.length > 0
      ? summary.recommendedNutrients.slice(0, 3).join(", ")
      : summary.explainability.confidenceLabel;
  const signalBody =
    summary.recommendedNutrients.length > 0
      ? `여러 기록을 묶어보면 지금은 ${summary.recommendedNutrients
          .slice(0, 3)
          .join(", ")} 축이 반복해서 보입니다.`
      : summary.explainability.confidenceNote;

  return {
    stageLabel: stage.stageLabel,
    tone: stage.tone,
    title: stage.title,
    description: stage.description,
    helper: stage.helper,
    evidenceChips,
    changeCards: [
      {
        label: "최근 변화",
        title: latestChangeTitle,
        body: latestChangeBody,
      },
      {
        label: "지금 읽히는 축",
        title: signalTitle,
        body: signalBody,
      },
      {
        label: "다음 확인",
        title: nextCheckpoint.title,
        body: nextCheckpoint.body,
      },
    ],
    timeline,
    primaryAction: stage.primaryAction,
    secondaryAction: stage.secondaryAction,
  };
}
