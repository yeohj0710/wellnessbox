import { CATEGORY_LABELS, INTEREST_LABELS } from "@/lib/categories";
import type { UserContextSummary } from "@/lib/chat/context";
import type { ResolvedCartItemRow } from "@/components/order/cartItemsSection.view-model";

type CartExplainabilityTone = "slate" | "sky" | "emerald" | "amber";

export type CartCompositionExplainabilityModel = {
  tone: CartExplainabilityTone;
  badgeLabel: string;
  title: string;
  description: string;
  helper: string;
  reasonLines: string[];
  overlapLines: string[];
  cautionLines: string[];
  primaryAction?: {
    label: string;
    href: string;
  };
};

const INTEREST_LABEL_BY_CATEGORY = new Map<string, string>(
  Object.entries(CATEGORY_LABELS).map(([key, label]) => [
    label,
    INTEREST_LABELS[key as keyof typeof INTEREST_LABELS],
  ])
);

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, "").toLowerCase();
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

function parseOptionDays(optionType: string | null | undefined) {
  const text = (optionType || "").trim();
  if (!text) return null;
  const match = text.match(/(\d+)\s*일/);
  if (match) return Number.parseInt(match[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function buildChatHref(prompt: string) {
  const query = new URLSearchParams();
  query.set("from", "/");
  query.set("draft", prompt);
  return `/chat?${query.toString()}`;
}

function getRowThemes(row: ResolvedCartItemRow) {
  const themes = (row.product.categories || [])
    .map((category) => {
      const categoryName = (category.name || "").trim();
      return INTEREST_LABEL_BY_CATEGORY.get(categoryName) || categoryName;
    })
    .filter(Boolean);

  return uniqueStrings(themes, 3);
}

function findThemeMatches(themes: string[], nutrients: string[]) {
  const nutrientText = nutrients.map((item) => normalizeText(item));
  return themes.filter((theme) => {
    const normalizedTheme = normalizeText(theme);
    return nutrientText.some(
      (nutrient) =>
        nutrient.includes(normalizedTheme) || normalizedTheme.includes(nutrient)
    );
  });
}

export function buildCartCompositionExplainability(input: {
  rows: ResolvedCartItemRow[];
  summary: UserContextSummary | null | undefined;
}): CartCompositionExplainabilityModel | null {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const summary = input.summary;
  if (!summary || rows.length === 0) return null;

  const themes = uniqueStrings(rows.flatMap((row) => getRowThemes(row)), 4);
  const matchedThemes = findThemeMatches(themes, summary.recommendedNutrients);
  const longPackage = rows.some((row) => {
    const days = parseOptionDays(row.pharmacyProduct.optionType);
    return typeof days === "number" && days >= 30;
  });
  const themeCounts = themes.reduce<Map<string, number>>((acc, theme) => {
    const count = rows.filter((row) => getRowThemes(row).includes(theme)).length;
    acc.set(theme, count);
    return acc;
  }, new Map());
  const duplicateThemes = Array.from(themeCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([theme]) => theme)
    .slice(0, 2);

  const tone: CartExplainabilityTone =
    summary.safetyEscalation.level !== "routine"
      ? "amber"
      : matchedThemes.length > 0
      ? "sky"
      : "emerald";

  const title =
    summary.safetyEscalation.level !== "routine"
      ? "지금 장바구니는 성분을 더 늘리기보다 병용과 우선순위를 먼저 이해하고 가는 편이 안전해요"
      : matchedThemes.length > 0
      ? `${matchedThemes.join(", ")} 축이 먼저 잡혀 있어 지금 기록과 가장 잘 연결되는 조합으로 보여요`
      : themes.length > 0
      ? `${themes.join(", ")} 축을 중심으로 가볍게 시작하는 조합으로 이해하면 가장 덜 헷갈려요`
      : "지금 장바구니는 목적이 다른 성분을 한 번에 늘리기보다 먼저 이해하고 시작하는 흐름이 좋아요";

  const description =
    summary.safetyEscalation.level !== "routine"
      ? summary.explainability.pharmacistReviewPoints[0] ||
        "복용약, 주의 신호, 건강링크 맥락이 보이면 무엇을 더 담을지보다 겹치거나 조심할 성분이 없는지 먼저 보는 편이 좋습니다."
      : matchedThemes.length > 0
      ? `지금 조합은 ${matchedThemes.join(", ")} 축을 먼저 보기 위한 구성이어서, 모든 목적을 한 번에 해결하려는 장바구니보다 이해하고 실행하기가 더 쉽습니다.`
      : "같은 시점에 너무 많은 목적을 해결하려 하기보다, 먼저 체감과 실행이 쉬운 축으로 단순화된 장바구니일수록 첫 구매와 복용 지속에 더 유리합니다.";

  const helper =
    longPackage && rows.length >= 2
      ? "옵션 기간이 길수록 성분 수보다 먼저 복용 부담과 중복 가능성을 보는 편이 좋아요."
      : "성분 백과사전보다 지금 장바구니에서 왜 이 축이 먼저인지와 겹치는지 여부만 바로 보이게 하는 것이 더 실용적입니다.";

  const reasonLines = uniqueStrings(
    [
      matchedThemes.length > 0
        ? `최근 기록 기준으로 ${matchedThemes.join(", ")} 축이 먼저 읽혀요.`
        : "",
      summary.explainability.fitReasons[0] || "",
      summary.explainability.fitReasons[1] || "",
      summary.profile?.goals[0]
        ? `현재 목표는 ${summary.profile.goals[0]} 쪽으로 읽히고 있어요.`
        : "",
    ].filter(Boolean),
    3
  );

  const overlapLines = uniqueStrings(
    [
      duplicateThemes.length > 0
        ? `${duplicateThemes.join(", ")} 목적이 겹쳐 체감이 비슷하게 느껴질 수 있어요.`
        : "지금은 목적 축이 크게 겹치지 않아 과한 중복보다는 실행 가능성이 더 좋아 보여요.",
      longPackage && rows.length >= 2
        ? "여러 상품을 긴 옵션으로 바로 시작하면 복용 부담이 커질 수 있어요."
        : "",
      rows.length >= 3
        ? "상품 수가 많아질수록 복용 시간과 우선순위를 단순하게 잡는 편이 좋아요."
        : "",
    ].filter(Boolean),
    3
  );

  const cautionLines = uniqueStrings(
    [
      summary.safetyEscalation.level !== "routine"
        ? summary.safetyEscalation.reasonLines[0] || ""
        : "",
      summary.explainability.pharmacistReviewPoints[0] || "",
      summary.explainability.uncertaintyNotes[0] || "",
    ].filter(Boolean),
    3
  );

  const primaryAction =
    cautionLines.length > 0
      ? {
          label: "이 조합 기준으로 약사에게 물어보기",
          href: buildChatHref(
            "지금 장바구니 조합을 기준으로 왜 이 성분들이 먼저인지, 겹치거나 주의할 성분이 없는지 짧고 쉽게 정리해줘."
          ),
        }
      : undefined;

  return {
    tone,
    badgeLabel: cautionLines.length > 0 ? "조합 설명 + 안전 확인" : "왜 이 조합인지",
    title,
    description,
    helper,
    reasonLines,
    overlapLines,
    cautionLines,
    primaryAction,
  };
}
