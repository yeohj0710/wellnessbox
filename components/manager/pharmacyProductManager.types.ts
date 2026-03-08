export type PharmacySummary = {
  id: number;
  name: string;
};

export type ProductSummary = {
  id: number;
  name: string;
};

export type PharmacyProductRecord = {
  id: number;
  optionType: string | null;
  capacity: string | null;
  price: number | null;
  stock: number | null;
  updatedAt?: string | Date;
  pharmacy: PharmacySummary | null;
  product: {
    id: number;
    name: string;
    images: string[];
    categories: Array<{ name: string }>;
  } | null;
};

export type PharmacyProductDraft = {
  id?: number;
  pharmacyId: number | null;
  productId: number | null;
  optionType: string;
  capacity: string;
  price: number | "";
  stock: number | "";
};

export const PHARMACY_PRODUCT_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "상품명순", value: "name" },
  { label: "가격 높은 순", value: "price-high" },
  { label: "재고 적은 순", value: "stock-low" },
  { label: "약국명순", value: "pharmacy" },
] as const;

export type PharmacyProductSortValue = (typeof PHARMACY_PRODUCT_SORT_OPTIONS)[number]["value"];

export const PHARMACY_OPTION_TYPE_OPTIONS = ["7일 패키지", "30일 패키지", "일반 상품"] as const;

export function createEmptyDraft(pharmacyId?: number | null): PharmacyProductDraft {
  return {
    pharmacyId: pharmacyId ?? null,
    productId: null,
    optionType: "일반 상품",
    capacity: "",
    price: "",
    stock: "",
  };
}

function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getVisiblePharmacyProducts({
  pharmacyProducts,
  keyword,
  sortValue,
  pharmacyFilter,
}: {
  pharmacyProducts: PharmacyProductRecord[];
  keyword: string;
  sortValue: PharmacyProductSortValue;
  pharmacyFilter: number | "all";
}) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = pharmacyProducts.filter((item) => {
    if (pharmacyFilter !== "all" && item.pharmacy?.id !== pharmacyFilter) {
      return false;
    }
    if (!normalizedKeyword) return true;

    const haystack = [
      item.product?.name || "",
      item.pharmacy?.name || "",
      item.optionType || "",
      item.capacity || "",
      item.product?.categories.map((category) => category.name).join(" ") || "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedKeyword);
  });

  return [...filtered].sort((left, right) => {
    if (sortValue === "name") {
      return (left.product?.name || "").localeCompare(right.product?.name || "", "ko");
    }
    if (sortValue === "price-high") {
      return (right.price || 0) - (left.price || 0);
    }
    if (sortValue === "stock-low") {
      return (left.stock ?? Number.MAX_SAFE_INTEGER) - (right.stock ?? Number.MAX_SAFE_INTEGER);
    }
    if (sortValue === "pharmacy") {
      return (left.pharmacy?.name || "").localeCompare(right.pharmacy?.name || "", "ko");
    }
    return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
  });
}

export function getSelectableProducts({
  products,
  keyword,
}: {
  products: ProductSummary[];
  keyword: string;
}) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = products.filter((product) =>
    !normalizedKeyword ? true : product.name.toLowerCase().includes(normalizedKeyword)
  );

  return filtered.sort((left, right) => left.name.localeCompare(right.name, "ko"));
}
