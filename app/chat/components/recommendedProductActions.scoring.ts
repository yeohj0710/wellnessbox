import {
  isExact7DayOption,
  normalizeKey,
  toSevenDayPrice,
} from "./recommendedProductActions.shared";
import type {
  ActionableRecommendation,
  CartProductItem,
  ProductIdScore,
  RecommendationLineMatch,
} from "./recommendedProductActions.types";

type CartOptionPick = {
  optionType: string;
  capacity: string | null;
  packagePrice: number;
  sevenDayPrice: number;
};

type PickedCandidate = {
  candidate: ProductIdScore;
  product: CartProductItem;
  option: CartOptionPick;
  score: number;
};

async function fetchCartProducts(ids: number[]) {
  const response = await fetch("/api/cart-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.products) ? (json.products as CartProductItem[]) : [];
}

function pickBestCartOption(product: CartProductItem): CartOptionPick | null {
  const options = Array.isArray(product?.pharmacyProducts)
    ? product.pharmacyProducts
        .map((item) => ({
          price: typeof item?.price === "number" ? item.price : null,
          optionType:
            typeof item?.optionType === "string" ? item.optionType.trim() : null,
          capacity: typeof item?.capacity === "string" ? item.capacity.trim() : null,
          stock: typeof item?.stock === "number" ? item.stock : 0,
        }))
        .filter((item) => item.price != null && item.price > 0 && item.stock > 0)
        .filter((item) => Boolean(item.optionType))
    : [];

  if (!options.length) return null;

  const exact7 = options
    .filter((item) => isExact7DayOption(item.optionType, item.capacity))
    .sort((left, right) => (left.price as number) - (right.price as number))[0];

  if (exact7) {
    return {
      optionType: exact7.optionType as string,
      capacity: exact7.capacity,
      packagePrice: exact7.price as number,
      sevenDayPrice: exact7.price as number,
    };
  }

  const cheapest = [...options].sort(
    (left, right) => (left.price as number) - (right.price as number)
  )[0];

  return {
    optionType: cheapest.optionType as string,
    capacity: cheapest.capacity,
    packagePrice: cheapest.price as number,
    sevenDayPrice: toSevenDayPrice({
      price: cheapest.price as number,
      optionType: cheapest.optionType,
      capacity: cheapest.capacity,
    }),
  };
}

function scorePriceSimilarity(sourcePrice: number | null, targetPrice: number) {
  if (sourcePrice == null || sourcePrice <= 0) return 0;
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return -1_500;

  const diffRatio = Math.abs(sourcePrice - targetPrice) / sourcePrice;
  return Math.max(-2_200, 1_500 - Math.round(diffRatio * 2_400));
}

function pickBestCandidateByLine(
  lineMatch: RecommendationLineMatch,
  productById: Map<number, CartProductItem>
): PickedCandidate | null {
  let picked: PickedCandidate | null = null;

  for (const candidate of lineMatch.candidates) {
    const product = productById.get(candidate.id);
    if (!product || !product.name) continue;
    const option = pickBestCartOption(product);
    if (!option) continue;

    const score =
      candidate.score +
      scorePriceSimilarity(lineMatch.line.sourcePrice, option.sevenDayPrice);
    if (!picked || score > picked.score) {
      picked = {
        candidate,
        product,
        option,
        score,
      };
    }
  }

  return picked;
}

export async function buildResolvedRecommendations(
  lineMatches: RecommendationLineMatch[]
) {
  if (!lineMatches.length) return [];

  const ids = Array.from(
    new Set(
      lineMatches.flatMap((item) => item.candidates.map((candidate) => candidate.id))
    )
  );
  const products = await fetchCartProducts(ids);
  const productById = new Map(products.map((item) => [item.id, item]));

  const out: ActionableRecommendation[] = [];

  for (const lineMatch of lineMatches) {
    const picked = pickBestCandidateByLine(lineMatch, productById);
    if (!picked) continue;

    out.push({
      category: lineMatch.line.category,
      sourceCategory: lineMatch.line.category,
      sourceProductName: lineMatch.line.productName,
      productId: picked.product.id,
      productName: picked.product.name,
      optionType: picked.option.optionType,
      capacity: picked.option.capacity,
      packagePrice: picked.option.packagePrice,
      sevenDayPrice: picked.option.sevenDayPrice,
      sourcePrice: lineMatch.line.sourcePrice,
    });
  }

  return out;
}

export function dedupeRecommendationsByProductOption(
  recommendations: ActionableRecommendation[],
  take = 6
) {
  const deduped: ActionableRecommendation[] = [];
  const seen = new Set<string>();

  for (const item of recommendations) {
    const key = `${item.productId}:${normalizeKey(item.optionType)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, take);
}
