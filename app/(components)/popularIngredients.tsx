"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CatalogSectionEmptyState from "./catalogSectionEmptyState";
import Skeleton from "./skeleton";
import { sortByImportanceDesc } from "@/lib/utils";
import { fetchCategories } from "@/lib/client/categories";
import { shouldBypassNextImageOptimizer } from "@/lib/shared/image";

type PopularCategory = {
  id?: number | null;
  name: string;
  image?: string | null;
  importance?: number | null;
};

interface PopularIngredientsProps {
  onSelectCategory: (target: number | string) => void;
  onCategoryIntent?: (target: number | string) => void;
  initialCategories?: PopularCategory[];
}

const FALLBACK_POPULAR_CATEGORIES: PopularCategory[] = [
  { name: "비타민C", importance: 100 },
  { name: "오메가3", importance: 99 },
  { name: "루테인", importance: 98 },
  { name: "비타민D", importance: 97 },
  { name: "프로바이오틱스(유산균)", importance: 96 },
  { name: "마그네슘", importance: 95 },
];

function readCachedPopularCategories(): PopularCategory[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("categories");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is PopularCategory =>
        !!item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        item.name.trim().length > 0
    );
  } catch {
    return [];
  }
}

function resolveInitialPopularCategories(initialCategories: PopularCategory[]) {
  if (initialCategories.length > 0) {
    return sortByImportanceDesc(initialCategories);
  }

  const cached = sortByImportanceDesc(readCachedPopularCategories());
  if (cached.length > 0) return cached;

  return sortByImportanceDesc(FALLBACK_POPULAR_CATEGORIES);
}

export default function PopularIngredients({
  onSelectCategory,
  onCategoryIntent,
  initialCategories = [],
}: PopularIngredientsProps) {
  const [categories, setCategories] = useState<PopularCategory[]>(() =>
    resolveInitialPopularCategories(initialCategories)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pressedCategoryId, setPressedCategoryId] = useState<number | null>(
    null
  );
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIntentTimer = () => {
    if (!intentTimerRef.current) return;
    clearTimeout(intentTimerRef.current);
    intentTimerRef.current = null;
  };

  const scheduleCategoryIntent = (category: PopularCategory) => {
    if (!onCategoryIntent) return;
    clearIntentTimer();
    intentTimerRef.current = setTimeout(() => {
      onCategoryIntent(category.id ?? category.name);
      intentTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(sortByImportanceDesc(initialCategories));
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const fetched = await fetchCategories(controller.signal);
        if (controller.signal.aborted) return;
        if (fetched.length > 0) {
          setCategories(sortByImportanceDesc(fetched));
        }
      } catch {
        if (controller.signal.aborted) return;
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [initialCategories]);

  useEffect(() => clearIntentTimer, []);

  const hasVisibleCategories = categories.length > 0;

  return (
    <section className="mx-auto mt-8 w-full max-w-[640px]">
      <div className="px-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] bg-clip-text text-transparent">
            인기 성분
          </span>
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} />
            ))}
        </div>
      ) : hasVisibleCategories ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {categories.map((category, index) => (
              <button
                key={category.id ?? category.name}
                onPointerEnter={() => scheduleCategoryIntent(category)}
                onMouseEnter={() => scheduleCategoryIntent(category)}
                onFocus={() => onCategoryIntent?.(category.id ?? category.name)}
                onPointerLeave={clearIntentTimer}
                onMouseLeave={clearIntentTimer}
                onBlur={clearIntentTimer}
                onClick={() => {
                  clearIntentTimer();
                  if (typeof category.id === "number") {
                    setPressedCategoryId(category.id);
                  }
                  onSelectCategory(category.id ?? category.name);
                }}
                className={`group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_6px_20px_rgba(67,103,230,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(67,103,230,0.18)] focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]/50 ${
                  typeof category.id === "number" &&
                  pressedCategoryId === category.id
                    ? "scale-[0.99] ring-[#6C4DFF]/60"
                    : ""
                }`}
              >
                <div className="relative aspect-[4/3] w-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4568F5]/0 via-[#6C4DFF]/0 to-[#6C4DFF]/0 opacity-0 transition-opacity group-hover:opacity-10" />
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name || "Category"}
                      fill
                      sizes="512px"
                      unoptimized={shouldBypassNextImageOptimizer(
                        category.image
                      )}
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(108,77,255,0.12),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 text-center">
                      <span className="text-sm font-semibold text-slate-500">
                        {category.name}
                      </span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                    #{index + 1}
                  </span>
                </div>

                <div className="px-3 pb-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6C4DFF] opacity-70 transition-opacity group-hover:opacity-100" />
                    <span className="text-[11px] text-gray-500">
                      클릭하여 제품 보기
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 bg-gradient-to-t from-[#6C4DFF]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
        </div>
      ) : (
        <CatalogSectionEmptyState
          badge="INGREDIENT NOTICE"
          title="지금은 인기 성분 구성을 따로 보여드리고 있지 않아요"
          description="판매 구성을 다시 여는 동안에는 인기 성분 목록 대신 빠른 검사와 추천 흐름부터 가볍게 둘러보실 수 있어요."
        />
      )}
    </section>
  );
}
