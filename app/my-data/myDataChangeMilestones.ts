import { normalizeAssessmentResult, normalizeCheckAiResult } from "@/lib/server/result-normalizer";
import type { MyDataCollections } from "./myDataPageData";

type MilestoneTone = "neutral" | "good" | "warn";

type MilestoneCard = {
  label: string;
  title: string;
  body: string;
  tone: MilestoneTone;
};

export type MyDataChangeMilestonesModel = {
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  badges: string[];
  cards: MilestoneCard[];
  patternLines: string[];
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

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

function getAssessLabels(result: MyDataCollections["assessResults"][number] | null | undefined) {
  if (!result) return [];
  return normalizeAssessmentResult(result).topLabels;
}

function getCheckLabels(result: MyDataCollections["checkAiResults"][number] | null | undefined) {
  if (!result) return [];
  return normalizeCheckAiResult(result).topLabels;
}

function getOrderThemes(order: MyDataCollections["orders"][number] | null | undefined) {
  if (!order) return [];

  return uniqueStrings(
    order.orderItems
      .map((item) => item.pharmacyProduct?.product?.name?.trim() || "")
      .filter(Boolean),
    4
  );
}

function getRecentActivityCount(input: {
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;

  const dates = [
    ...input.assessResults.slice(0, 3).map((item) => toDate(item.createdAt)),
    ...input.checkAiResults.slice(0, 3).map((item) => toDate(item.createdAt)),
    ...input.orders.slice(0, 3).map((item) => toDate(item.createdAt)),
    ...input.chatSessions.slice(0, 3).map((item) => toDate(item.updatedAt)),
    toDate(input.healthLink?.fetchedAt ?? null),
  ].filter((value): value is Date => value !== null);

  return dates.filter((date) => now - date.getTime() <= windowMs).length;
}

function buildDraftHref(from: string, prompt: string) {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("draft", prompt);
  return `/chat?${params.toString()}`;
}

export function buildMyDataChangeMilestonesModel(input: {
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}): MyDataChangeMilestonesModel | null {
  const latestAssess = input.assessResults[0] ?? null;
  const previousAssess = input.assessResults[1] ?? null;
  const latestCheck = input.checkAiResults[0] ?? null;
  const previousCheck = input.checkAiResults[1] ?? null;
  const latestOrder = input.orders[0] ?? null;
  const latestChat = input.chatSessions[0] ?? null;
  const healthLink = input.healthLink;

  const latestAssessLabels = getAssessLabels(latestAssess);
  const previousAssessLabels = getAssessLabels(previousAssess);
  const latestCheckLabels = getCheckLabels(latestCheck);
  const previousCheckLabels = getCheckLabels(previousCheck);
  const latestOrderThemes = getOrderThemes(latestOrder);
  const repeatedFocus = uniqueStrings(
    [...latestAssessLabels, ...latestCheckLabels].filter((label) =>
      [...previousAssessLabels, ...previousCheckLabels, ...latestOrderThemes].includes(label)
    ),
    2
  );
  const newFocus = uniqueStrings(
    [...latestAssessLabels, ...latestCheckLabels].filter(
      (label) =>
        !previousAssessLabels.includes(label) &&
        !previousCheckLabels.includes(label)
    ),
    2
  );

  const latestResultDate = [latestAssess?.createdAt, latestCheck?.createdAt]
    .map((value) => toDate(value ?? null))
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
  const latestOrderDate = toDate(latestOrder?.createdAt ?? null);
  const latestChatDate = toDate(latestChat?.updatedAt ?? null);
  const latestHealthLinkDate = toDate(healthLink?.fetchedAt ?? null);
  const recentActivityCount = getRecentActivityCount(input);
  const orderCount = input.orders.length;
  const chatCount = input.chatSessions.length;

  const cards: MilestoneCard[] = [];

  if (
    latestOrderDate &&
    latestResultDate &&
    latestOrderDate.getTime() >= latestResultDate.getTime()
  ) {
    cards.push({
      label: "실행 전환",
      title: "해석 단계에서 실제 실행 단계로 넘어왔어요.",
      body:
        orderCount > 0
          ? "최근 검사나 상담 뒤에 주문까지 이어졌어요. 기록이 쌓이기만 한 상태에서 한 단계 더 나아간 변화라, 지금은 체감과 유지 리듬을 읽는 쪽이 더 중요해요."
          : "최근 해석 흐름이 실제 실행으로 연결되기 시작했어요.",
      tone: "good",
    });
  }

  if (repeatedFocus.length > 0) {
    cards.push({
      label: "반복 패턴",
      title: `${repeatedFocus.join(", ")} 축이 여러 기록에서 반복돼요.`,
      body:
        "한 번 우연히 나온 신호보다, 검사·주문·상담에서 비슷한 축이 계속 보이는 편이 지금 내 흐름을 더 또렷하게 보여줘요. 그래서 지금은 새로운 축을 넓히기보다 이 축의 체감과 유지 여부를 보는 편이 좋아요.",
      tone: "neutral",
    });
  } else if (newFocus.length > 0) {
    cards.push({
      label: "변화 신호",
      title: `최근에는 ${newFocus.join(", ")} 쪽이 새로 눈에 들어오고 있어요.`,
      body:
        "예전 기록과 완전히 같기보다, 최근 고민 축이 조금 이동하고 있다는 뜻에 가까워요. 큰 결론보다 지금 달라진 생활 패턴이나 목표를 한 번 짚어보면 다음 선택이 쉬워져요.",
      tone: "warn",
    });
  }

  if (orderCount >= 2) {
    cards.push({
      label: "이용 마일스톤",
      title: `주문이 ${orderCount}회 누적돼 내 리듬을 읽을 재료가 생겼어요.`,
      body:
        "한 번의 반응보다 반복 기록이 붙기 시작하면, 무엇이 맞는지뿐 아니라 어떤 속도로 이어지는지가 보여요. 지금은 더 많이 사기보다 유지 패턴과 조정 포인트를 보는 구간에 가까워요.",
      tone: "good",
    });
  } else if (chatCount >= 2) {
    cards.push({
      label: "상담 마일스톤",
      title: `상담이 ${chatCount}회 누적돼 같은 질문을 다시 줄일 수 있게 됐어요.`,
      body:
        "상담이 한 번으로 끝나지 않고 이어졌다는 건, 내 기준과 고민이 조금씩 선명해지고 있다는 뜻이에요. 그래서 지금은 새 설명을 더 듣기보다, 지금까지 쌓인 질문을 좁히는 편이 좋아요.",
      tone: "neutral",
    });
  }

  if (latestHealthLinkDate) {
    const staleDays = daysSince(latestHealthLinkDate);
    cards.push({
      label: "데이터 확장",
      title:
        staleDays != null && staleDays <= 30
          ? "건강링크 데이터가 붙어 기록 해석 폭이 넓어졌어요."
          : "건강링크 기록까지 연결돼 비교할 축이 늘어났어요.",
      body:
        "주문·검사·상담만 보던 흐름에서 건강링크까지 같이 읽히면, 지금 변화가 생활 리듬인지 기록 부족인지 구분하기가 훨씬 쉬워져요.",
      tone: staleDays != null && staleDays <= 30 ? "good" : "neutral",
    });
  }

  if (cards.length === 0 && recentActivityCount === 0) return null;

  const badges = uniqueStrings(
    [
      recentActivityCount > 0 ? `최근 30일 활동 ${recentActivityCount}건` : "",
      orderCount > 0 ? `주문 ${orderCount}회` : "",
      chatCount > 0 ? `상담 ${chatCount}회` : "",
      latestHealthLinkDate ? "건강링크 연결" : "",
    ],
    4
  );

  const patternLines = uniqueStrings(
    [
      latestOrderDate && latestChatDate && latestChatDate.getTime() >= latestOrderDate.getTime()
        ? "주문 뒤에도 상담이 이어지고 있어, 한 번 사고 끝나는 흐름보다 유지·조정 쪽 동기가 더 살아 있어요."
        : "",
      recentActivityCount >= 3
        ? "최근 30일 안에 여러 기록이 겹쳐 들어와서 지금은 예전보다 변화 해석 정확도가 더 좋아졌어요."
        : "",
      latestHealthLinkDate && daysSince(latestHealthLinkDate) != null && (daysSince(latestHealthLinkDate) as number) > 45
        ? "건강링크는 연결돼 있지만 조금 오래돼서, 최신 변화 판단은 최근 주문·검사·상담 흐름을 더 우선해서 보는 편이 좋아요."
        : "",
      latestOrderThemes.length > 0
        ? `최근 주문도 ${latestOrderThemes.join(", ")} 축과 이어져 있어, 지금은 이 목적을 중심으로 유지 여부를 보는 편이 자연스러워요.`
        : "",
    ],
    4
  );

  const title =
    cards[0]?.tone === "good"
      ? "지금 기록을 보면, 그냥 쌓인 게 아니라 실제로 한 단계 움직인 지점이 보여요."
      : "최근 기록을 같이 놓고 보면, 지금 달라진 점이 조금 더 또렷하게 보여요.";

  const description =
    recentActivityCount >= 3
      ? "주문, 검사, 상담, 건강링크가 따로 보일 때는 변화가 잘 안 느껴지지만, 같이 묶어 보면 ‘실행으로 넘어온 변화’, ‘반복되는 축’, ‘지금 다시 확인할 시점’이 보이기 시작해요."
      : "큰 변화가 아니어도 기록을 같이 보면 지금 달라진 축과 다음 마일스톤이 보여요. 과장된 체감보다 이런 작은 이동이 지속 동기를 더 오래 지켜줘요.";

  const primaryPrompt =
    repeatedFocus.length > 0
      ? `${repeatedFocus.join(", ")} 축이 여러 기록에서 반복되는데, 지금까지 쌓인 주문·검사·상담 기준으로 어떤 점이 실제로 달라졌는지와 다음에 무엇을 보면 좋을지 짧게 정리해줘.`
      : "최근 주문·검사·상담 기록을 같이 보고, 지금 달라진 점 2가지와 다음 마일스톤 1가지만 과장 없이 정리해줘.";

  return {
    badgeLabel: "변화 감지",
    title,
    description,
    helper:
      "‘많이 좋아졌다’ 같은 큰 말보다, 지금 어떤 축이 반복되고 어떤 행동이 붙었는지 보이기 시작하면 재방문 이유가 더 또렷해져요.",
    badges,
    cards: cards.slice(0, 3),
    patternLines,
    primaryAction: {
      href: buildDraftHref("/my-data", primaryPrompt),
      label: "지금 변화 짧게 정리받기",
    },
    secondaryAction:
      orderCount > 0
        ? {
            href: "/my-orders",
            label: "최근 주문 흐름 다시 보기",
          }
        : {
            href: "/chat?from=my-data-change-milestones",
            label: "상담으로 이어가기",
          },
  };
}
