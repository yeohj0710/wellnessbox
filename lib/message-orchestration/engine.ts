import {
  buildUserCapabilitySignals,
  shouldPrioritizeConsultation,
} from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";
import { resolveAdherenceLoopAction } from "@/lib/adherence-loop/engine";
import { resolveUsageCadence } from "@/lib/cadence-adjustment/engine";
import { resolveNextBestAction } from "@/lib/next-best-action/engine";
import { resolveSmartRefillAction } from "@/lib/refill-timing/engine";

export type MyDataMessagePriority =
  | "quality"
  | "adherence"
  | "refill"
  | "consult"
  | "next_best"
  | "quiet";

export type MyDataVisibleMessageCards = {
  adherence: boolean;
  refill: boolean;
  nextBest: boolean;
};

export type MyDataMessageOrchestrationModel = {
  priority: MyDataMessagePriority;
  title: string;
  description: string;
  helper: string;
  cadenceLabel: string;
  cadenceHelper: string;
  reasonLines: string[];
  mutedLines: string[];
  visibleCards: MyDataVisibleMessageCards;
};

export type OrderCompleteNotificationPrimaryAction =
  | "open_modal"
  | "enable_now"
  | null;

export type OrderCompleteNotificationPlan = {
  mode: "modal" | "inline";
  tone: "sky" | "slate";
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  mutedLines: string[];
  primaryAction: OrderCompleteNotificationPrimaryAction;
  ctaLabel: string | null;
};

function hasCriticalDataIssue(issueIds: string[]) {
  return issueIds.some((issueId) =>
    [
      "profile-core-missing",
      "profile-medications-missing",
      "health-link-stale",
      "results-stale",
    ].includes(issueId)
  );
}

export function resolveMyDataMessageOrchestration(input: {
  summary: UserContextSummary;
  orders: unknown[] | null | undefined;
  dataQualityIssueIds?: string[];
}): MyDataMessageOrchestrationModel {
  const signals = buildUserCapabilitySignals(input.summary);
  const issueIds = input.dataQualityIssueIds ?? [];
  const criticalDataIssue = hasCriticalDataIssue(issueIds);
  const cadence =
    resolveUsageCadence({
      orders: input.orders,
      summary: input.summary,
    }) ?? null;
  const adherenceAction = resolveAdherenceLoopAction({
    surface: "my-data",
    orders: input.orders,
    summary: input.summary,
  });
  const refillAction = resolveSmartRefillAction({
    surface: "my-data",
    orders: input.orders,
    summary: input.summary,
  });
  const nextBestAction = resolveNextBestAction({
    surface: "my-data",
    summary: input.summary,
  });
  const recentOrderDays = signals.recentOrderDays;
  const consultFirst = shouldPrioritizeConsultation(signals, 21);

  const cadenceLabel = cadence?.label ?? "지금 cadence를 읽는 중이에요";
  const cadenceHelper =
    cadence?.headline ??
    "주기만 고정하지 않고 최근 주문 간격과 상담 흐름을 함께 읽어 메시지 강도를 맞추고 있어요.";

  if (criticalDataIssue && !adherenceAction) {
    return {
      priority: "quality",
      title: "지금은 새 메시지보다 기록 정리가 먼저예요",
      description:
        "프로필이나 건강 데이터가 비어 있거나 오래된 상태라서, 추천·리필·후속 안내를 늘리기보다 먼저 기록 품질을 맞추는 편이 전체 경험을 더 크게 올려줘요.",
      helper:
        "한 번만 정리해 두면 이후 탐색, 상담, 리필 timing도 훨씬 덜 어긋나게 맞춰져요.",
      cadenceLabel,
      cadenceHelper,
      reasonLines: [
        "입력이 비어 있거나 오래되면 같은 알림도 지금 상황과 어긋날 가능성이 커져요.",
        "지금은 더 많이 보내기보다 기록을 정확히 맞추는 쪽이 반응과 만족에 더 유리해요.",
      ],
      mutedLines: [
        nextBestAction
          ? "다음 행동 추천은 기록 정리가 끝날 때까지 잠시 약하게 두고 있어요."
          : "추가 구매 유도는 지금 우선순위가 아니에요.",
        refillAction
          ? "리필 신호가 보여도 먼저 현재 기록과 맞는지 확인하는 편이 더 안전해요."
          : "리필 메시지도 지금은 보수적으로 줄이고 있어요.",
      ],
      visibleCards: {
        adherence: false,
        refill: false,
        nextBest: false,
      },
    };
  }

  if (
    adherenceAction &&
    recentOrderDays <= 21 &&
    cadence?.state !== "drifting" &&
    cadence?.state !== "paused"
  ) {
    return {
      priority: "adherence",
      title: "지금은 복용 루프 1개만 붙이고 다른 메시지는 줄여두는 편이 좋아요",
      description:
        "최근 주문 직후에는 리필이나 재구매보다 복용 루틴과 체감 체크를 붙여 주는 한 가지 행동이 훨씬 중요해요.",
      helper:
        "초반 1~3주에는 메시지를 많이 보내기보다 복용 시간과 체감 체크를 고정하는 쪽이 장기 유지에 더 좋아요.",
      cadenceLabel,
      cadenceHelper,
      reasonLines: [
        `최근 주문 후 ${recentOrderDays}일차라 지금은 복용 습관을 붙이는 구간으로 읽히고 있어요.`,
        adherenceAction.reasonLines[0] ||
          "지금 단계에서는 다음 구매보다 현재 루틴을 안정시키는 쪽이 더 중요해요.",
      ],
      mutedLines: [
        refillAction
          ? "리필 신호는 아직 이르거나 지금 cadence에 맞지 않아 잠시 낮춰 두었어요."
          : "재구매 메시지는 아직 바로 올릴 시점이 아니에요.",
        nextBestAction
          ? "다음 행동 추천도 복용 루프가 조금 굳은 뒤 더 강하게 보여줄게요."
          : "추가 탐색 권유는 지금은 한 템포 쉬고 있어요.",
      ],
      visibleCards: {
        adherence: true,
        refill: false,
        nextBest: false,
      },
    };
  }

  if ((consultFirst || cadence?.state === "paused") && nextBestAction) {
    return {
      priority: "consult",
      title: "지금은 구매 유도보다 확인 메시지 1개가 먼저예요",
      description:
        "복용약, 건강링크 위험도, 최근 상담 맥락을 보면 리필이나 새 제안보다 약사 확인과 추가 정보 정리가 우선인 구간이에요.",
      helper:
        "이 단계에서는 설명을 많이 붙이는 것보다 확인이 필요한 포인트를 짧게 좁혀 주는 편이 더 안전하고 반응도 좋아요.",
      cadenceLabel,
      cadenceHelper,
      reasonLines: [
        input.summary.explainability.pharmacistReviewPoints[0] ||
          "약사 확인이 먼저 필요한 신호가 있어요.",
        cadence?.state === "paused"
          ? "최근 상담을 기준으로 cadence를 다시 맞추는 중이라 리필 강도를 잠시 낮췄어요."
          : "리필이나 구매 메시지를 겹쳐 보내지 않는 편이 지금은 더 자연스러워요.",
      ],
      mutedLines: [
        refillAction
          ? "리필 메시지는 약사 확인이 끝날 때까지 잠시 조용히 둘게요."
          : "재구매 유도는 지금 우선순위가 아니에요.",
        "복용 루프와 탐색 유도도 지금 단계에서는 한 단계 뒤로 밀어 두었어요.",
      ],
      visibleCards: {
        adherence: false,
        refill: false,
        nextBest: true,
      },
    };
  }

  if (refillAction && cadence?.state !== "settling" && cadence?.state !== "paused") {
    return {
      priority: "refill",
      title:
        cadence?.state === "slowing"
          ? "지금은 리필 신호를 보이되 예전보다 조금 늦춘 cadence로 읽고 있어요"
          : cadence?.state === "drifting"
          ? "같은 주기 반복보다 재시작 성격의 리필 제안을 먼저 보여줄게요"
          : "지금은 리필 신호 하나만 남기고 다른 메시지는 줄여두는 편이 좋아요",
      description:
        cadence?.state === "slowing"
          ? "사용 속도가 예전보다 조금 늦어 보여서 리필은 완전히 끄지 않고, 강도만 낮춘 채 조금 뒤로 미뤄 읽고 있어요."
          : cadence?.state === "drifting"
          ? "간격이 흔들리는 패턴이라 예전 cadence 그대로 반복시키기보다 7일치 재시작이나 탐색 재진입을 우선으로 잡고 있어요."
          : "재구매 시점이 가까워지면 복용 루프, 탐색, 다른 CTA보다 다시 담기나 조정 상담 한 가지가 더 잘 먹히는 구간이에요.",
      helper:
        "필요한 순간에만 리필 신호를 띄우고, 나머지 메시지는 조용히 줄여 피로도를 낮추고 있어요.",
      cadenceLabel,
      cadenceHelper,
      reasonLines: [
        refillAction.reasonLines[0] ||
          "최근 주문 간격과 구성 기준으로 보면 지금이 가장 자연스럽게 리필로 이어질 구간이에요.",
        cadence?.reasonLines[2] ||
          refillAction.reasonLines[1] ||
          "같은 리필이라도 지금 cadence에 맞는 강도로 조정해 두었어요.",
      ],
      mutedLines: [
        "복용 루프 카드는 이번 구간에서는 한 단계 뒤로 미뤄 두고 있어요.",
        nextBestAction
          ? "탐색/상담 유도는 리필 신호보다 더 약하게 두고 있어요."
          : "추가 탐색 유도도 지금은 줄여 두고 있어요.",
      ],
      visibleCards: {
        adherence: false,
        refill: true,
        nextBest: false,
      },
    };
  }

  if (nextBestAction) {
    return {
      priority: "next_best",
      title: "지금은 다음 행동 1개만 보여줘도 충분한 구간이에요",
      description:
        "최근 기록 기준으로 반응 가능성이 가장 높은 다음 행동만 먼저 보여 주고, 나머지 메시지는 과하지 않게 비워 두고 있어요.",
      helper:
        "모든 메시지를 한 번에 올리기보다 지금 사용자에게 맞는 한 단계만 먼저 띄우는 편이 더 잘 움직여요.",
      cadenceLabel,
      cadenceHelper,
      reasonLines: [
        nextBestAction.reasonLines[0] ||
          "지금 맥락에서 가장 자연스러운 다음 행동을 하나로 좁혀 두었어요.",
        cadence?.reasonLines[1] ||
          "리필이나 복용 루프를 강하게 밀 시점은 아니라서 단일 CTA가 더 잘 맞아요.",
      ],
      mutedLines: [
        "복용 루프 메시지는 지금 단계에서 과하게 보이지 않도록 눌러 두었어요.",
        "리필 신호도 아직 바로 반응할 시점은 아니라서 잠시 낮춰 두고 있어요.",
      ],
      visibleCards: {
        adherence: false,
        refill: false,
        nextBest: true,
      },
    };
  }

  return {
    priority: "quiet",
    title: "지금은 메시지를 더 얹지 않고 조용히 두는 편이 좋아요",
    description:
      "지금 당장 강하게 밀어야 할 복용, 리필, 상담 신호가 뚜렷하지 않아 추가 메시지를 늘리지 않고 있어요.",
    helper:
      "다음 기록이 쌓이거나 주문 간격이 바뀌면 그때 필요한 메시지 하나만 다시 올릴게요.",
    cadenceLabel,
    cadenceHelper,
    reasonLines: [
      "알림과 유도는 많을수록 좋은 것이 아니라 지금 시점과 맞아야 반응이 올라가요.",
      "현재는 휴식 구간으로 보고 노출을 과하게 늘리지 않고 있어요.",
    ],
    mutedLines: [
      "복용 루프, 리필, 탐색 유도는 모두 잠시 조용히 두고 있어요.",
    ],
    visibleCards: {
      adherence: false,
      refill: false,
      nextBest: false,
    },
  };
}

export function resolveOrderCompleteNotificationPlan(input: {
  itemCount: number;
  hasRequestNotes: boolean;
  hasEntranceDetails: boolean;
  browserSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  optedOut: boolean;
  recentlyPrompted: boolean;
}): OrderCompleteNotificationPlan {
  const highValueUpdateNeed =
    input.itemCount > 1 || input.hasRequestNotes || input.hasEntranceDetails;

  if (!input.browserSupported || input.notificationPermission === "unsupported") {
    return {
      mode: "inline",
      tone: "slate",
      title: "이 기기에서는 주문 알림을 바로 연결할 수 없어요",
      description:
        "브라우저 알림을 바로 켜기 어려운 환경이라 추가 허용 요청은 멈추고, 주문조회 진입과 문자 확인 경로를 중심으로 안내할게요.",
      helper:
        "알림을 켤 수 없는 환경에서는 반복 팝업보다 주문조회 진입 버튼을 남기는 편이 더 자연스러워요.",
      reasonLines: [
        "지원되지 않는 환경에서 알림을 계속 요청하면 피로도만 올라갈 수 있어요.",
      ],
      mutedLines: ["이번 주문에는 브라우저 알림 요청을 생략했어요."],
      primaryAction: null,
      ctaLabel: null,
    };
  }

  if (input.notificationPermission === "denied") {
    return {
      mode: "inline",
      tone: "slate",
      title: "알림 권한이 꺼져 있어 이번 주문은 조용히 진행할게요",
      description:
        "권한이 거부된 상태라 지금 다시 강하게 묻지 않고, 주문조회와 문자 확인 흐름을 먼저 두는 편이 더 자연스러워요.",
      helper:
        "권한이 꺼진 상태에서 같은 요청을 반복하면 반응보다 피로도만 더 커질 수 있어요.",
      reasonLines: [
        "이미 알림 권한이 꺼져 있으면 반복 요청은 신뢰를 깎기 쉬워요.",
      ],
      mutedLines: ["임시 허용 팝업은 이번 주문에서 다시 띄우지 않을게요."],
      primaryAction: null,
      ctaLabel: null,
    };
  }

  if (input.optedOut) {
    return {
      mode: "inline",
      tone: "slate",
      title: "이번 주문은 알림을 쉬고, 필요할 때만 다시 켤 수 있게 둘게요",
      description:
        "이전 선택을 존중해서 자동 팝업은 띄우지 않아요. 꼭 필요할 때만 다시 켜는 버튼만 남겨둘게요.",
      helper:
        "명시적으로 꺼 둔 사용자를 다시 세게 붙잡지 않는 쪽이 장기 반응에 더 좋아요.",
      reasonLines: [
        "직전 거부 직후 곧바로 다시 권유하면 피로도만 높아질 수 있어요.",
      ],
      mutedLines: ["자동 알림 권유는 생략하고 수동 설정만 남겨 두었어요."],
      primaryAction: "enable_now",
      ctaLabel: "필요할 때만 다시 켜기",
    };
  }

  if (input.notificationPermission === "granted") {
    return {
      mode: "inline",
      tone: "sky",
      title: "권한은 이미 있어요. 필요한 주문 알림만 바로 연결할게요",
      description:
        "권한 요청 팝업은 다시 띄우지 않고, 원하면 이 주문의 배송·상담 알림만 바로 연결할 수 있게 둘게요.",
      helper:
        "이미 권한이 있는 상태에서는 다시 묻기보다 즉시 연결 버튼만 주는 편이 더 간단해요.",
      reasonLines: [
        "같은 권한 팝업을 반복할 필요 없이 주문 단위 연결만 남기면 충분해요.",
      ],
      mutedLines: ["권한 요청 모달은 다시 띄우지 않아요."],
      primaryAction: "enable_now",
      ctaLabel: "이 주문 알림 켜기",
    };
  }

  if (input.recentlyPrompted && !highValueUpdateNeed) {
    return {
      mode: "inline",
      tone: "slate",
      title: "최근에도 알림을 물어봐서 이번에는 조용한 안내만 둘게요",
      description:
        "짧은 기간 안에 같은 허용 요청을 반복하면 피로도가 커질 수 있어, 이번 주문은 인라인 안내만 남겨둘게요.",
      helper:
        "필요하면 직접 켤 수 있지만 자동 팝업은 잠시 쉬는 편이 반응이 더 안정적이에요.",
      reasonLines: [
        "가치가 아주 크지 않은 주문에서 같은 허용 요청을 자주 띄우면 거부 전환이 더 쉬워져요.",
      ],
      mutedLines: ["자동 팝업은 이번 주문에서 생략했어요."],
      primaryAction: "open_modal",
      ctaLabel: "원하면 지금 켜기",
    };
  }

  if (highValueUpdateNeed) {
    return {
      mode: "modal",
      tone: "sky",
      title: "이번 주문은 상태 변화 가치가 커서 알림 여부를 먼저 물어볼게요",
      description:
        "상품 수가 많거나 요청사항·출입 정보가 있으면 배송과 상담 업데이트를 놓치지 않는 가치가 더 커져요.",
      helper:
        "이 경우에는 허용 여부를 바로 묻는 편이 사용자에게도 실제 이득이 더 분명해요.",
      reasonLines: [
        input.itemCount > 1
          ? `이번 주문은 ${input.itemCount}개 상품이 함께 들어 있어 상태 변화 알림 가치가 커요.`
          : "이번 주문은 진행 상태 알림 가치가 큰 편이에요.",
        input.hasRequestNotes || input.hasEntranceDetails
          ? "요청사항이나 출입 정보가 있어 진행 안내를 놓치지 않는 쪽이 좋아요."
          : "배송/상담 업데이트를 바로 받는 편이 더 자연스러운 주문이에요.",
      ],
      mutedLines: ["이번에는 인라인 안내 대신 한 번만 먼저 물어볼게요."],
      primaryAction: "open_modal",
      ctaLabel: "배송 알림 받을지 정하기",
    };
  }

  return {
    mode: "inline",
    tone: "slate",
    title: "이번 주문은 알림을 세게 묻지 않고 부드럽게 둘게요",
    description:
      "기본 주문조회 흐름만으로도 충분히 따라갈 수 있는 주문이라, 완료 직후 팝업보다 필요할 때 켜는 인라인 안내로 두는 편이 더 자연스러워요.",
    helper:
      "노출량을 늘리기보다 정말 필요할 때만 알림을 켜게 하는 편이 장기 반응에 더 좋아요.",
    reasonLines: [
      "지금 주문은 알림을 꼭 즉시 켜야 하는 복잡도가 높지 않아요.",
    ],
    mutedLines: ["자동 알림 팝업은 생략하고 선택형 안내만 남겼어요."],
    primaryAction: "open_modal",
    ctaLabel: "필요하면 알림 켜기",
  };
}
