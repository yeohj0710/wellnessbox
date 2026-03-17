"use server";

import type { Prisma } from "@prisma/client";

import db from "@/lib/db";
import { buildOrderPhoneCandidates } from "@/lib/order/query-support";
import { normalizeAssessmentResult } from "@/lib/server/result-normalizer.assess";
import { normalizeCheckAiResult } from "@/lib/server/result-normalizer.check-ai";

const recentOrderSelection = {
  id: true,
  status: true,
  createdAt: true,
  totalPrice: true,
  orderItems: {
    select: {
      quantity: true,
      pharmacyProduct: {
        select: {
          optionType: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      review: {
        select: {
          rate: true,
          content: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

const pharmUser360OrderSelection = {
  id: true,
  status: true,
  createdAt: true,
  phone: true,
  appUserId: true,
  totalPrice: true,
  orderItems: recentOrderSelection.orderItems,
  appUser: {
    select: {
      id: true,
      nickname: true,
      phone: true,
      phoneLinkedAt: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" as const },
        take: 5,
        select: recentOrderSelection,
      },
      assessResults: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: {
          id: true,
          clientId: true,
          appUserId: true,
          answers: true,
          cResult: true,
          questionSnapshot: true,
          scoreSnapshot: true,
          tzOffsetMinutes: true,
          createdAt: true,
        },
      },
      checkAiResults: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: {
          id: true,
          clientId: true,
          appUserId: true,
          result: true,
          answers: true,
          questionSnapshot: true,
          scoreSnapshot: true,
          tzOffsetMinutes: true,
          createdAt: true,
        },
      },
      chatSessions: {
        orderBy: { updatedAt: "desc" as const },
        take: 2,
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      },
      healthProviderLinks: {
        orderBy: { updatedAt: "desc" as const },
        take: 3,
        select: {
          provider: true,
          linked: true,
          lastLinkedAt: true,
          lastFetchedAt: true,
          lastErrorCode: true,
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type RecentOrderRecord = Prisma.OrderGetPayload<{
  select: typeof recentOrderSelection;
}>;

type PharmUser360OrderRecord = Prisma.OrderGetPayload<{
  select: typeof pharmUser360OrderSelection;
}>;

type User360Event = {
  date: Date;
  line: string;
};

type User360ReviewSignal = {
  totalCount: number;
  lowCount: number;
  latestLowLine: string | null;
};

export type PharmUser360Summary = {
  tone: "strong" | "medium" | "soft";
  headline: string;
  summary: string;
  statBadges: string[];
  contextLines: string[];
  recentChangeLines: string[];
  cautionLines: string[];
  nextActionLines: string[];
};

function toDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function daysSince(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function compactText(value: string | null | undefined, max = 90) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
}

function uniqueLines(lines: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = compactText(line, 160);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function formatRelative(value: Date | string | null | undefined) {
  const days = daysSince(value);
  if (days == null) return "";
  if (days === 0) return "오늘";
  if (days === 1) return "1일 전";
  if (days < 7) return `${days}일 전`;
  if (days < 35) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

function summarizeOrderItems(order: RecentOrderRecord, limit = 2) {
  const names = order.orderItems
    .map((item) => compactText(item.pharmacyProduct?.product?.name, 24))
    .filter(Boolean);

  if (names.length === 0) return "구성 확인 필요";
  const primary = names.slice(0, limit).join(", ");
  if (names.length <= limit) return primary;
  return `${primary} 외 ${names.length - limit}개`;
}

function collectReviewSignals(orders: RecentOrderRecord[]): User360ReviewSignal {
  const reviews = orders
    .flatMap((order) =>
      order.orderItems
        .map((item) => item.review)
        .filter(
          (
            review
          ): review is NonNullable<
            RecentOrderRecord["orderItems"][number]["review"]
          > => review !== null
        )
    )
    .sort((left, right) => {
      const leftTime = toDate(left.createdAt)?.getTime() ?? 0;
      const rightTime = toDate(right.createdAt)?.getTime() ?? 0;
      return rightTime - leftTime;
    });

  const lowReview = reviews.find((review) => typeof review.rate === "number" && review.rate <= 2.5);

  return {
    totalCount: reviews.length,
    lowCount: reviews.filter(
      (review) => typeof review.rate === "number" && review.rate <= 2.5
    ).length,
    latestLowLine: lowReview
      ? compactText(lowReview.content, 96) ||
        `${Math.round((lowReview.rate ?? 0) * 10) / 10}점 낮은 후기 이력이 있어요.`
      : null,
  };
}

function getHealthLinkLabel(provider: string | null | undefined) {
  if (!provider) return "건강 데이터";
  if (provider.toLowerCase() === "nhis") return "건강링크";
  return provider.toUpperCase();
}

function buildResultLabels(order: PharmUser360OrderRecord) {
  const assess = order.appUser?.assessResults[0];
  const checkAi = order.appUser?.checkAiResults[0];

  const assessLabels = assess
    ? normalizeAssessmentResult(assess).topLabels.slice(0, 2)
    : [];
  const checkAiLabels = checkAi
    ? normalizeCheckAiResult(checkAi).topLabels.slice(0, 2)
    : [];

  return uniqueLines([...checkAiLabels, ...assessLabels], 3);
}

function buildRecentChangeLines(input: {
  currentOrder: PharmUser360OrderRecord;
  recentOrders: RecentOrderRecord[];
  resultLabels: string[];
}) {
  const events: User360Event[] = [];
  const priorOrder = input.recentOrders.find(
    (recentOrder) => recentOrder.id !== input.currentOrder.id
  );
  const latestAssess = input.currentOrder.appUser?.assessResults[0];
  const latestCheckAi = input.currentOrder.appUser?.checkAiResults[0];
  const latestChat = input.currentOrder.appUser?.chatSessions[0];
  const latestHealthLink =
    input.currentOrder.appUser?.healthProviderLinks.find((link) => link.linked) ??
    input.currentOrder.appUser?.healthProviderLinks[0];

  if (priorOrder) {
    const orderDate = toDate(priorOrder.createdAt);
    if (orderDate) {
      events.push({
        date: orderDate,
        line: `이전 주문 ${formatRelative(priorOrder.createdAt)} · ${summarizeOrderItems(priorOrder)}`,
      });
    }
  }

  if (latestCheckAi) {
    const date = toDate(latestCheckAi.createdAt);
    if (date) {
      events.push({
        date,
        line: `빠른검사 ${formatRelative(latestCheckAi.createdAt)} · ${
          input.resultLabels[0] ? `${input.resultLabels[0]} 중심` : "결과 기록 있음"
        }`,
      });
    }
  }

  if (latestAssess) {
    const date = toDate(latestAssess.createdAt);
    if (date) {
      events.push({
        date,
        line: `정밀검사 ${formatRelative(latestAssess.createdAt)} · ${
          input.resultLabels[1] ? `${input.resultLabels[1]} 포함` : "정밀 결과 기록 있음"
        }`,
      });
    }
  }

  if (latestChat) {
    const date = toDate(latestChat.updatedAt);
    if (date) {
      events.push({
        date,
        line: `상담 ${formatRelative(latestChat.updatedAt)} · ${compactText(latestChat.title, 36) || "상담 이력"}`,
      });
    }
  }

  if (latestHealthLink?.lastFetchedAt) {
    const date = toDate(latestHealthLink.lastFetchedAt);
    if (date) {
      events.push({
        date,
        line: `${getHealthLinkLabel(latestHealthLink.provider)} ${formatRelative(
          latestHealthLink.lastFetchedAt
        )} 갱신`,
      });
    }
  }

  return events
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 4)
    .map((entry) => entry.line);
}

function buildContextLines(input: {
  currentOrder: PharmUser360OrderRecord;
  recentOrders: RecentOrderRecord[];
  resultLabels: string[];
  reviewSignals: User360ReviewSignal;
}) {
  const lines: string[] = [];
  const appUser = input.currentOrder.appUser;
  const priorOrder = input.recentOrders.find(
    (recentOrder) => recentOrder.id !== input.currentOrder.id
  );

  if (appUser) {
    lines.push(
      appUser.phoneLinkedAt
        ? "회원 기록과 전화번호가 연결돼 있어 이전 흐름을 이어 보기 쉬워요."
        : "회원 기록은 있지만 전화번호 연동이 약해 주문 이력은 한 번 더 확인하는 편이 좋아요."
    );
  } else {
    lines.push("비회원 주문 중심이라 현재 주문/메시지 맥락을 기준으로 보수적으로 확인하는 편이 안전해요.");
  }

  lines.push(
    priorOrder
      ? `최근 주문 ${input.recentOrders.length}건 · 마지막 재주문은 ${formatRelative(priorOrder.createdAt)}예요.`
      : "최근 주문 이력이 얕아 이번 주문의 기대치와 현재 복용 상황을 먼저 맞추는 편이 좋아요."
  );

  if (input.resultLabels.length > 0) {
    lines.push(`최근 결과 축: ${input.resultLabels.join(", ")}`);
  }

  if (input.reviewSignals.totalCount > 0) {
    lines.push(
      input.reviewSignals.lowCount > 0
        ? `후기 ${input.reviewSignals.totalCount}건 중 낮은 후기 ${input.reviewSignals.lowCount}건이 있어 기대 불일치 포인트를 먼저 확인하면 좋아요.`
        : `후기 ${input.reviewSignals.totalCount}건이 있어 이전 체감/만족 흐름을 참고할 수 있어요.`
    );
  }

  return uniqueLines(lines, 4);
}

function buildCautionLines(input: {
  currentOrder: PharmUser360OrderRecord;
  reviewSignals: User360ReviewSignal;
  recentOrders: RecentOrderRecord[];
}) {
  const lines: string[] = [];
  const appUser = input.currentOrder.appUser;
  const latestChat = appUser?.chatSessions[0];
  const latestHealthLink =
    appUser?.healthProviderLinks.find((link) => link.linked) ??
    appUser?.healthProviderLinks[0];

  if (input.reviewSignals.latestLowLine) {
    lines.push(`최근 낮은 후기: ${input.reviewSignals.latestLowLine}`);
  }

  if (!appUser) {
    lines.push("회원 연결이 없어 검사/상담 기록보다 주문과 메시지 기준으로 확인 범위를 좁히는 편이 좋아요.");
  } else if (!appUser.phoneLinkedAt) {
    lines.push("회원 기록은 있지만 전화 연동이 약해 다른 번호 주문이 섞여 있을 가능성을 열어두고 보세요.");
  }

  if (latestHealthLink?.linked) {
    const staleDays = daysSince(latestHealthLink.lastFetchedAt);
    if (staleDays != null && staleDays >= 45) {
      lines.push(
        `${getHealthLinkLabel(latestHealthLink.provider)}가 ${staleDays}일째 갱신되지 않아 최근 복용약/검진 변화는 다시 확인하는 편이 좋아요.`
      );
    }
  } else if (appUser && latestHealthLink?.lastErrorCode) {
    lines.push("건강 데이터 연결이 불안정한 흔적이 있어 복용약/질환은 직접 다시 확인하는 편이 안전해요.");
  }

  if (latestChat && input.recentOrders.length <= 2) {
    const days = daysSince(latestChat.updatedAt);
    if (days != null && days <= 14) {
      lines.push("최근 상담 흔적이 있는데 주문 이력은 아직 얕아 같은 설명 반복보다 망설인 이유를 먼저 짚는 편이 좋아요.");
    }
  }

  return uniqueLines(lines, 4);
}

function buildNextActionLines(input: {
  currentOrder: PharmUser360OrderRecord;
  recentOrders: RecentOrderRecord[];
  resultLabels: string[];
  reviewSignals: User360ReviewSignal;
}) {
  const lines: string[] = [];
  const appUser = input.currentOrder.appUser;
  const latestChat = appUser?.chatSessions[0];
  const latestHealthLink =
    appUser?.healthProviderLinks.find((link) => link.linked) ??
    appUser?.healthProviderLinks[0];
  const priorOrder = input.recentOrders.find(
    (recentOrder) => recentOrder.id !== input.currentOrder.id
  );

  if (input.reviewSignals.latestLowLine) {
    lines.push("지난 실망 이유가 이번에도 반복되지 않는지 먼저 확인하고, 이번 구성에서 달라진 점을 짧게 설명하세요.");
  }

  if (latestChat) {
    const days = daysSince(latestChat.updatedAt);
    if (days != null && days <= 21) {
      lines.push("이전 상담 내용을 처음부터 반복하기보다 그 뒤에 달라진 증상, 목표, 복용 상황만 먼저 물어보세요.");
    }
  }

  if (input.resultLabels.length > 0) {
    lines.push(`최근 결과 축(${input.resultLabels.join(", ")})과 현재 구성의 연결 이유를 1~2문장으로 먼저 짚어주세요.`);
  } else if (priorOrder) {
    lines.push("이전 주문 이후 체감 변화나 복용 지속 여부가 어땠는지 먼저 확인하면 설명 범위를 빠르게 좁힐 수 있어요.");
  } else {
    lines.push("현재 복용 중인 약, 진단받은 질환, 이번에 가장 기대하는 변화 1개만 먼저 확인하세요.");
  }

  if (latestHealthLink?.linked) {
    const staleDays = daysSince(latestHealthLink.lastFetchedAt);
    if (staleDays != null && staleDays >= 45) {
      lines.push("건강링크가 오래돼 최신 복용약이나 검진 변화가 있었는지 한 번 더 물어보는 편이 좋아요.");
    }
  }

  return uniqueLines(lines, 3);
}

function resolveTone(input: {
  reviewSignals: User360ReviewSignal;
  cautionLines: string[];
}) {
  if (input.reviewSignals.lowCount > 0) return "strong" as const;
  if (input.cautionLines.length >= 2) return "medium" as const;
  return "soft" as const;
}

function buildHeadline(input: {
  currentOrder: PharmUser360OrderRecord;
  recentOrders: RecentOrderRecord[];
  resultLabels: string[];
  reviewSignals: User360ReviewSignal;
}) {
  const hasAppContext = Boolean(
    input.currentOrder.appUser &&
      (input.currentOrder.appUser.chatSessions.length > 0 ||
        input.currentOrder.appUser.assessResults.length > 0 ||
        input.currentOrder.appUser.checkAiResults.length > 0)
  );
  const priorOrderCount = input.recentOrders.filter(
    (recentOrder) => recentOrder.id !== input.currentOrder.id
  ).length;

  if (input.reviewSignals.lowCount > 0) {
    return {
      headline: "이전 실망 경험을 먼저 풀어야 하는 사용자예요.",
      summary:
        "낮은 후기나 기대 불일치 흔적이 있어 상품 설명보다 왜 실망했는지부터 짧게 확인하는 편이 좋아요.",
    };
  }

  if (priorOrderCount >= 2) {
    return {
      headline: "반복 이용 맥락이 있는 사용자예요.",
      summary:
        "이전 주문과 최근 변화까지 같이 보면 같은 문진을 반복하지 않고 필요한 설명만 빠르게 좁힐 수 있어요.",
    };
  }

  if (hasAppContext && input.resultLabels.length > 0) {
    return {
      headline: "검사와 상담 흔적이 연결된 사용자예요.",
      summary:
        "최근 결과 축과 상담 맥락이 있어 기본 질문보다 변화 포인트와 현재 우려를 먼저 확인하는 편이 좋아요.",
    };
  }

  if (input.resultLabels.length > 0) {
    return {
      headline: "최근 검사 결과를 들고 들어온 사용자예요.",
      summary:
        "결과와 현재 주문의 연결 이유를 먼저 설명해 주면 불필요한 망설임을 줄이기 쉬워요.",
    };
  }

  return {
    headline: "현재 주문 맥락을 먼저 짚어야 하는 사용자예요.",
    summary:
      "앱 기록이 깊지 않아도 주문, 후기, 메시지 기준으로 핵심 질문을 빠르게 좁히면 검토 시간이 줄어요.",
  };
}

function buildStatBadges(input: {
  currentOrder: PharmUser360OrderRecord;
  recentOrders: RecentOrderRecord[];
  resultLabels: string[];
  reviewSignals: User360ReviewSignal;
}) {
  const badges: string[] = [];
  const appUser = input.currentOrder.appUser;
  const latestChat = appUser?.chatSessions[0];

  badges.push(
    appUser
      ? appUser.phoneLinkedAt
        ? "회원+전화 연동"
        : "회원 기록"
      : "비회원 주문"
  );
  badges.push(`주문 ${input.recentOrders.length}건`);

  if (input.resultLabels[0]) {
    badges.push(`${input.resultLabels[0]} 중심`);
  }

  if (input.reviewSignals.lowCount > 0) {
    badges.push(`낮은 후기 ${input.reviewSignals.lowCount}건`);
  } else if (input.reviewSignals.totalCount > 0) {
    badges.push(`후기 ${input.reviewSignals.totalCount}건`);
  }

  if (latestChat) {
    badges.push(`상담 ${formatRelative(latestChat.updatedAt)}`);
  }

  return uniqueLines(badges, 4);
}

export async function getPharmUser360ByOrderId(
  orderId: number
): Promise<PharmUser360Summary | null> {
  const order = await db.order.findFirst({
    where: { id: orderId },
    select: pharmUser360OrderSelection,
  });

  if (!order) return null;

  let recentOrders = order.appUser?.orders ?? [];

  if (recentOrders.length === 0 && order.phone) {
    const phoneCandidates = buildOrderPhoneCandidates(order.phone);
    if (phoneCandidates.length > 0) {
      recentOrders = await db.order.findMany({
        where: {
          OR: phoneCandidates.map((candidate) => ({ phone: candidate })),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: recentOrderSelection,
      });
    }
  }

  const resultLabels = buildResultLabels(order);
  const reviewSignals = collectReviewSignals(recentOrders);
  const cautionLines = buildCautionLines({
    currentOrder: order,
    reviewSignals,
    recentOrders,
  });
  const headline = buildHeadline({
    currentOrder: order,
    recentOrders,
    resultLabels,
    reviewSignals,
  });

  return {
    tone: resolveTone({ reviewSignals, cautionLines }),
    headline: headline.headline,
    summary: headline.summary,
    statBadges: buildStatBadges({
      currentOrder: order,
      recentOrders,
      resultLabels,
      reviewSignals,
    }),
    contextLines: buildContextLines({
      currentOrder: order,
      recentOrders,
      resultLabels,
      reviewSignals,
    }),
    recentChangeLines: buildRecentChangeLines({
      currentOrder: order,
      recentOrders,
      resultLabels,
    }),
    cautionLines,
    nextActionLines: buildNextActionLines({
      currentOrder: order,
      recentOrders,
      resultLabels,
      reviewSignals,
    }),
  };
}
