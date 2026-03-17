import { CATEGORY_LABELS, INTEREST_LABELS } from "@/lib/categories";
import type { ClientCartItem } from "@/lib/client/cart-storage";
import type { ResolvedCartItemRow } from "@/components/order/cartItemsSection.view-model";
import type { CartProduct } from "@/components/order/cart.types";

type CartIntelligenceAction =
  | {
      type: "remove_overlap";
      label: string;
      helper: string;
      productId: number;
      optionType: string;
    }
  | {
      type: "add_complement";
      label: string;
      helper: string;
      item: ClientCartItem;
    }
  | {
      type: "starterize";
      label: string;
      helper: string;
      targetOptionKeyword: string;
    };

export type CartIntelligenceSummary = {
  stageLabel: string;
  headline: string;
  description: string;
  themes: string[];
  risks: string[];
  actions: CartIntelligenceAction[];
};

const INTEREST_LABEL_BY_CATEGORY = new Map<string, string>(
  Object.entries(CATEGORY_LABELS).map(([key, label]) => [
    label,
    INTEREST_LABELS[key as keyof typeof INTEREST_LABELS],
  ])
);

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseOptionDays(optionType: string | null | undefined) {
  const text = normalizeText(optionType);
  if (!text) return null;
  const match = text.match(/(\d+)\s*(일|정)/);
  if (match) return Number.parseInt(match[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function getProductThemes(product: CartProduct) {
  const themes = (product.categories || [])
    .map((category) => {
      const name = normalizeText(category.name);
      return INTEREST_LABEL_BY_CATEGORY.get(name) || name;
    })
    .filter(Boolean);

  return Array.from(new Set(themes));
}

function getPrimaryTheme(product: CartProduct) {
  return getProductThemes(product)[0] || "기초 영양";
}

function resolvePharmacyId(productOption: {
  pharmacyId?: number | null;
  pharmacy?: { id?: number } | null;
}) {
  return productOption.pharmacyId ?? productOption.pharmacy?.id;
}

function pickCandidateOptionType(
  product: CartProduct,
  selectedPharmacyId: number | null | undefined,
  preferredKeyword: string | null
) {
  const options = (product.pharmacyProducts || []).filter((option) =>
    selectedPharmacyId
      ? resolvePharmacyId(option) === selectedPharmacyId && Number(option.stock) > 0
      : Number(option.stock) > 0
  );
  if (options.length === 0) return null;

  if (preferredKeyword) {
    const exact = options.find((option) =>
      normalizeText(option.optionType).includes(preferredKeyword)
    );
    if (exact?.optionType) return exact.optionType;
  }

  const sorted = [...options].sort((left, right) => {
    const leftDays = parseOptionDays(left.optionType) ?? Number.POSITIVE_INFINITY;
    const rightDays = parseOptionDays(right.optionType) ?? Number.POSITIVE_INFINITY;
    if (leftDays !== rightDays) return leftDays - rightDays;
    return left.price - right.price;
  });

  return sorted[0]?.optionType || null;
}

export function buildCartIntelligenceSummary(input: {
  rows: ResolvedCartItemRow[];
  allProducts: CartProduct[];
  selectedPharmacyId: number | null | undefined;
}): CartIntelligenceSummary | null {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) return null;

  const themes = rows.map((row) => getPrimaryTheme(row.product));
  const themeCounts = themes.reduce<Map<string, number>>((acc, theme) => {
    acc.set(theme, (acc.get(theme) || 0) + 1);
    return acc;
  }, new Map());
  const uniqueThemes = Array.from(new Set(themes));
  const optionDays = rows
    .map((row) => parseOptionDays(row.pharmacyProduct.optionType))
    .filter((value): value is number => typeof value === "number");
  const preferredKeyword =
    optionDays.some((days) => days <= 7) ? "7" : optionDays.some((days) => days >= 30) ? "30" : null;

  const duplicateThemeEntry =
    Array.from(themeCounts.entries()).sort((left, right) => right[1] - left[1])[0] || null;
  const duplicateTheme =
    duplicateThemeEntry && duplicateThemeEntry[1] >= 2 ? duplicateThemeEntry[0] : null;
  const duplicateRows = duplicateTheme
    ? rows.filter((row) => getPrimaryTheme(row.product) === duplicateTheme)
    : [];
  const duplicateRowToRemove =
    duplicateRows.length >= 2
      ? [...duplicateRows].sort((left, right) => {
          const leftDays = parseOptionDays(left.pharmacyProduct.optionType) ?? 0;
          const rightDays = parseOptionDays(right.pharmacyProduct.optionType) ?? 0;
          if (leftDays !== rightDays) return rightDays - leftDays;
          return right.pharmacyProduct.price - left.pharmacyProduct.price;
        })[0]
      : null;

  const hasLongPackage = rows.some((row) => {
    const days = parseOptionDays(row.pharmacyProduct.optionType);
    return (typeof days === "number" && days >= 30) || normalizeText(row.pharmacyProduct.optionType).includes("일반");
  });

  const cartKeys = new Set(
    rows.map((row) => `${row.item.productId}:${normalizeText(row.item.optionType)}`)
  );
  const complementCandidate = input.allProducts.find((product) => {
    if (!product?.id || !normalizeText(product.name)) return false;
    const productThemes = getProductThemes(product);
    if (productThemes.length === 0) return false;
    if (productThemes.some((theme) => uniqueThemes.includes(theme))) return false;

    const optionType = pickCandidateOptionType(
      product,
      input.selectedPharmacyId,
      preferredKeyword
    );
    if (!optionType) return false;

    return !cartKeys.has(`${product.id}:${normalizeText(optionType)}`);
  });

  const complementOptionType = complementCandidate
    ? pickCandidateOptionType(
        complementCandidate,
        input.selectedPharmacyId,
        preferredKeyword
      )
    : null;

  const stageLabel =
    rows.length <= 1
      ? "입문형 시작"
      : rows.length === 2 && uniqueThemes.length >= 2
      ? "균형형 구성"
      : "집중형 구성";

  const headline =
    duplicateTheme && duplicateRowToRemove
      ? `${duplicateTheme} 축이 겹쳐 보여서 한 번에 다 시작하기보다 우선순위를 나누는 편이 좋아요`
      : complementCandidate && complementOptionType
      ? `${getPrimaryTheme(complementCandidate)} 축을 한 가지 더 보완하면 구성이 더 또렷해져요`
      : hasLongPackage && rows.length >= 2
      ? "지금 구성은 시작 강도가 조금 높아서 7일치로 먼저 맞춰보는 편이 부담이 적어요"
      : "현재 장바구니는 목적이 비교적 분명해서 이 흐름대로 진행해도 괜찮아요";

  const description =
    duplicateTheme && duplicateRowToRemove
      ? `${duplicateTheme} 목적의 상품이 ${duplicateRows.length}개 들어 있어 처음 복용에서는 체감 구분이 흐려질 수 있어요. 우선 하나만 먼저 시작하고 다음 회차에 넓혀도 늦지 않아요.`
      : complementCandidate && complementOptionType
      ? `지금 구성은 ${uniqueThemes.join(", ")} 중심이에요. ${getPrimaryTheme(complementCandidate)} 축을 한 가지 더 붙이면 “한 가지 목적만 담았다”는 느낌을 줄이고 만족도가 더 안정적일 수 있어요.`
      : hasLongPackage && rows.length >= 2
      ? "여러 상품을 긴 옵션으로 바로 시작하면 첫 구매 부담이 커질 수 있어요. 입문 단계에서는 7일치로 반응을 보고 넓히는 쪽이 자연스러워요."
      : "목적 축이 크게 겹치지 않아 지금은 과한 중복보다 실행 가능성이 더 좋아 보이는 장바구니예요.";

  const risks: string[] = [];
  if (duplicateTheme && duplicateRowToRemove) {
    risks.push(`${duplicateTheme} 목적이 중복돼 체감이 겹칠 수 있어요.`);
  }
  if (hasLongPackage && rows.length >= 2) {
    risks.push("여러 상품을 긴 옵션으로 시작하면 첫 구매 부담이 커질 수 있어요.");
  }
  if (uniqueThemes.length === 1 && rows.length === 1) {
    risks.push("지금은 한 축만 담겨 있어 보완 여지가 커요.");
  }

  const actions: CartIntelligenceAction[] = [];
  if (duplicateTheme && duplicateRowToRemove) {
    actions.push({
      type: "remove_overlap",
      label: `${duplicateRowToRemove.product.name} 다음 회차로 미루기`,
      helper: `${duplicateTheme} 축 중복을 줄여 더 가볍게 시작해요.`,
      productId: duplicateRowToRemove.item.productId,
      optionType: duplicateRowToRemove.item.optionType,
    });
  }

  if (complementCandidate && complementOptionType) {
    actions.push({
      type: "add_complement",
      label: `${complementCandidate.name} 같이 담기`,
      helper: `${getPrimaryTheme(complementCandidate)} 축을 보완하는 제안이에요.`,
      item: {
        productId: complementCandidate.id,
        productName: complementCandidate.name,
        optionType: complementOptionType,
        quantity: 1,
      },
    });
  }

  if (hasLongPackage && rows.length >= 2) {
    actions.push({
      type: "starterize",
      label: "7일치로 가볍게 맞추기",
      helper: "입문형으로 낮춰 첫 시작 부담을 줄여요.",
      targetOptionKeyword: "7",
    });
  }

  return {
    stageLabel,
    headline,
    description,
    themes: uniqueThemes.slice(0, 4),
    risks: risks.slice(0, 3),
    actions: actions.slice(0, 3),
  };
}
