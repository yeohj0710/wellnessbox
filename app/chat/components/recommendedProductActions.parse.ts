import { normalizeKey } from "./recommendedProductActions.shared";
import type { RecommendationLine } from "./recommendedProductActions.types";

export function parseRecommendationLines(content: string): RecommendationLine[] {
  if (!content) return [];

  const hasRecommendationHeading = /(추천\s*(제품|상품)|recommended\s*products?)/i.test(
    content
  );

  const lines = content
    .split(/\r?\n/)
    .map((raw) =>
      raw
        .replace(/^\s*#+\s*/, "")
        .replace(/^\s*[•·▪◦]\s*/, "")
        .replace(/^\s*(?:[-*]|\d+\.)\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .trim()
    )
    .filter(Boolean);

  const out: RecommendationLine[] = [];

  const toPrice = (line: string) => {
    const match = line.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
    if (!match) return null;
    const parsed = Number.parseInt(match[1].replace(/,/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cleanupProductName = (line: string) =>
    line
      .replace(/\([^)]*?(\d{1,3}(?:,\d{3})+|\d+)\s*원[^)]*\)/gi, "")
      .replace(/\b7\s*일\s*기준\b/gi, "")
      .replace(/[-|]\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원.*$/i, "")
      .replace(/(\d{1,3}(?:,\d{3})+|\d+)\s*원.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  for (const cleaned of lines) {
    if (
      out.length > 0 &&
      /^(추가|원하시면|필요하면|다음|참고|안내|장바구니를|프로필)/.test(cleaned)
    ) {
      break;
    }

    const hasStructuredSeparator = /[:\-|]/.test(cleaned);
    const sourcePrice = toPrice(cleaned);
    const looksLikeProductLine = /[가-힣A-Za-z]{2,}/.test(cleaned);
    const looksLikeProductPriceLine =
      /[가-힣A-Za-z].*(\d{1,3}(?:,\d{3})+|\d+)\s*원/.test(cleaned);
    const looksLikeSummaryLine =
      /(합계|총액|배송|할인|쿠폰|결제|주문번호|주문일)/.test(cleaned);

    if (
      sourcePrice == null &&
      (!hasRecommendationHeading || !hasStructuredSeparator || !looksLikeProductLine)
    ) {
      continue;
    }

    if (!hasRecommendationHeading && !hasStructuredSeparator && !looksLikeProductPriceLine) {
      continue;
    }
    if (looksLikeSummaryLine && !hasStructuredSeparator) {
      continue;
    }

    let category = "추천";
    let detail = cleaned;

    const colon = cleaned.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);
    if (colon) {
      category = colon[1].trim();
      detail = colon[2].trim();
    } else {
      const dash = cleaned.match(/^(.+?)\s*[-|]\s*(.+)$/);
      if (dash) {
        detail = dash[1].trim();
      }
    }

    const productName = cleanupProductName(detail);
    if (!productName) continue;
    out.push({ category, productName, sourcePrice });
  }

  const deduped: RecommendationLine[] = [];
  const seen = new Set<string>();
  for (const item of out) {
    const key = `${normalizeKey(item.category)}:${normalizeKey(item.productName)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 6);
}
