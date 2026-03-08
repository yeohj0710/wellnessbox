export type CategoryOption = {
  id: number;
  name: string;
  image?: string | null;
  updatedAt?: string | Date;
  _count?: {
    products?: number;
  };
};

export type ProductRecord = {
  id: number;
  name: string | null;
  description?: string | null;
  images: string[];
  updatedAt?: string | Date;
  categories: CategoryOption[];
  _count?: {
    pharmacyProducts?: number;
  };
};

export type ProductDraft = {
  id?: number;
  name: string;
  description: string;
  images: string[];
  categories: CategoryOption[];
};

export const PRODUCT_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "이름순", value: "name" },
  { label: "카테고리 많은 순", value: "category-count" },
  { label: "약국 연결 많은 순", value: "linked-count" },
] as const;

export type ProductSortValue = (typeof PRODUCT_SORT_OPTIONS)[number]["value"];

export function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createEmptyDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    images: [],
    categories: [],
  };
}

export function getVisibleProducts({
  products,
  keyword,
  sortValue,
}: {
  products: ProductRecord[];
  keyword: string;
  sortValue: ProductSortValue;
}) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = products.filter((product) => {
    if (!normalizedKeyword) return true;
    const haystack = [
      product.name || "",
      product.description || "",
      product.categories.map((category) => category.name).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedKeyword);
  });

  return [...filtered].sort((left, right) => {
    if (sortValue === "name") {
      return (left.name || "").localeCompare(right.name || "", "ko");
    }
    if (sortValue === "category-count") {
      return right.categories.length - left.categories.length;
    }
    if (sortValue === "linked-count") {
      return (right._count?.pharmacyProducts || 0) - (left._count?.pharmacyProducts || 0);
    }
    return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
  });
}

export function getVisibleCategories({
  categories,
  keyword,
}: {
  categories: CategoryOption[];
  keyword: string;
}) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = categories.filter((category) =>
    !normalizedKeyword ? true : category.name.toLowerCase().includes(normalizedKeyword)
  );

  return filtered.sort((left, right) => left.name.localeCompare(right.name, "ko"));
}
