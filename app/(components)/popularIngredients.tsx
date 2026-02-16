"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Skeleton from "./skeleton";
import { sortByImportanceDesc } from "@/lib/utils";
import { fetchCategories } from "@/lib/client/categories";

interface PopularIngredientsProps {
  onSelectCategory: (id: number) => void;
  onCategoryIntent?: (id: number) => void;
  initialCategories?: any[];
}

export default function PopularIngredients({
  onSelectCategory,
  onCategoryIntent,
  initialCategories = [],
}: PopularIngredientsProps) {
  const [categories, setCategories] = useState<any[]>(() =>
    sortByImportanceDesc(initialCategories)
  );
  const [isLoading, setIsLoading] = useState(initialCategories.length === 0);
  const [pressedCategoryId, setPressedCategoryId] = useState<number | null>(
    null
  );
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIntentTimer = () => {
    if (!intentTimerRef.current) return;
    clearTimeout(intentTimerRef.current);
    intentTimerRef.current = null;
  };

  const scheduleCategoryIntent = (id: number) => {
    if (!onCategoryIntent) return;
    clearIntentTimer();
    intentTimerRef.current = setTimeout(() => {
      onCategoryIntent(id);
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
      setIsLoading(true);
      try {
        const fetched = await fetchCategories(controller.signal);
        if (controller.signal.aborted) return;
        setCategories(sortByImportanceDesc(fetched));
      } catch {
        if (controller.signal.aborted) return;
        setCategories([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [initialCategories]);

  useEffect(() => clearIntentTimer, []);

  return (
    <section className="w-full max-w-[640px] mx-auto mt-8">
      <div className="px-4">
        <h1 className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] bg-clip-text text-transparent">
            인기 성분
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => <Skeleton key={i} />)
          : categories.map((category, index) => (
              <button
                key={category.id}
                onPointerEnter={() => scheduleCategoryIntent(category.id)}
                onMouseEnter={() => scheduleCategoryIntent(category.id)}
                onFocus={() => onCategoryIntent?.(category.id)}
                onPointerLeave={clearIntentTimer}
                onMouseLeave={clearIntentTimer}
                onBlur={clearIntentTimer}
                onClick={() => {
                  clearIntentTimer();
                  setPressedCategoryId(category.id);
                  onSelectCategory(category.id);
                }}
                className={`group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_6px_20px_rgba(67,103,230,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(67,103,230,0.18)] focus:outline-none focus:ring-2 focus:ring-[#6C4DFF]/50 ${
                  pressedCategoryId === category.id
                    ? "scale-[0.99] ring-[#6C4DFF]/60"
                    : ""
                }`}
              >
                <div className="relative w-full aspect-[4/3]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4568F5]/0 via-[#6C4DFF]/0 to-[#6C4DFF]/0 opacity-0 group-hover:opacity-10 transition-opacity" />
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name || "Category"}
                      fill
                      sizes="512px"
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      이미지 없음
                    </div>
                  )}
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-[#3B82F6] to-[#6C4DFF] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    #{index + 1}
                  </span>
                </div>

                <div className="px-3 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {category.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6C4DFF] opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[11px] text-gray-500">
                      클릭하여 제품 보기
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 bg-gradient-to-t from-[#6C4DFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
      </div>
    </section>
  );
}
