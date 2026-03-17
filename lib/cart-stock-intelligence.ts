import type { ClientCartItem } from "@/lib/client/cart-storage";
import type { UserContextSummary } from "@/lib/chat/context";
import type { ResolvedCartItemRow } from "@/components/order/cartItemsSection.view-model";
import type { CartProduct } from "@/components/order/cart.types";

type CartStockAction =
  | {
      type: "swap_option";
      label: string;
      helper: string;
      productId: number;
      fromOptionType: string;
      toOptionType: string;
    }
  | {
      type: "add_alternative";
      label: string;
      helper: string;
      item: ClientCartItem;
    }
  | {
      type: "bulk_change";
      label: string;
      helper: string;
      targetOptionKeyword: string;
    }
  | {
      type: "retry_pharmacy";
      label: string;
      helper: string;
    }
  | {
      type: "open_address";
      label: string;
      helper: string;
    }
  | {
      type: "consult";
      label: string;
      helper: string;
      href: string;
    };

export type CartStockRecovery = {
  pharmacyId: number | null;
  headline: string;
  lines: string[];
  replacedItems: Array<{
    productId: number;
    productName: string;
    fromOptionType: string;
    toOptionType: string;
    quantity: number;
  }>;
  removedItems: Array<{
    productId: number;
    productName: string;
    optionType: string;
    quantity: number;
    primaryTheme: string;
  }>;
};

export type CartStockIntelligenceModel = {
  tone: "amber" | "sky" | "emerald";
  badgeLabel: string;
  title: string;
  description: string;
  recoveryLines: string[];
  riskLines: string[];
  pathLines: string[];
  actions: CartStockAction[];
};

function normalizeText(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, "").toLowerCase();
}

function uniqueStrings(items: string[], limit = items.length) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function resolvePharmacyId(productOption: {
  pharmacyId?: number | null;
  pharmacy?: { id?: number } | null;
}) {
  return productOption.pharmacyId ?? productOption.pharmacy?.id ?? null;
}

function parseOptionDays(optionType: string | null | undefined) {
  const text = normalizeText(optionType);
  if (!text) return null;
  const directMatch = text.match(/(\d+)\s*일/);
  if (directMatch) return Number.parseInt(directMatch[1], 10);
  if (text.includes("일반")) return 30;
  return null;
}

function buildChatHref(prompt: string) {
  const query = new URLSearchParams();
  query.set("from", "/cart");
  query.set("draft", prompt);
  return `/chat?${query.toString()}`;
}

function getPrimaryTheme(product: CartProduct | undefined) {
  const firstCategory = product?.categories?.find((category) =>
    normalizeText(category?.name)
  );
  return normalizeText(firstCategory?.name) || "지금 목적";
}

function findProductById(products: CartProduct[], productId: number) {
  return products.find((product) => product.id === productId);
}

function buildOptionRecoveryReason(
  fromOptionType: string,
  toOptionType: string,
  productName: string
) {
  const fromDays = parseOptionDays(fromOptionType);
  const toDays = parseOptionDays(toOptionType);

  if (
    typeof fromDays === "number" &&
    typeof toDays === "number" &&
    toDays < fromDays
  ) {
    return `${productName}은 ${fromOptionType} 대신 ${toOptionType}로 낮춰서 같은 목적은 유지하고 시작 부담은 줄였어요.`;
  }

  if (
    typeof fromDays === "number" &&
    typeof toDays === "number" &&
    toDays > fromDays
  ) {
    return `${productName}은 ${fromOptionType} 재고가 끊겨 ${toOptionType}로 이어 두었어요.`;
  }

  return `${productName}은 ${fromOptionType} 대신 지금 바로 담을 수 있는 ${toOptionType}로 이어 두었어요.`;
}

function scoreOptionDistance(
  currentOptionType: string,
  candidateOptionType: string
) {
  const currentDays = parseOptionDays(currentOptionType);
  const candidateDays = parseOptionDays(candidateOptionType);

  if (typeof currentDays === "number" && typeof candidateDays === "number") {
    return Math.abs(currentDays - candidateDays);
  }

  if (normalizeKey(currentOptionType) === normalizeKey(candidateOptionType)) {
    return 0;
  }

  return Number.POSITIVE_INFINITY;
}

function findBestSameProductOption(input: {
  product: CartProduct | undefined;
  selectedPharmacyId: number | null;
  currentOptionType: string;
  quantity: number;
}) {
  const { product, selectedPharmacyId, currentOptionType, quantity } = input;
  if (!product?.pharmacyProducts?.length || !selectedPharmacyId) return null;

  const options = product.pharmacyProducts
    .filter((option) => resolvePharmacyId(option) === selectedPharmacyId)
    .filter((option) => Number(option.stock) >= quantity)
    .filter(
      (option) => normalizeKey(option.optionType) !== normalizeKey(currentOptionType)
    )
    .sort((left, right) => {
      const distanceGap =
        scoreOptionDistance(currentOptionType, left.optionType) -
        scoreOptionDistance(currentOptionType, right.optionType);
      if (distanceGap !== 0) return distanceGap;

      const leftDays = parseOptionDays(left.optionType) ?? Number.POSITIVE_INFINITY;
      const rightDays =
        parseOptionDays(right.optionType) ?? Number.POSITIVE_INFINITY;
      if (leftDays !== rightDays) return leftDays - rightDays;

      return Number(left.price) - Number(right.price);
    });

  return options[0] ?? null;
}

function findPurposeAlternative(input: {
  removedProductId: number;
  removedTheme: string;
  allProducts: CartProduct[];
  selectedPharmacyId: number | null;
  cartItems: ClientCartItem[];
  preferredThemes: string[];
}) {
  if (!input.selectedPharmacyId) return null;

  const cartKeys = new Set(
    input.cartItems.map(
      (item) => `${item.productId}:${normalizeKey(item.optionType)}`
    )
  );

  const candidates = input.allProducts
    .filter((product) => product.id !== input.removedProductId)
    .map((product) => {
      const primaryTheme = getPrimaryTheme(product);
      const option = (product.pharmacyProducts || [])
        .filter(
          (item) =>
            resolvePharmacyId(item) === input.selectedPharmacyId &&
            Number(item.stock) > 0
        )
        .sort((left, right) => {
          const leftDays =
            parseOptionDays(left.optionType) ?? Number.POSITIVE_INFINITY;
          const rightDays =
            parseOptionDays(right.optionType) ?? Number.POSITIVE_INFINITY;
          if (leftDays !== rightDays) return leftDays - rightDays;
          return Number(left.price) - Number(right.price);
        })[0];

      if (!option?.optionType) return null;

      const cartKey = `${product.id}:${normalizeKey(option.optionType)}`;
      if (cartKeys.has(cartKey)) return null;

      const themeMatch =
        normalizeKey(primaryTheme) === normalizeKey(input.removedTheme) ? 3 : 0;
      const preferredMatch = input.preferredThemes.some((theme) => {
        const preferred = normalizeKey(theme);
        const current = normalizeKey(primaryTheme);
        return (
          preferred.includes(current) ||
          current.includes(preferred) ||
          preferred.includes(normalizeKey(input.removedTheme))
        );
      })
        ? 2
        : 0;

      return {
        product,
        optionType: option.optionType,
        theme: primaryTheme,
        score: themeMatch + preferredMatch,
      };
    })
    .filter(
      (
        candidate
      ): candidate is {
        product: CartProduct;
        optionType: string;
        theme: string;
        score: number;
      } => candidate !== null
    )
    .sort((left, right) => right.score - left.score);

  return candidates[0] ?? null;
}

export function recoverCartItemsForPharmacy(input: {
  cartItems: ClientCartItem[];
  allProducts: CartProduct[];
  selectedPharmacyId: number | null;
}) {
  const nextItems: ClientCartItem[] = [];
  const replacedItems: CartStockRecovery["replacedItems"] = [];
  const removedItems: CartStockRecovery["removedItems"] = [];

  for (const item of input.cartItems) {
    const product = findProductById(input.allProducts, item.productId);
    const exactOption = product?.pharmacyProducts?.find(
      (option) =>
        resolvePharmacyId(option) === input.selectedPharmacyId &&
        normalizeKey(option.optionType) === normalizeKey(item.optionType) &&
        Number(option.stock) >= item.quantity
    );

    if (exactOption?.optionType) {
      nextItems.push(item);
      continue;
    }

    const bestOption = findBestSameProductOption({
      product,
      selectedPharmacyId: input.selectedPharmacyId,
      currentOptionType: item.optionType,
      quantity: item.quantity,
    });

    if (bestOption?.optionType) {
      nextItems.push({
        ...item,
        optionType: bestOption.optionType,
        productName: product?.name || item.productName,
      });
      replacedItems.push({
        productId: item.productId,
        productName: product?.name || item.productName,
        fromOptionType: item.optionType,
        toOptionType: bestOption.optionType,
        quantity: item.quantity,
      });
      continue;
    }

    removedItems.push({
      productId: item.productId,
      productName: product?.name || item.productName,
      optionType: item.optionType,
      quantity: item.quantity,
      primaryTheme: getPrimaryTheme(product),
    });
  }

  const changed = replacedItems.length > 0 || removedItems.length > 0;
  if (!changed) {
    return {
      changed: false,
      updatedItems: input.cartItems,
      recovery: null as CartStockRecovery | null,
    };
  }

  const lines = uniqueStrings(
    [
      ...replacedItems.map((item) =>
        buildOptionRecoveryReason(
          item.fromOptionType,
          item.toOptionType,
          item.productName
        )
      ),
      ...removedItems.map(
        (item) =>
          `${item.productName} ${item.optionType}은 선택한 약국에서 바로 이어지지 않아 장바구니에서 잠시 뺐어요.`
      ),
    ],
    5
  );

  return {
    changed: true,
    updatedItems: nextItems,
    recovery: {
      pharmacyId: input.selectedPharmacyId,
      headline:
        removedItems.length > 0
          ? "재고 때문에 흐름이 끊기지 않게 가능한 옵션은 이어 두고, 안 되는 항목만 분리했어요."
          : "재고가 맞지 않는 옵션은 같은 목적의 가능한 옵션으로 먼저 이어 두었어요.",
      lines,
      replacedItems,
      removedItems,
    } satisfies CartStockRecovery,
  };
}

export function buildCartStockIntelligenceModel(input: {
  rows: ResolvedCartItemRow[];
  cartItems: ClientCartItem[];
  allProducts: CartProduct[];
  selectedPharmacyId: number | null;
  summary: UserContextSummary | null | undefined;
  recovery: CartStockRecovery | null | undefined;
  isAddressMissing?: boolean;
}) {
  const summary = input.summary;
  const recovery = input.recovery;
  const lowStockRows = input.rows.filter((row) => {
    const stock = Number(row.pharmacyProduct.stock);
    return Number.isFinite(stock) && stock > 0 && stock - row.item.quantity <= 1;
  });

  const lowStockAction = lowStockRows
    .map((row) => {
      const nextOption = findBestSameProductOption({
        product: row.product,
        selectedPharmacyId: input.selectedPharmacyId,
        currentOptionType: row.item.optionType,
        quantity: row.item.quantity,
      });
      if (!nextOption?.optionType) return null;

      return {
        type: "swap_option" as const,
        label: `${row.product.name}은 ${nextOption.optionType}로 먼저 이어보기`,
        helper:
          "같은 상품 안에서 재고가 더 안정적인 옵션으로 바꾸면 결제 직전 품절로 멈출 가능성을 줄일 수 있어요.",
        productId: row.item.productId,
        fromOptionType: row.item.optionType,
        toOptionType: nextOption.optionType,
      };
    })
    .find(Boolean);

  const removedAlternative = recovery?.removedItems[0]
    ? findPurposeAlternative({
        removedProductId: recovery.removedItems[0].productId,
        removedTheme: recovery.removedItems[0].primaryTheme,
        allProducts: input.allProducts,
        selectedPharmacyId: input.selectedPharmacyId,
        cartItems: input.cartItems,
        preferredThemes: summary?.recommendedNutrients || [],
      })
    : null;

  const actions: CartStockAction[] = [];
  if (lowStockAction) {
    actions.push(lowStockAction);
  }

  if (removedAlternative) {
    actions.push({
      type: "add_alternative",
      label: `${removedAlternative.theme} 목적 대체안 같이 담기`,
      helper: `${recovery?.removedItems[0]?.productName || "빠진 상품"} 대신 지금 약국에서 바로 이어질 수 있는 비슷한 목적의 후보예요.`,
      item: {
        productId: removedAlternative.product.id,
        productName: removedAlternative.product.name,
        optionType: removedAlternative.optionType,
        quantity: 1,
      },
    });
  }

  if (
    input.rows.length >= 2 &&
    input.rows.some((row) => {
      const days = parseOptionDays(row.pharmacyProduct.optionType);
      return typeof days === "number" && days >= 30;
    })
  ) {
    actions.push({
      type: "bulk_change",
      label: "7일치 중심으로 가볍게 다시 맞추기",
      helper:
        "재고가 흔들릴 때는 긴 옵션보다 짧은 옵션으로 먼저 시작하는 쪽이 끊김이 적어요.",
      targetOptionKeyword: "7",
    });
  }

  if (recovery?.removedItems.length) {
    actions.push(
      input.isAddressMissing
        ? {
            type: "open_address",
            label: "주소 다시 입력하고 다른 약국 보기",
            helper:
              "지금 주소가 없으면 다른 약국 재고 비교가 막혀요. 주소를 먼저 넣으면 복구 경로가 넓어져요.",
          }
        : {
            type: "retry_pharmacy",
            label: "다른 약국 재고 다시 보기",
            helper:
              "빠진 항목이 있다면 같은 구성도 약국을 다시 잡아 보면 이어질 수 있어요.",
          }
    );
  }

  const consultPrompt =
    recovery?.removedItems.length || summary?.safetyEscalation.level !== "routine"
      ? `내 장바구니에서 ${
          recovery?.removedItems[0]?.productName || "빠진 상품"
        }이 재고 문제로 빠졌어. 내 목적과 복용 맥락 기준으로 지금 바로 이어갈 수 있는 대체안 1~2개와 주의할 점만 짧게 정리해줘.`
      : "";
  if (consultPrompt) {
    actions.push({
      type: "consult",
      label: "약사에게 목적 기준 대체안 묻기",
      helper:
        "무작정 비슷한 상품을 더하기보다 지금 목적과 복용 맥락을 같이 보고 좁히는 쪽이 안전해요.",
      href: buildChatHref(consultPrompt),
    });
  }

  const recoveryLines = uniqueStrings(recovery?.lines || [], 4);
  const riskLines = uniqueStrings(
    [
      ...lowStockRows.map(
        (row) =>
          `${row.product.name} ${row.pharmacyProduct.optionType}은 남은 재고가 ${row.pharmacyProduct.stock}개라 결제 직전 끊길 가능성을 먼저 보는 편이 좋아요.`
      ),
      recovery?.removedItems.length
        ? `${recovery.removedItems
            .slice(0, 2)
            .map((item) => item.primaryTheme)
            .join(", ")} 목적은 재고 문제로 바로 끊기기 쉬워 다른 경로를 같이 준비해 두는 편이 안전해요.`
        : "",
    ],
    3
  );

  const pathLines = uniqueStrings(
    [
      removedAlternative
        ? `${removedAlternative.theme} 목적은 지금 약국에서도 이어질 후보가 있어 흐름을 완전히 끊지 않아도 돼요.`
        : "",
      recovery?.removedItems.length
        ? "같은 약국이 꼭 맞지 않으면 주소를 다시 보고 약국을 다시 잡는 편이 목적 유지에 더 유리할 수 있어요."
        : "",
      summary?.explainability.fitReasons[0] || "",
    ],
    3
  );

  if (
    recoveryLines.length === 0 &&
    riskLines.length === 0 &&
    pathLines.length === 0 &&
    actions.length === 0
  ) {
    return null;
  }

  const tone =
    summary?.safetyEscalation.level === "escalate"
      ? "amber"
      : recovery?.removedItems.length
      ? "amber"
      : lowStockRows.length > 0
      ? "sky"
      : "emerald";

  const title = recovery?.removedItems.length
    ? "재고 때문에 빠진 항목이 있어도 목적까지 같이 끊기지 않게 다시 이어볼 수 있어요."
    : lowStockRows.length > 0
    ? "지금 약국 재고 기준으로는 몇 가지를 더 가볍게 바꾸면 끊김을 줄일 수 있어요."
    : "재고가 흔들려도 지금 목적은 다른 경로로 이어갈 수 있어요.";

  const description = recovery?.headline
    ? recovery.headline
    : lowStockRows.length > 0
    ? "품절 문구로 끝내기보다, 같은 목적 안에서 먼저 이어질 옵션과 경로를 같이 보여드릴게요."
    : "재고 문제는 그대로 손실로 넘기지 않고, 목적 중심으로 대체 경로를 먼저 정리하는 편이 전환 손실이 적어요.";

  return {
    tone,
    badgeLabel: "재고 · 대체안 인텔리전스",
    title,
    description,
    recoveryLines,
    riskLines,
    pathLines,
    actions: actions.slice(0, 4),
  } satisfies CartStockIntelligenceModel;
}
