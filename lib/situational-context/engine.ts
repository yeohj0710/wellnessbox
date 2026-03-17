import { resolveUsageCadence } from "@/lib/cadence-adjustment/engine";
import type { UserContextSummary } from "@/lib/chat/context.types";

type SituationEmphasis =
  | "safety_first"
  | "gentle_start"
  | "routine_first"
  | "recovery"
  | "steady";

type SeasonKey = "spring" | "summer" | "autumn" | "winter";
type DaypartKey = "morning" | "day" | "evening" | "late-night";
type LifestyleKey =
  | "sleep_recovery"
  | "stress_load"
  | "routine_reset"
  | "steady_care"
  | "starter";

export type SituationalContextModel = {
  seasonKey: SeasonKey;
  seasonLabel: string;
  seasonPhrase: string;
  daypartKey: DaypartKey;
  daypartLabel: string;
  lifestyleKey: LifestyleKey;
  lifestyleLabel: string;
  rhythmLabel: string;
  emphasis: SituationEmphasis;
  badgeLabel: string;
  headline: string;
  helper: string;
  chips: string[];
  reasonLines: string[];
};

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

function hasAnyKeyword(items: string[], keywords: string[]) {
  const normalized = items.join(" ").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function getDatePart(now: Date, type: "month" | "hour", timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    [type]: "numeric",
    hourCycle: "h23",
  });
  const part = formatter
    .formatToParts(now)
    .find((entry) => entry.type === type)?.value;
  return Number.parseInt(part ?? "", 10);
}

function resolveSeason(now: Date) {
  const month = getDatePart(now, "month", "Asia/Seoul");

  if ([3, 4].includes(month)) {
    return {
      seasonKey: "spring" as const,
      seasonLabel: "봄",
      seasonPhrase: "환절기",
      reason:
        "환절기에는 컨디션 체감이 흔들리기 쉬워 한 번에 많이 바꾸기보다 반응을 천천히 보는 편이 자연스럽습니다.",
    };
  }

  if ([7, 8].includes(month)) {
    return {
      seasonKey: "summer" as const,
      seasonLabel: "여름",
      seasonPhrase: "더위가 올라오는 때",
      reason:
        "더위가 올라오는 시기에는 체력과 수면 리듬이 같이 흔들리기 쉬워 부담을 낮춘 안내가 더 잘 맞습니다.",
    };
  }

  if ([9, 10].includes(month)) {
    return {
      seasonKey: "autumn" as const,
      seasonLabel: "가을",
      seasonPhrase: "일상 리듬을 다시 잡는 때",
      reason:
        "가을에는 생활 리듬을 다시 정리하려는 흐름이 강해져 복잡한 정보보다 지금 맞는 루틴 설명이 더 잘 읽힙니다.",
    };
  }

  if ([11, 12, 1, 2].includes(month)) {
    return {
      seasonKey: "winter" as const,
      seasonLabel: "겨울",
      seasonPhrase: "건조함과 피로가 쌓이기 쉬운 때",
      reason:
        "건조하고 추운 계절에는 수면과 피로 체감이 같이 올라오기 쉬워 안심과 루틴 정리가 먼저 필요합니다.",
    };
  }

  return {
    seasonKey: "summer" as const,
    seasonLabel: "초여름",
    seasonPhrase: "활동량이 올라오는 때",
    reason:
      "활동량이 다시 올라오는 시기라 무거운 설명보다 지금 바로 이어갈 수 있는 구성과 루틴이 잘 맞습니다.",
  };
}

function resolveDaypart(now: Date) {
  const hour = getDatePart(now, "hour", "Asia/Seoul");

  if (hour >= 5 && hour <= 10) {
    return {
      daypartKey: "morning" as const,
      daypartLabel: "아침",
      reason:
        "아침에는 오늘 바로 실천할 한 가지가 보이는 제안이 가장 가볍게 받아들여집니다.",
    };
  }

  if (hour >= 11 && hour <= 16) {
    return {
      daypartKey: "day" as const,
      daypartLabel: "낮",
      reason:
        "낮에는 비교와 판단 여력이 있어 후보를 좁혀 주는 설명이 결정을 덜 피곤하게 만듭니다.",
    };
  }

  if (hour >= 17 && hour <= 21) {
    return {
      daypartKey: "evening" as const,
      daypartLabel: "저녁",
      reason:
        "저녁에는 하루 피로가 쌓여 복잡한 선택보다 부담을 덜어 주는 구성과 안내가 더 자연스럽습니다.",
    };
  }

  return {
    daypartKey: "late-night" as const,
    daypartLabel: "늦은 밤",
    reason:
      "늦은 밤에는 강한 약속보다 불안을 낮추고 내일 이어갈 한 걸음을 보여주는 흐름이 더 잘 맞습니다.",
  };
}

function resolveLifestyle(summary: UserContextSummary, cadenceLabel: string | null) {
  const inputs = uniqueStrings([
    ...(summary.profile?.goals ?? []),
    ...(summary.profile?.constraints ?? []),
    ...(summary.profile?.conditions ?? []),
    ...(summary.latestAssess?.findings ?? []),
    ...(summary.latestQuick?.findings ?? []),
    ...(summary.healthLink?.highlights ?? []),
    ...(summary.healthLink?.nextSteps ?? []),
  ]);

  const sleepKeywords = [
    "수면",
    "잠",
    "불면",
    "피로",
    "무기력",
    "야근",
    "교대",
    "늦잠",
    "커피",
    "카페인",
  ];
  const stressKeywords = ["스트레스", "불안", "긴장", "예민", "과로", "번아웃"];

  if (hasAnyKeyword(inputs, sleepKeywords)) {
    return {
      lifestyleKey: "sleep_recovery" as const,
      lifestyleLabel: "수면·회복",
      reason:
        "지금 기록은 수면과 회복 쪽 신호가 보여서, 많이 권하는 것보다 생활 리듬과 시작 강도를 맞추는 편이 자연스럽습니다.",
    };
  }

  if (hasAnyKeyword(inputs, stressKeywords)) {
    return {
      lifestyleKey: "stress_load" as const,
      lifestyleLabel: "스트레스 관리",
      reason:
        "지금 상태는 스트레스 부하가 같이 보이므로 강한 설득보다 불안과 결정 피로를 덜어 주는 설명이 더 잘 맞습니다.",
    };
  }

  if (
    cadenceLabel ||
    summary.consultationImpact.stage === "early_exploration" ||
    summary.consultationImpact.stage === "stalled_in_consult"
  ) {
    return {
      lifestyleKey: "routine_reset" as const,
      lifestyleLabel: "리듬 다시 맞추기",
      reason:
        "지금은 새로운 정보를 더 쌓기보다 일상 리듬과 다음 한 걸음을 다시 붙여 주는 편이 반응이 좋습니다.",
    };
  }

  if (summary.recentOrders.length > 0) {
    return {
      lifestyleKey: "steady_care" as const,
      lifestyleLabel: "지속 관리",
      reason:
        "이미 이어온 기록이 있어 새 후보를 늘리기보다 지금 리듬을 더 잘 유지하는 설명이 더 설득력 있습니다.",
    };
  }

  return {
    lifestyleKey: "starter" as const,
    lifestyleLabel: "가볍게 시작",
    reason:
      "아직 맥락이 충분히 쌓이기 전이라 복잡한 추천보다 지금 바로 시작할 수 있는 작은 흐름이 더 잘 맞습니다.",
  };
}

export function resolveSituationalContext(input: {
  summary: UserContextSummary;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const season = resolveSeason(now);
  const daypart = resolveDaypart(now);
  const cadence = resolveUsageCadence({
    orders: input.summary.recentOrders.map((order) => ({
      createdAt: order.orderedAt,
      status: order.status,
    })),
    summary: input.summary,
  });
  const lifestyle = resolveLifestyle(input.summary, cadence?.label ?? null);

  const emphasis: SituationEmphasis =
    input.summary.safetyEscalation.level !== "routine"
      ? "safety_first"
      : cadence?.state === "drifting" || cadence?.state === "paused"
      ? "gentle_start"
      : cadence?.state === "slowing" || cadence?.state === "settling"
      ? "routine_first"
      : lifestyle.lifestyleKey === "sleep_recovery" ||
        lifestyle.lifestyleKey === "stress_load"
      ? "recovery"
      : "steady";

  const headline =
    emphasis === "safety_first"
      ? `${season.seasonPhrase} ${daypart.daypartLabel}에는 추천을 늘리기보다 안전 확인을 먼저 붙이는 편이 맞습니다.`
      : emphasis === "gentle_start"
      ? `${season.seasonPhrase} 흐름이라 예전 강도를 반복하기보다 가볍게 다시 붙는 제안이 더 자연스럽습니다.`
      : emphasis === "routine_first"
      ? `${daypart.daypartLabel} 리듬에는 더 많이 권하기보다 복용 루틴과 다음 한 걸음을 정리해 주는 편이 잘 맞습니다.`
      : emphasis === "recovery"
      ? `${lifestyle.lifestyleLabel} 맥락이 보여 지금은 후보를 늘리기보다 회복 감각을 먼저 만드는 설명이 설득력 있습니다.`
      : `${season.seasonPhrase}와 ${daypart.daypartLabel} 흐름에 맞춰 지금 바로 이어갈 수 있는 구성이 더 자연스럽습니다.`;

  const helper =
    cadence?.state && cadence.state !== "steady"
      ? `${cadence.label} 그래서 정해진 주기를 그대로 밀기보다 지금 리듬에 맞춘 속도 조절이 필요합니다.`
      : `${season.seasonLabel} ${daypart.daypartLabel}에는 ${lifestyle.lifestyleLabel} 중심으로 읽히는 제안이 “지금의 나한테 맞다”는 느낌을 만들기 쉽습니다.`;

  return {
    seasonKey: season.seasonKey,
    seasonLabel: season.seasonLabel,
    seasonPhrase: season.seasonPhrase,
    daypartKey: daypart.daypartKey,
    daypartLabel: daypart.daypartLabel,
    lifestyleKey: lifestyle.lifestyleKey,
    lifestyleLabel: lifestyle.lifestyleLabel,
    rhythmLabel: cadence?.label ?? "아직 리듬을 읽는 중",
    emphasis,
    badgeLabel: "지금 상황 기준",
    headline,
    helper,
    chips: uniqueStrings(
      [
        season.seasonLabel,
        daypart.daypartLabel,
        lifestyle.lifestyleLabel,
        cadence?.state && cadence.state !== "steady" ? cadence.label : "",
      ],
      4
    ),
    reasonLines: uniqueStrings(
      [
        season.reason,
        daypart.reason,
        cadence?.helper ?? "",
        lifestyle.reason,
      ],
      3
    ),
  } satisfies SituationalContextModel;
}
