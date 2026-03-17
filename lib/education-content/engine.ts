import type { UserContextSummary } from "@/lib/chat/context.types";
import {
  resolveSituationalContext,
  type SituationalContextModel,
} from "@/lib/situational-context/engine";

export type EducationSurface = "explore" | "my-data";

export type EducationColumnCandidate = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
};

export type PersonalizedEducationItem = {
  slug: string;
  title: string;
  summary: string;
  readingMinutes: number;
  tags: string[];
  whyLabel: string;
};

export type PersonalizedEducationInsight = {
  tone: "slate" | "sky" | "emerald" | "amber";
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  chips: string[];
  situationContext: SituationalContextModel;
  primaryItem: PersonalizedEducationItem;
  secondaryItems: PersonalizedEducationItem[];
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

type ThemeKey =
  | "safety"
  | "routine"
  | "energy"
  | "bloodSugar"
  | "women"
  | "starter";

type ThemeSignal = {
  key: ThemeKey;
  label: string;
  tone: PersonalizedEducationInsight["tone"];
  score: number;
  keywords: string[];
  fallbackSlugs: string[];
  reasons: string[];
};

type RankedColumn = {
  column: EducationColumnCandidate;
  score: number;
  whyLabel: string;
};

function getSituationalSignalBoost(
  themeKey: ThemeKey,
  situationContext: SituationalContextModel
) {
  if (situationContext.emphasis === "safety_first" && themeKey === "safety") {
    return 4;
  }

  if (
    situationContext.emphasis === "gentle_start" &&
    (themeKey === "routine" || themeKey === "starter")
  ) {
    return 3;
  }

  if (
    situationContext.emphasis === "routine_first" &&
    themeKey === "routine"
  ) {
    return 3;
  }

  if (
    situationContext.emphasis === "recovery" &&
    (themeKey === "energy" || themeKey === "routine")
  ) {
    return 2;
  }

  if (
    situationContext.lifestyleKey === "sleep_recovery" &&
    themeKey === "energy"
  ) {
    return 2;
  }

  return 0;
}

function getSituationalSignalReason(
  themeKey: ThemeKey,
  situationContext: SituationalContextModel
) {
  if (themeKey === "safety" && situationContext.emphasis === "safety_first") {
    return `${situationContext.seasonPhrase} ${situationContext.daypartLabel}에는 성분 비교보다 안전 설명이 먼저 납득되기 쉽습니다.`;
  }

  if (themeKey === "routine" && situationContext.emphasis !== "safety_first") {
    return `${situationContext.daypartLabel} 리듬에는 복용 루틴과 시작 강도를 정리해 주는 글이 더 실용적으로 읽힙니다.`;
  }

  if (themeKey === "energy" && situationContext.lifestyleKey === "sleep_recovery") {
    return `${situationContext.seasonPhrase} 흐름과 수면·회복 맥락이 겹쳐 생활 리듬 설명이 특히 잘 맞습니다.`;
  }

  if (themeKey === "starter" && situationContext.emphasis === "gentle_start") {
    return "지금은 많이 아는 것보다 부담 없이 다시 붙을 수 있는 기본 가이드가 더 도움이 됩니다.";
  }

  return "";
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsKeyword(text: string, keyword: string) {
  if (!keyword) return false;
  return text.includes(normalizeText(keyword));
}

function countKeywordMatches(text: string, keywords: string[]) {
  return uniqueStrings(keywords)
    .map((keyword) => normalizeText(keyword))
    .filter((keyword) => keyword && text.includes(keyword)).length;
}

function buildSummaryText(summary: UserContextSummary) {
  return normalizeText(
    [
      summary.profile?.sexAge ?? "",
      ...(summary.profile?.goals ?? []),
      ...(summary.profile?.constraints ?? []),
      ...(summary.profile?.conditions ?? []),
      ...(summary.profile?.medications ?? []),
      ...(summary.recentOrders.flatMap((order) => order.items) ?? []),
      ...(summary.latestAssess?.findings ?? []),
      ...(summary.latestQuick?.findings ?? []),
      ...(summary.healthLink?.headline ? [summary.healthLink.headline] : []),
      ...(summary.healthLink?.summary ? [summary.healthLink.summary] : []),
      ...(summary.healthLink?.highlights ?? []),
      ...(summary.healthLink?.nextSteps ?? []),
      ...(summary.healthLink?.topMedicines ?? []),
      ...(summary.healthLink?.topConditions ?? []),
      ...(summary.recommendedNutrients ?? []),
      ...summary.previousConsultations.flatMap((session) => [
        session.title,
        session.userPoint,
        session.assistantPoint,
      ]),
    ].join(" ")
  );
}

function buildEntityKeywords(summary: UserContextSummary) {
  return uniqueStrings(
    [
      ...(summary.recommendedNutrients ?? []),
      ...(summary.recentOrders.flatMap((order) => order.items) ?? []),
      ...(summary.healthLink?.topMedicines ?? []),
      ...(summary.healthLink?.topConditions ?? []),
      ...(summary.profile?.medications ?? []),
      ...(summary.profile?.conditions ?? []),
      ...(summary.latestAssess?.findings ?? []),
      ...(summary.latestQuick?.findings ?? []),
    ],
    12
  );
}

function buildThemeSignals(summary: UserContextSummary): ThemeSignal[] {
  const text = buildSummaryText(summary);
  const signals: ThemeSignal[] = [];

  const hasMedicationContext =
    (summary.profile?.medications.length ?? 0) > 0 ||
    (summary.healthLink?.topMedicines.length ?? 0) > 0 ||
    summary.safetyEscalation.level !== "routine" ||
    containsKeyword(text, "복약") ||
    containsKeyword(text, "약") ||
    containsKeyword(text, "상호작용");

  if (hasMedicationContext) {
    signals.push({
      key: "safety",
      label: "복약 안전",
      tone: "amber",
      score:
        5 +
        (summary.profile?.medications.length ?? 0) +
        (summary.healthLink?.topMedicines.length ?? 0) +
        (summary.safetyEscalation.level === "escalate" ? 3 : 0),
      keywords: [
        "복약",
        "약",
        "상호작용",
        "자몽",
        "커피",
        "항생제",
        "피임약",
        "안약",
        "약사",
      ],
      fallbackSlugs: [
        "grapefruit-can-flip-your-medication",
        "food-can-change-medication-results",
        "pharmacists-dont-give-these-supplements-easily",
      ],
      reasons: uniqueStrings(
        [
          summary.profile?.medications.length
            ? "복용약 기록이 있어 상품 비교보다 상호작용과 복약 안전 설명을 먼저 보는 편이 좋아요."
            : "",
          summary.healthLink?.topMedicines.length
            ? "건강링크 약물 이력이 있어 음식·약 상호작용 글이 실제 판단에 도움이 될 수 있어요."
            : "",
          summary.safetyEscalation.level !== "routine"
            ? "주의 신호가 있어 성분 추천보다 안전 가이드를 먼저 붙이는 흐름이 맞아요."
            : "",
        ],
        3
      ),
    });
  }

  const hasRoutineContext =
    summary.recentOrders.length > 0 ||
    summary.recommendedNutrients.length > 0 ||
    containsKeyword(text, "복용시간") ||
    containsKeyword(text, "식후") ||
    containsKeyword(text, "공복") ||
    containsKeyword(text, "루틴");

  if (hasRoutineContext) {
    signals.push({
      key: "routine",
      label: "복용 루틴",
      tone: summary.recentOrders.length > 0 ? "emerald" : "sky",
      score:
        4 +
        summary.recentOrders.length * 2 +
        Math.min(summary.recommendedNutrients.length, 3),
      keywords: [
        "복용시간",
        "식후",
        "공복",
        "루틴",
        "오메가3",
        "비타민d",
        "유산균",
        "철분",
        "칼슘",
      ],
      fallbackSlugs: [
        "omega3-after-meal",
        "vitamin-d-with-fat-meal",
        "probiotic-before-breakfast",
        "iron-calcium-coffee-gap",
      ],
      reasons: uniqueStrings(
        [
          summary.recentOrders.length
            ? "최근 주문 이력이 있어 무엇을 살지보다 어떻게 꾸준히 먹을지가 더 중요해지는 구간이에요."
            : "",
          summary.recommendedNutrients.length
            ? `${summary.recommendedNutrients.slice(0, 2).join(", ")} 축이 보여 복용 시간과 조합 설명이 바로 연결돼요.`
            : "",
        ],
        3
      ),
    });
  }

  const hasEnergyContext =
    containsKeyword(text, "수면") ||
    containsKeyword(text, "피로") ||
    containsKeyword(text, "스트레스") ||
    containsKeyword(text, "카페인") ||
    containsKeyword(text, "커피") ||
    summary.profile?.constraints.some(
      (item) => item.includes("카페인") || item.includes("수면")
    );

  if (hasEnergyContext) {
    signals.push({
      key: "energy",
      label: "수면·피로",
      tone: "sky",
      score: 4,
      keywords: [
        "수면",
        "피로",
        "스트레스",
        "커피",
        "카페인",
        "교대근무",
        "마그네슘",
      ],
      fallbackSlugs: [
        "magnesium-and-sleep-habit",
        "smarter-coffee-habits-for-koreans",
        "supplements-for-shift-workers",
      ],
      reasons: uniqueStrings(
        [
          containsKeyword(text, "수면")
            ? "최근 맥락이 수면 쪽으로 모여 있어 생활 습관형 설명을 먼저 보면 추천을 더 잘 해석할 수 있어요."
            : "",
          containsKeyword(text, "커피") || containsKeyword(text, "카페인")
            ? "카페인/커피 패턴이 보여 복용보다 먼저 생활 리듬을 같이 읽는 편이 좋아요."
            : "",
        ],
        3
      ),
    });
  }

  const hasBloodSugarContext =
    containsKeyword(text, "혈당") ||
    containsKeyword(text, "당") ||
    containsKeyword(text, "인슐린") ||
    containsKeyword(text, "공복혈당") ||
    containsKeyword(text, "체중");

  if (hasBloodSugarContext) {
    signals.push({
      key: "bloodSugar",
      label: "혈당·식습관",
      tone: "sky",
      score: 4,
      keywords: ["혈당", "당", "인슐린", "공복혈당", "식사", "탄수화물"],
      fallbackSlugs: [
        "sunlight-can-change-blood-sugar",
        "insulin-resistance-is-not-just-carbs",
        "cutting-carbs-backfires",
      ],
      reasons: uniqueStrings(
        [
          "혈당과 식습관 신호가 보여 단일 성분보다 식사 맥락 설명을 먼저 붙이는 편이 설득력이 커요.",
          summary.healthLink?.topConditions.length
            ? `건강링크 조건에 ${summary.healthLink.topConditions.slice(0, 2).join(", ")} 맥락이 보여요.`
            : "",
        ],
        3
      ),
    });
  }

  const isFemaleContext = summary.profile?.sexAge.includes("여");
  const hasWomenContext =
    isFemaleContext &&
    (containsKeyword(text, "생리") ||
      containsKeyword(text, "폐경") ||
      containsKeyword(text, "피임약") ||
      containsKeyword(text, "호르몬"));

  if (hasWomenContext) {
    signals.push({
      key: "women",
      label: "여성 건강",
      tone: "amber",
      score: 4,
      keywords: ["생리", "폐경", "피임약", "여성", "호르몬"],
      fallbackSlugs: [
        "period-pain-foods-to-stop-first",
        "birth-control-pill-basics",
        "women-intermittent-fasting-can-backfire",
      ],
      reasons: uniqueStrings(
        [
          "여성 건강 축 신호가 있어 일반 제품 설명보다 주기와 생활 변화 해설이 먼저 읽혀요.",
        ],
        3
      ),
    });
  }

  if (signals.length === 0) {
    signals.push({
      key: "starter",
      label: "입문 가이드",
      tone: "slate",
      score: 2,
      keywords: ["가이드", "주의", "체크리스트", "선택", "입문"],
      fallbackSlugs: [
        "pharmacists-dont-give-these-supplements-easily",
        "supplements-can-turn-toxic",
        "fake-supplement-warning-signs",
      ],
      reasons: [
        "데이터가 많지 않을 때는 상품을 넓게 보기 전에 기본 복약 가이드 한 편이 판단 기준을 만들어줘요.",
      ],
    });
  }

  return signals.sort((left, right) => right.score - left.score);
}

function buildColumnText(column: EducationColumnCandidate) {
  return normalizeText(
    [column.title, column.summary, ...column.tags, column.slug.replace(/-/g, " ")].join(
      " "
    )
  );
}

function resolveFreshnessBonus(publishedAt: string) {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (ageDays <= 14) return 3;
  if (ageDays <= 45) return 2;
  if (ageDays <= 90) return 1;
  return 0;
}

function rankColumns(
  columns: EducationColumnCandidate[],
  signals: ThemeSignal[],
  entityKeywords: string[]
) {
  const topSignal = signals[0];

  const ranked = columns
    .map((column) => {
      const text = buildColumnText(column);
      let score = resolveFreshnessBonus(column.publishedAt);
      let whyLabel = topSignal.label;
      let matched = false;

      for (const signal of signals) {
        const keywordMatches = countKeywordMatches(text, signal.keywords);
        const slugBoost = signal.fallbackSlugs.includes(column.slug) ? 8 : 0;
        if (keywordMatches > 0 || slugBoost > 0) {
          matched = true;
          score += signal.score * 3 + keywordMatches * 4 + slugBoost;
          if (whyLabel === topSignal.label || signal.score > topSignal.score - 1) {
            whyLabel = signal.label;
          }
        }
      }

      const matchedEntities = entityKeywords.filter((keyword) =>
        containsKeyword(text, keyword)
      );

      if (matchedEntities.length > 0) {
        matched = true;
        score += Math.min(12, matchedEntities.length * 4);
        whyLabel = `${matchedEntities[0]} 맥락`;
      }

      if (!matched && topSignal.fallbackSlugs.includes(column.slug)) {
        score += 6;
      }

      return {
        column,
        score,
        whyLabel,
      } satisfies RankedColumn;
    })
    .sort((left, right) => right.score - left.score);

  return ranked;
}

function resolveInsightCopy(
  surface: EducationSurface,
  signal: ThemeSignal,
  summary: UserContextSummary
) {
  if (signal.key === "safety") {
    return {
      badgeLabel: surface === "explore" ? "결정 전 체크" : "복약 안전 읽을거리",
      title:
        surface === "explore"
          ? "지금은 상품 설명보다 복약 안전과 상호작용을 먼저 짚는 편이 좋아요"
          : "최근 기록을 보면 복약 안전 가이드를 먼저 읽는 편이 더 잘 맞아요",
      description:
        surface === "explore"
          ? "복용약이나 건강링크 맥락이 보이면, 성분 비교 전에 음식·약 상호작용과 복용 주의점을 짧게 읽고 들어가는 편이 신뢰도와 결정 속도를 같이 올립니다."
          : "지금 쌓인 기록은 추천 자체보다 안전한 복용 조건과 피해야 할 조합을 이해하는 데 더 직접적으로 연결됩니다.",
      helper:
        summary.safetyEscalation.requiresPharmacistReview
          ? "주의 신호가 있으면 글로 끝내지 말고 약사 확인으로 이어지는 흐름이 가장 안전합니다."
          : "짧은 가이드를 먼저 읽고 나면 탐색과 상담에서 더 정확한 질문을 던질 수 있어요.",
    };
  }

  if (signal.key === "routine") {
    return {
      badgeLabel: surface === "explore" ? "복용 루틴" : "이번 주 읽을거리",
      title:
        surface === "explore"
          ? "고르기 전에 복용 시간과 루틴을 먼저 잡아두면 결정이 쉬워져요"
          : "이번 주에는 체감보다 복용 루틴을 다지는 읽을거리가 더 잘 맞아요",
      description:
        surface === "explore"
          ? "어떤 성분을 볼지보다 언제 어떻게 먹을지가 먼저 잡히면, 과한 구성이나 중복 구매를 줄이고 더 가볍게 시작할 수 있어요."
          : "주문과 추천 성분 흐름이 보일 때는 추가 구매보다 복용 시간, 함께 먹는 법, 불편 신호 해석을 먼저 붙이는 편이 만족도가 높습니다.",
      helper:
        "3분 안팎의 가이드부터 읽고 들어가면 탐색과 재구성 판단이 훨씬 덜 흔들립니다.",
    };
  }

  if (signal.key === "energy") {
    return {
      badgeLabel: surface === "explore" ? "생활 습관 힌트" : "수면·피로 읽을거리",
      title:
        surface === "explore"
          ? "수면과 피로 축이 보여 생활 습관형 설명을 먼저 보면 좋아요"
          : "최근 흐름이 수면·피로 쪽으로 모여 있어 이 축 설명부터 읽어보세요",
      description:
        "지금 단계에서는 성분 하나보다 커피, 카페인, 수면 리듬 같은 생활 변수 설명이 더 빠르게 납득을 만들어줍니다.",
      helper:
        "생활 리듬을 먼저 이해하면 검사 결과와 추천 결과도 훨씬 덜 과장되게 읽히게 됩니다.",
    };
  }

  if (signal.key === "bloodSugar") {
    return {
      badgeLabel: surface === "explore" ? "식사 맥락" : "혈당·식습관 읽을거리",
      title:
        surface === "explore"
          ? "혈당과 식습관 맥락이 보여 이 설명부터 붙이는 편이 좋아요"
          : "최근 데이터가 혈당·식습관 축으로 이어져 있어 이 흐름을 먼저 읽어보세요",
      description:
        "혈당과 대사 축은 단일 제품 추천보다 식사 패턴, 탄수화물, 생활 습관과 함께 봐야 이해가 훨씬 잘 됩니다.",
      helper:
        "이해가 붙은 뒤 제품을 보면 과장된 기대보다 현실적인 시작점이 더 잘 잡힙니다.",
    };
  }

  if (signal.key === "women") {
    return {
      badgeLabel: surface === "explore" ? "여성 건강 맥락" : "여성 건강 읽을거리",
      title:
        surface === "explore"
          ? "주기와 호르몬 맥락이 보여 관련 가이드부터 보는 편이 좋아요"
          : "이번 여정에서는 여성 건강 축 설명을 먼저 붙이는 편이 더 자연스러워요",
      description:
        "여성 건강 맥락은 일반적인 성분 설명보다 주기, 생활 패턴, 복약 주의점 해설이 먼저 읽혀야 실제 선택이 덜 흔들립니다.",
      helper:
        "짧은 설명을 먼저 읽고 검사나 상담으로 이어가면 본인 상황에 맞는 질문이 훨씬 선명해져요.",
    };
  }

  return {
    badgeLabel: surface === "explore" ? "입문 가이드" : "기본 읽을거리",
    title:
      surface === "explore"
        ? "처음이라면 성분 비교 전에 기본 복약 가이드부터 읽어두면 덜 헤맵니다"
        : "데이터가 많지 않을 때는 기본 복약 원칙 글이 다음 선택에 더 도움이 됩니다",
    description:
      "정적 건강 상식보다, 지금 단계에서 실수를 줄여주는 짧은 기본 가이드가 탐색과 상담의 기준점을 만들어줍니다.",
    helper:
      "한 편만 읽고 들어가도 이후 추천과 상품 설명이 훨씬 맥락 있게 보이기 시작합니다.",
  };
}

function resolveSecondaryAction(
  surface: EducationSurface,
  signal: ThemeSignal,
  summary: UserContextSummary
) {
  if (surface === "explore") {
    return summary.safetyEscalation.requiresPharmacistReview
      ? { href: "/chat?from=explore-learning", label: "약사와 먼저 확인하기" }
      : { href: "/explore#home-products", label: "상품 이어서 보기" };
  }

  if (summary.recentOrders.length > 0) {
    return {
      href: "/chat?from=my-data-learning",
      label: signal.key === "safety" ? "약사와 점검하기" : "지금 상태 정리하기",
    };
  }

  return {
    href: "/explore",
    label: "맞춤 구성 다시 보기",
  };
}

export function recommendPersonalizedEducation(input: {
  columns: EducationColumnCandidate[];
  summary: UserContextSummary;
  surface: EducationSurface;
}): PersonalizedEducationInsight | null {
  const { columns, summary, surface } = input;
  if (!Array.isArray(columns) || columns.length === 0) return null;
  if (!summary.hasAnyData && surface === "my-data") return null;

  const situationContext = resolveSituationalContext({ summary });
  const signals = buildThemeSignals(summary)
    .map((signal) => ({
      ...signal,
      score: signal.score + getSituationalSignalBoost(signal.key, situationContext),
      reasons: uniqueStrings(
        [...signal.reasons, getSituationalSignalReason(signal.key, situationContext)],
        3
      ),
    }))
    .sort((left, right) => right.score - left.score);
  const entityKeywords = buildEntityKeywords(summary);
  const ranked = rankColumns(columns, signals, entityKeywords).filter(
    (entry) => entry.score > 0
  );

  const selected = ranked.slice(0, 3);
  if (selected.length === 0) return null;

  const topSignal = signals[0];
  const copy = resolveInsightCopy(surface, topSignal, summary);
  const reasonLines = uniqueStrings(
    [
      ...situationContext.reasonLines,
      ...topSignal.reasons,
      ...(summary.explainability.fitReasons ?? []),
    ],
    3
  );
  const chips = uniqueStrings(
    [
      situationContext.seasonLabel,
      situationContext.daypartLabel,
      topSignal.label,
      ...summary.evidenceLabels,
      ...summary.recommendedNutrients,
    ],
    5
  );
  const [primary, ...secondary] = selected;

  return {
    tone: topSignal.tone,
    badgeLabel: copy.badgeLabel,
    title: copy.title,
    description: copy.description,
    helper: copy.helper,
    reasonLines,
    chips,
    situationContext,
    primaryItem: {
      slug: primary.column.slug,
      title: primary.column.title,
      summary: primary.column.summary,
      readingMinutes: primary.column.readingMinutes,
      tags: primary.column.tags.slice(0, 3),
      whyLabel: primary.whyLabel,
    },
    secondaryItems: secondary.map((entry) => ({
      slug: entry.column.slug,
      title: entry.column.title,
      summary: entry.column.summary,
      readingMinutes: entry.column.readingMinutes,
      tags: entry.column.tags.slice(0, 2),
      whyLabel: entry.whyLabel,
    })),
    primaryAction: {
      href: `/column/${primary.column.slug}`,
      label: surface === "explore" ? "이 글 먼저 읽기" : "이번 주 먼저 읽기",
    },
    secondaryAction: resolveSecondaryAction(surface, topSignal, summary),
  };
}
