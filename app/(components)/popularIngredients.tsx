"use client";

import type { ComponentType, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
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
  eyebrow: string;
  accent: string;
  surfaceClassName: string;
  iconClassName: string;
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
      eyebrow: "눈 건강 루틴",
      accent: "가볍게 둘러보기",
      surfaceClassName:
        "bg-[radial-gradient(circle_at_20%_18%,rgba(122,160,255,0.32),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(176,188,255,0.32),transparent_24%),linear-gradient(145deg,#f8fbff_0%,#edf2ff_55%,#e5ecff_100%)]",
      iconClassName: "text-[#5B72F7]",
    };
  }

  if (name.includes("오메가")) {
    return {
      icon: SparklesIcon,
      eyebrow: "데일리 밸런스",
      accent: "자주 찾는 기본 성분",
      surfaceClassName:
        "bg-[radial-gradient(circle_at_18%_18%,rgba(111,150,255,0.34),transparent_28%),radial-gradient(circle_at_84%_28%,rgba(142,120,255,0.22),transparent_24%),linear-gradient(145deg,#f8fbff_0%,#edf3ff_52%,#e8edff_100%)]",
      iconClassName: "text-[#536CF4]",
    };
  }

  if (name.includes("비타민D")) {
    return {
      icon: SunIcon,
      eyebrow: "햇빛 루틴",
      accent: "부담 없이 시작하기",
      surfaceClassName:
        "bg-[radial-gradient(circle_at_18%_18%,rgba(130,162,255,0.34),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(255,222,134,0.24),transparent_22%),linear-gradient(145deg,#f9fbff_0%,#edf2ff_52%,#e7ecff_100%)]",
      iconClassName: "text-[#5972F5]",
    };
  }

  if (name.includes("프로바이오틱스") || name.includes("유산균")) {
    return {
      icon: ShieldCheckIcon,
      eyebrow: "편안한 데일리",
      accent: "많이 찾는 루틴",
      surfaceClassName:
        "bg-[radial-gradient(circle_at_18%_18%,rgba(124,163,255,0.34),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(108,77,255,0.18),transparent_22%),linear-gradient(145deg,#f8fbff_0%,#edf3ff_52%,#e8edff_100%)]",
      iconClassName: "text-[#5670F4]",
    };
  }

  if (name.includes("마그네슘")) {
    return {
      icon: BoltIcon,
      eyebrow: "리듬 밸런스",
      accent: "자주 둘러보는 성분",
      surfaceClassName:
        "bg-[radial-gradient(circle_at_16%_18%,rgba(118,154,255,0.34),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(136,120,255,0.22),transparent_24%),linear-gradient(145deg,#f8fbff_0%,#edf2ff_52%,#e5ebff_100%)]",
      iconClassName: "text-[#4F68F4]",
    };
  }

  return {
    icon: BeakerIcon,
    eyebrow: "인기 탐색",
    accent: "지금 많이 찾는 성분",
    surfaceClassName:
      "bg-[radial-gradient(circle_at_18%_18%,rgba(118,156,255,0.34),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(108,77,255,0.2),transparent_24%),linear-gradient(145deg,#f8fbff_0%,#edf2ff_52%,#e6ecff_100%)]",
    iconClassName: "text-[#5470F5]",
  };
}

function PopularIngredientsLoadingCard({ index }: { index: number }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#E3EAFE] bg-white/90 shadow-[0_18px_40px_-34px_rgba(67,103,230,0.25)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(120,150,255,0.16),transparent_55%),linear-gradient(180deg,#f9fbff_0%,#eef3ff_100%)]">
        <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(69,104,245,0.8)]">
          #{index + 1}
        </div>
        <div className="absolute right-4 top-4 h-11 w-11 animate-pulse rounded-2xl bg-white/80 ring-1 ring-white/70" />
        <div className="absolute left-4 top-[4.6rem] h-3 w-20 animate-pulse rounded-full bg-white/75" />
        <div className="absolute left-4 bottom-5 h-6 w-28 animate-pulse rounded-full bg-white/70" />
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-[#E9EEFF]" />
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#96A7FF]" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-[#EEF2FF]" />
        </div>
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
  }, [initialCategories]);

  useEffect(() => clearIntentTimer, []);

  const hasVisibleCategories = categories.length > 0;
  const isPreviewMode =
    !isLoading && hasVisibleCategories && categories.every((category) => !category.image);

  return (
    <section className="mx-auto mt-8 w-full max-w-[640px]">
      <div className="px-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] bg-clip-text text-transparent">
            인기 성분
          </span>
        </h1>
      </div>

      {isPreviewMode ? (
        <div className="px-4 pt-3">
          <div className="rounded-[1.35rem] border border-[#DCE5FF] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,244,255,0.96))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(67,103,230,0.28)]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[linear-gradient(135deg,#EEF3FF,#FFFFFF)] text-[#5B72F7] ring-1 ring-[#D8E2FF]">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1F2A44]">
                  실시간 인기 성분을 다시 불러오는 동안 자주 찾는 성분부터 먼저 보여드릴게요.
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#667089]">
                  이미지와 구성 데이터가 준비되면 같은 자리에서 자연스럽게 바뀝니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <PopularIngredientsLoadingCard key={index} index={index} />
          ))}
        </div>
      ) : hasVisibleCategories ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {categories.map((category, index) => {
            const visual = getIngredientPreviewVisual(category.name);
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
                    <div className={`absolute inset-0 overflow-hidden px-4 ${visual.surfaceClassName}`}>
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/60 blur-2xl" />
                      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                        <div className="rounded-full border border-white/70 bg-white/82 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-slate-500 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.4)]">
                          {visual.eyebrow}
                        </div>
                        <div
                          className={`grid h-11 w-11 flex-none place-items-center rounded-2xl border border-white/75 bg-white/84 shadow-[0_18px_28px_-24px_rgba(15,23,42,0.45)] ${visual.iconClassName}`}
                        >
                          <PreviewIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="absolute left-4 top-[5.15rem] h-2 w-16 rounded-full bg-white/70" />

                      <div className="absolute inset-x-4 bottom-4 text-left">
                        <div className="inline-flex rounded-full border border-white/75 bg-white/82 px-3 py-1 text-[10px] font-semibold text-slate-500">
                          {visual.accent}
                        </div>
                        <div className="mt-3 pr-10 text-lg font-black tracking-tight text-[#23304F]">
                          {category.name}
                        </div>
                      </div>
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
                      {category.image ? "클릭하여 제품 보기" : "성분 흐름 바로 보기"}
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 bg-gradient-to-t from-[#6C4DFF]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
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
