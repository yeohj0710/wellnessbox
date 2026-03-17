import { normalizeCategoryLabel, uniq } from "./context.base";
import type { UserContextSummary } from "./context.types";

type DataAssetInput = {
  profile: UserContextSummary["profile"];
  recentOrders: UserContextSummary["recentOrders"];
  latestAssess: UserContextSummary["latestAssess"];
  latestQuick: UserContextSummary["latestQuick"];
  healthLink: UserContextSummary["healthLink"];
  previousConsultations: UserContextSummary["previousConsultations"];
  recommendedNutrients: UserContextSummary["recommendedNutrients"];
};

type ThemeSource = "result" | "consult" | "order" | "health" | "profile";

function normalizeSearch(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function hasThemeMatch(texts: string[], theme: string) {
  const normalizedTheme = normalizeSearch(theme);
  if (!normalizedTheme) return false;

  return texts.some((text) => normalizeSearch(text).includes(normalizedTheme));
}

function joinLabels(items: string[], limit = 2) {
  return uniq(items, limit).join(", ");
}

function buildSourceLabels(input: DataAssetInput) {
  return uniq(
    [
      input.profile ? "프로필" : "",
      input.latestAssess ? "정밀검사" : "",
      input.latestQuick ? "빠른검사" : "",
      input.healthLink ? "건강링크" : "",
      input.previousConsultations.length > 0 ? "상담" : "",
      input.recentOrders.length > 0 ? "주문" : "",
    ].filter(Boolean),
    6
  );
}

export function buildDataAssetSummary(
  input: DataAssetInput
): UserContextSummary["dataAsset"] {
  const candidateThemes = uniq(
    [
      ...input.recommendedNutrients,
      ...(input.latestAssess?.findings ?? []),
      ...(input.latestQuick?.findings ?? []),
    ]
      .map((label) => normalizeCategoryLabel(label))
      .filter(Boolean),
    6
  );

  const consultTexts = input.previousConsultations.flatMap((session) =>
    [session.title, session.userPoint, session.assistantPoint].filter(Boolean)
  );
  const orderTexts = input.recentOrders.flatMap((order) => order.items);
  const healthTexts = input.healthLink
    ? [
        input.healthLink.headline,
        input.healthLink.summary,
        ...input.healthLink.highlights,
        ...input.healthLink.nextSteps,
      ].filter(Boolean)
    : [];
  const profileTexts = input.profile
    ? [
        ...input.profile.goals,
        ...input.profile.constraints,
        ...input.profile.conditions,
        ...input.profile.medications,
      ]
    : [];

  const sourceLabels = buildSourceLabels(input);
  const themeMap = candidateThemes.map((theme) => {
    const sources: ThemeSource[] = [];

    if (
      input.recommendedNutrients.includes(theme) ||
      input.latestAssess?.findings.includes(theme) ||
      input.latestQuick?.findings.includes(theme)
    ) {
      sources.push("result");
    }
    if (hasThemeMatch(consultTexts, theme)) sources.push("consult");
    if (hasThemeMatch(orderTexts, theme)) sources.push("order");
    if (hasThemeMatch(healthTexts, theme)) sources.push("health");
    if (hasThemeMatch(profileTexts, theme)) sources.push("profile");

    return { theme, sources: uniq(sources, 5) as ThemeSource[] };
  });

  const repeatedThemes = themeMap
    .filter((item) => item.sources.length >= 2)
    .map((item) => item.theme)
    .slice(0, 3);
  const adoptedThemes = themeMap
    .filter((item) => item.sources.includes("order"))
    .map((item) => item.theme)
    .slice(0, 3);
  const opportunityThemes = themeMap
    .filter(
      (item) =>
        item.sources.includes("result") &&
        item.sources.length >= 2 &&
        !item.sources.includes("order")
    )
    .map((item) => item.theme)
    .slice(0, 3);

  const stage: UserContextSummary["dataAsset"]["stage"] =
    adoptedThemes.length > 0 && repeatedThemes.length > 0
      ? "follow_through"
      : repeatedThemes.length > 0
      ? "compounding"
      : sourceLabels.length >= 3
      ? "forming"
      : "light";

  const repeatedLabel = joinLabels(repeatedThemes);
  const adoptedLabel = joinLabels(adoptedThemes);
  const opportunityLabel = joinLabels(opportunityThemes);

  const reasonLines = uniq(
    [
      repeatedThemes.length > 0
        ? `검사, 상담, 주문 기록을 같이 보면 ${repeatedLabel} 쪽 내용이 반복해서 보여요.`
        : "",
      adoptedThemes.length > 0
        ? `이미 ${adoptedLabel} 쪽은 실제 선택까지 이어졌어요.`
        : "",
      opportunityThemes.length > 0
        ? `${opportunityLabel} 쪽은 여러 번 보였지만 아직 실제 선택으로 이어지진 않았어요.`
        : "",
      sourceLabels.length >= 4
        ? `${sourceLabels.slice(0, 4).join(", ")} 기록이 같이 있어 최근 흐름을 조금 더 넓게 볼 수 있어요.`
        : "",
    ].filter(Boolean),
    4
  );

  if (stage === "follow_through") {
    return {
      stage,
      strengthLabel: "선택까지 이어진 기록",
      headline: "이미 실제 선택까지 이어진 내용이 있어요.",
      summary:
        adoptedThemes.length > 0
          ? `${adoptedLabel} 쪽은 이미 선택으로 이어진 기록이 있어, 새로 넓히기보다 지금 흐름을 다듬는 쪽이 더 잘 맞아요.`
          : "최근 기록 안에 실제 선택으로 이어진 내용이 있어 다음 조정 포인트를 보기 좋아요.",
      sourceLabels,
      repeatedThemes,
      adoptedThemes,
      opportunityThemes,
      reasonLines,
      recommendedActionHint:
        "지금은 완전히 새로 보기보다 이미 이어진 내용부터 조정해보는 편이 더 자연스러워요.",
    };
  }

  if (stage === "compounding") {
    return {
      stage,
      strengthLabel: "여러 기록이 비슷하게 모여요",
      headline: "여러 기록이 비슷한 쪽을 가리키고 있어요.",
      summary:
        repeatedThemes.length > 0
          ? `${repeatedLabel} 쪽이 검사와 상담, 최근 기록에서 반복해서 보여 지금 먼저 보기 좋은 내용으로 정리돼요.`
          : "여러 기록이 비슷한 흐름으로 모이기 시작해 조금 더 또렷하게 볼 수 있어요.",
      sourceLabels,
      repeatedThemes,
      adoptedThemes,
      opportunityThemes,
      reasonLines,
      recommendedActionHint:
        "지금 반복해서 보이는 내용부터 좁혀 보면 다음 선택이 훨씬 쉬워져요.",
    };
  }

  if (stage === "forming") {
    return {
      stage,
      strengthLabel: "기록이 연결되기 시작했어요",
      headline: "흩어져 있던 기록이 조금씩 이어지고 있어요.",
      summary:
        sourceLabels.length > 0
          ? `${sourceLabels.join(", ")} 내용이 쌓이기 시작해 막연하게 고르기보다 상황에 맞춰 보기 쉬워졌어요.`
          : "몇 가지 기록이 모이기 시작해 다음 방향을 정하는 데 도움이 되는 단계예요.",
      sourceLabels,
      repeatedThemes,
      adoptedThemes,
      opportunityThemes,
      reasonLines,
      recommendedActionHint:
        "지금은 검사나 상담 하나만 더 이어도 기록이 훨씬 또렷해질 수 있어요.",
    };
  }

  return {
    stage,
    strengthLabel: "이제 막 쌓이기 시작한 기록",
    headline: "아직은 기록이 많지 않아요.",
    summary:
      "지금 단계에서는 하나의 결과만으로 단정하기보다, 다음 검사나 상담으로 기본 흐름을 먼저 만드는 편이 좋아요.",
    sourceLabels,
    repeatedThemes,
    adoptedThemes,
    opportunityThemes,
    reasonLines,
    recommendedActionHint:
      "지금은 첫 기록을 하나 더 남기면 다음 추천과 설명이 훨씬 자연스러워져요.",
  };
}
