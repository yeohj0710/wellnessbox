"use client";

import type { ComponentType, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRightIcon,
  BeakerIcon,
  BoltIcon,
  EyeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import CatalogSectionEmptyState from "./catalogSectionEmptyState";
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

type PopularCategoryBootstrap = {
  categories: PopularCategory[];
  source: "initial" | "cache" | "fallback";
};

type IngredientPreviewVisual = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  caption: string;
  surfaceClassName: string;
  iconClassName: string;
};

type IngredientDisplayName = {
  primary: string;
  secondary?: string;
};

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

function resolveInitialPopularCategories(
  initialCategories: PopularCategory[]
): PopularCategoryBootstrap {
  if (initialCategories.length > 0) {
    return {
      categories: sortByImportanceDesc(initialCategories),
      source: "initial",
    };
  }

  const cached = sortByImportanceDesc(readCachedPopularCategories());
  if (cached.length > 0) {
    return {
      categories: cached,
      source: "cache",
    };
  }

  return {
    categories: sortByImportanceDesc(FALLBACK_POPULAR_CATEGORIES),
    source: "fallback",
  };
}

function getIngredientPreviewVisual(name: string): IngredientPreviewVisual {
  if (name.includes("루테인")) {
    return {
      icon: EyeIcon,
      caption: "눈 건강 루틴",
      surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F1F5FF_100%)]",
      iconClassName: "border-[#DCE4FF] bg-white text-[#5871F7]",
    };
  }

  if (name.includes("오메가")) {
    return {
      icon: SparklesIcon,
      caption: "데일리 밸런스",
      surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F0F4FF_100%)]",
      iconClassName: "border-[#DCE4FF] bg-white text-[#526BF4]",
    };
  }

  if (name.includes("비타민D")) {
    return {
      icon: SunIcon,
      caption: "햇빛 루틴",
      surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F2F5FF_100%)]",
      iconClassName: "border-[#DCE4FF] bg-white text-[#5D73F5]",
    };
  }

  if (name.includes("프로바이오틱스") || name.includes("유산균")) {
    return {
      icon: ShieldCheckIcon,
      caption: "편안한 데일리",
      surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F0F4FF_100%)]",
      iconClassName: "border-[#DCE4FF] bg-white text-[#5670F4]",
    };
  }

  if (name.includes("마그네슘")) {
    return {
      icon: BoltIcon,
      caption: "리듬 밸런스",
      surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F1F4FF_100%)]",
      iconClassName: "border-[#DCE4FF] bg-white text-[#4F68F4]",
    };
  }

  return {
    icon: BeakerIcon,
    caption: "기본 인기 성분",
    surfaceClassName: "bg-[linear-gradient(180deg,#FBFCFF_0%,#F1F4FF_100%)]",
    iconClassName: "border-[#DCE4FF] bg-white text-[#5470F5]",
  };
}

function getIngredientDisplayName(name: string): IngredientDisplayName {
  const trimmed = name.replace(/\s+/g, " ").trim();
  const withParentheses = trimmed.match(/^(.+?)\s*\((.+?)\)$/);

  if (withParentheses) {
    return {
      primary: withParentheses[1],
      secondary: withParentheses[2],
    };
  }

  const dotSeparated = trimmed
    .split(/[·/]/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (dotSeparated.length > 1) {
    return {
      primary: dotSeparated[0],
      secondary: dotSeparated.slice(1).join(" · "),
    };
  }

  return { primary: trimmed };
}

function PopularIngredientsLoadingCard({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#E5EBF8] bg-white shadow-[0_22px_44px_-36px_rgba(67,103,230,0.34)]">
      <div className="relative min-h-[13.5rem] overflow-hidden bg-[linear-gradient(180deg,#FCFDFF_0%,#F1F5FF_100%)] px-4 py-4">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(99,116,241,0.18),transparent_68%)]" />
        <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_14px_28px_-18px_rgba(76,93,198,0.72)]">
          #{index + 1}
        </div>
        <div className="ml-auto h-11 w-11 animate-pulse rounded-[1.1rem] bg-white ring-1 ring-[#E1E9FB]" />
        <div className="mt-10 h-3 w-24 animate-pulse rounded-full bg-white/90" />
        <div className="mt-4 h-11 w-32 animate-pulse rounded-[1rem] bg-white" />
        <div className="mt-2 h-5 w-20 animate-pulse rounded-full bg-white/80" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#E9EEF9] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 animate-pulse rounded-full bg-[#E9EEFF]" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-[#F1F4FF]" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-[#EEF2FF]" />
      </div>
    </div>
  );
}

export default function PopularIngredients({
  onSelectCategory,
  onCategoryIntent,
  initialCategories = [],
}: PopularIngredientsProps) {
  const [bootstrap] = useState<PopularCategoryBootstrap>(() =>
    resolveInitialPopularCategories(initialCategories)
  );
  const [categories, setCategories] = useState<PopularCategory[]>(() =>
    bootstrap.categories
  );
  const [isLoading, setIsLoading] = useState(bootstrap.source === "fallback");
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
    setIsLoading(bootstrap.source === "fallback");

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
  }, [bootstrap.source, initialCategories]);

  useEffect(() => clearIntentTimer, []);

  const hasVisibleCategories = categories.length > 0;
  const isPreviewMode =
    !isLoading &&
    hasVisibleCategories &&
    categories.every((category) => !category.image);

  return (
    <section className="w-full max-w-[640px] mx-auto mt-10">
      <div className="px-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#E5EBF8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,248,255,0.96))] px-5 py-5 shadow-[0_24px_56px_-44px_rgba(67,103,230,0.3)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[28rem]">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#4568F5]">
                POPULAR INGREDIENTS
              </p>
              <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.35rem)] font-black tracking-[-0.05em] text-[#1F2A44]">
                인기 성분
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#5D6984]">
                많이 찾는 성분부터 먼저 둘러보고, 바로 제품 흐름으로
                이어지도록 가볍게 정리했어요.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-[#DBE5FF] bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#5A6C96]">
              빠르게 많이 찾는 구성부터 보여드려요
            </div>
          </div>

          {isPreviewMode ? (
            <div className="mt-4 rounded-[1.4rem] border border-[#DDE6FF] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,244,255,0.95))] px-4 py-3.5">
              <p className="text-[13px] font-semibold text-[#26334E]">
                실시간 데이터를 불러오는 동안 많이 찾는 성분부터 먼저
                보여드릴게요.
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#66728B]">
                준비가 끝나면 같은 자리에서 자연스럽게 최신 구성으로
                바뀝니다.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 p-4 min-[520px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <PopularIngredientsLoadingCard key={index} index={index} />
          ))}
        </div>
      ) : hasVisibleCategories ? (
        <div className="grid grid-cols-1 gap-3 p-4 min-[520px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
          {categories.map((category, index) => {
            const visual = getIngredientPreviewVisual(category.name);
            const displayName = getIngredientDisplayName(category.name);
            const PreviewIcon = visual.icon;

            return (
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
                className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#E5EBF8] bg-white text-left shadow-[0_22px_44px_-36px_rgba(67,103,230,0.34)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D7E2FF] hover:shadow-[0_28px_56px_-36px_rgba(67,103,230,0.38)] focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]/45 ${
                  typeof category.id === "number" &&
                  pressedCategoryId === category.id
                    ? "scale-[0.99] ring-[#6C4DFF]/55"
                    : ""
                }`}
              >
                <div className="relative min-h-[13.5rem] overflow-hidden">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_14px_28px_-18px_rgba(76,93,198,0.72)]">
                    #{index + 1}
                  </span>
                  {category.image ? (
                    <>
                      <Image
                        src={category.image}
                        alt={category.name || "Category"}
                        fill
                        sizes="512px"
                        unoptimized={shouldBypassNextImageOptimizer(
                          category.image
                        )}
                        className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.88)_38%,rgba(255,255,255,0.98)_100%)] px-4 pb-4 pt-10">
                        <div className="line-clamp-2 text-[1.02rem] font-bold leading-6 tracking-[-0.03em] text-[#21304D]">
                          {category.name}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className={`absolute inset-0 flex h-full flex-col px-4 py-4 ${visual.surfaceClassName}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#70809E] ring-1 ring-white/80">
                          {visual.caption}
                        </span>
                        <div
                          className={`grid h-11 w-11 place-items-center rounded-[1.1rem] border ${visual.iconClassName} shadow-[0_14px_28px_-22px_rgba(31,42,68,0.28)]`}
                        >
                          <PreviewIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-auto max-w-[11.5rem] pb-1">
                        <div className="break-keep text-[clamp(1.75rem,5vw,2.45rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#223150]">
                          {displayName.primary}
                        </div>
                        {displayName.secondary ? (
                          <div className="mt-2 break-keep text-[0.95rem] font-semibold leading-5 text-[#42527A]">
                            {displayName.secondary}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#E9EEF9] bg-white px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#223150]">
                      추천 제품 보기
                    </div>
                    <div className="mt-1 line-clamp-1 text-[11px] text-[#72819E]">
                      {category.name}
                    </div>
                  </div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4568F5] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <CatalogSectionEmptyState
          badge="INGREDIENT NOTICE"
          title="지금은 인기 성분 구성을 따로 보여드리고 있지 않아요"
          description="실시간 구성을 다시 불러오는 동안에는 인기 성분 목록 대신 빠른 검색과 추천 흐름부터 가볍게 둘러보실 수 있어요."
        />
      )}
    </section>
  );
}
