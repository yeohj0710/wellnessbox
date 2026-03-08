export type CategoryRecord = {
  id: number;
  name: string;
  image?: string | null;
  updatedAt?: string | Date;
  _count?: {
    products?: number;
  };
};

export type CategoryDraft = {
  id?: number;
  name: string;
  image?: string | null;
};

export const CATEGORY_SORT_OPTIONS = [
  { label: "최신 수정순", value: "recent" },
  { label: "이름순", value: "name" },
  { label: "상품 연결 많은 순", value: "linked-count" },
  { label: "이미지 보유 우선", value: "image-first" },
] as const;

export type CategorySortValue = (typeof CATEGORY_SORT_OPTIONS)[number]["value"];

export function createEmptyDraft(): CategoryDraft {
  return {
    name: "",
    image: null,
  };
}

function toDateValue(value: string | Date | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getVisibleCategories({
  categories,
  keyword,
  sortValue,
}: {
  categories: CategoryRecord[];
  keyword: string;
  sortValue: CategorySortValue;
}) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = categories.filter((category) =>
    !normalizedKeyword ? true : category.name.toLowerCase().includes(normalizedKeyword)
  );

  return [...filtered].sort((left, right) => {
    if (sortValue === "name") {
      return left.name.localeCompare(right.name, "ko");
    }
    if (sortValue === "linked-count") {
      return (right._count?.products || 0) - (left._count?.products || 0);
    }
    if (sortValue === "image-first") {
      return Number(Boolean(right.image)) - Number(Boolean(left.image));
    }
    return toDateValue(right.updatedAt) - toDateValue(left.updatedAt);
  });
}
