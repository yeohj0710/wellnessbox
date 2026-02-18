import type { ChatMessage } from "@/types/chat";
import {
  type ActionableRecommendation,
  parseRecommendationLines,
  resolveRecommendations,
} from "@/app/chat/components/recommendedProductActions.utils";

const ADD_INTENT_REGEX =
  /(담아|담기|추가해|추가해줘|넣어|담아줘|담아줄래|장바구니에?\s*(담|넣|추가)|카트에?\s*(담|넣|추가))/;
const BUY_INTENT_REGEX =
  /(바로\s*구매|구매해|구매할래|구매해줘|결제|주문(?!\s*(내역|조회|번호))|사줘|살래|살게|사고\s*싶)/;
const ALL_TARGET_REGEX =
  /((전체|전부|모두|다|추천\s*제품).*(담|추가|넣|구매|사|주문|결제))|((담|추가|넣|구매|사|주문|결제).*(전체|전부|모두|다|추천\s*제품))/;
const RECOMMENDATION_REFERENCE_REGEX =
  /(추천\s*제품|이\s*제품|이거|그거|저거|방금\s*추천)/;

const MAX_QUANTITY = 20;

export type ParsedCartCommandItem = {
  recommendation: ActionableRecommendation;
  quantity: number;
};

export type ParsedCartCommand = {
  items: ParsedCartCommandItem[];
  openCartAfterSave: boolean;
};

function normalizeForMatch(value: string) {
  return (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(MAX_QUANTITY, Math.floor(value));
}

function hasCartIntent(text: string) {
  return ADD_INTENT_REGEX.test(text) || BUY_INTENT_REGEX.test(text);
}

function getLatestRecommendationLines(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const parsed = parseRecommendationLines(message.content || "");
    if (parsed.length > 0) return parsed;
  }
  return [];
}

function buildAliases(item: ActionableRecommendation) {
  const base = `${item.productName} ${item.category}`;
  const tokenized = base
    .split(/[\s/(),.+\-_|]+/g)
    .map((token) => normalizeForMatch(token))
    .filter((token) => token.length >= 2);
  const fullName = normalizeForMatch(item.productName);
  const category = normalizeForMatch(item.category);

  return Array.from(new Set([fullName, category, ...tokenized]))
    .filter((alias) => alias.length >= 2)
    .sort((left, right) => right.length - left.length);
}

function getMatchScore(item: ActionableRecommendation, normalizedText: string) {
  const aliases = buildAliases(item);
  let score = 0;
  for (const alias of aliases) {
    if (normalizedText.includes(alias)) {
      score = Math.max(score, alias.length);
    }
  }
  return score;
}

function parseGlobalQuantity(text: string, normalizedText: string) {
  const explicitEach =
    text.match(/(?:각각|개씩)\s*(\d{1,2})\s*개?/) ||
    text.match(/(\d{1,2})\s*개\s*씩/);
  if (explicitEach) return clampQuantity(Number.parseInt(explicitEach[1], 10));

  const allWithQuantity = text.match(
    /(?:전체|전부|모두|다|추천\s*제품)\s*(\d{1,2})\s*개/
  );
  if (allWithQuantity) {
    return clampQuantity(Number.parseInt(allWithQuantity[1], 10));
  }

  const direct = text.match(/(\d{1,2})\s*개/);
  if (direct) return clampQuantity(Number.parseInt(direct[1], 10));

  const normalizedDirect = normalizedText.match(/(\d{1,2})개/);
  if (normalizedDirect) {
    return clampQuantity(Number.parseInt(normalizedDirect[1], 10));
  }

  return 1;
}

function parseItemQuantity(
  normalizedText: string,
  item: ActionableRecommendation,
  fallbackQuantity: number
) {
  const aliases = buildAliases(item);

  for (const alias of aliases) {
    const escaped = escapeRegExp(alias);
    const afterAlias = normalizedText.match(
      new RegExp(`${escaped}[\\p{L}]{0,2}(\\d{1,2})개`, "u")
    );
    if (afterAlias) {
      return clampQuantity(Number.parseInt(afterAlias[1], 10));
    }

    const beforeAlias = normalizedText.match(
      new RegExp(`(\\d{1,2})개[\\p{L}]{0,2}${escaped}`, "u")
    );
    if (beforeAlias) {
      return clampQuantity(Number.parseInt(beforeAlias[1], 10));
    }
  }

  return clampQuantity(fallbackQuantity);
}

function pickTargets(
  text: string,
  normalizedText: string,
  recommendations: ActionableRecommendation[]
) {
  if (recommendations.length === 0) return [];

  if (ALL_TARGET_REGEX.test(text)) return recommendations;

  const matchedByScore = recommendations
    .map((recommendation) => ({
      recommendation,
      score: getMatchScore(recommendation, normalizedText),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.recommendation);

  if (matchedByScore.length > 0) return matchedByScore;

  if (
    RECOMMENDATION_REFERENCE_REGEX.test(text) ||
    (text.includes("추천") && hasCartIntent(text))
  ) {
    return recommendations;
  }

  if (recommendations.length === 1) return recommendations;
  return [];
}

export async function parseCartCommandFromMessages(params: {
  text: string;
  messages: ChatMessage[];
}): Promise<ParsedCartCommand | null> {
  const text = (params.text || "").trim();
  if (!hasCartIntent(text)) return null;

  const latestLines = getLatestRecommendationLines(params.messages || []);
  if (latestLines.length === 0) return null;

  const recommendations = await resolveRecommendations(latestLines);
  if (recommendations.length === 0) return null;

  const normalizedText = normalizeForMatch(text);
  const targets = pickTargets(text, normalizedText, recommendations);
  if (targets.length === 0) return null;

  const globalQuantity = parseGlobalQuantity(text, normalizedText);
  const items = targets
    .map((recommendation) => ({
      recommendation,
      quantity: parseItemQuantity(normalizedText, recommendation, globalQuantity),
    }))
    .filter((entry) => entry.quantity > 0);

  if (items.length === 0) return null;

  return {
    items,
    openCartAfterSave: BUY_INTENT_REGEX.test(text),
  };
}

export function hasRoadAddressInLocalStorage() {
  if (typeof window === "undefined") return false;
  const value = localStorage.getItem("roadAddress");
  return typeof value === "string" && value.trim().length > 0;
}

export function formatCartCommandSummary(items: ParsedCartCommandItem[]) {
  if (!items.length) return "";

  const preview = items.slice(0, 3).map((entry) => {
    return `${entry.recommendation.productName} ${entry.quantity}개`;
  });
  const suffix = items.length > 3 ? ` 외 ${items.length - 3}개 품목` : "";
  return `${preview.join(", ")}${suffix}`;
}
