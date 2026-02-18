"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { shouldBypassNextImageOptimizer } from "@/lib/shared/image";

interface Category {
  id: number;
  name: string;
  image?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  isLoading: boolean;
  selectedCategories: number[];
  onToggleCategory: (categoryId: number) => void;
  onResetCategories: () => void;
}

export default function CategoryFilter({
  categories,
  selectedCategories,
  isLoading,
  onToggleCategory,
  onResetCategories,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showChevron, setShowChevron] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScroll = () => {
      const tolerance = 2;
      setShowChevron(
        el.scrollWidth > el.clientWidth &&
          el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance
      );
    };
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const handleChevronClick = () => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: step, behavior: "smooth" });
  };

  return (
    <section className="py-2 bg-white">
      <div className="relative">
        <div
          ref={scrollRef}
          data-horizontal-scroll-area="true"
          className="overflow-x-auto scrollbar-hide touch-pan-x"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
          }}
        >
          <div className="mx-3 flex flex-nowrap items-start gap-2 w-max min-w-full">
            <button
              onClick={onResetCategories}
              className={`flex flex-col items-center justify-center h-12 shrink-0 px-4 border rounded-full ${
                selectedCategories.length === 0
                  ? "bg-gray-200 font-bold"
                  : "bg-white border-gray-300"
              } md:hover:bg-gray-100`}
            >
              <span className="text-sm">전체</span>
            </button>
            {isLoading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse gap-0.5 flex flex-col items-center justify-center h-12 min-w-24 shrink-0 px-4 border rounded-full bg-gray-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    <div className="w-10 h-2 rounded-full bg-gray-300 mt-1"></div>
                  </div>
                ))
              : categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onToggleCategory(category.id)}
                    className={`gap-0.5 flex flex-col items-center justify-center h-12 min-w-24 shrink-0 px-4 border rounded-full ${
                      selectedCategories.includes(category.id)
                        ? "bg-sky-100 border-sky-400 font-bold"
                        : "bg-white border-gray-300"
                    } md:hover:bg-sky-50`}
                  >
                    {category.image ? (
                      <div className="relative w-6 h-6">
                        {(() => {
                          const imageSrc = category.image.replace(
                            "/public",
                            "/avatar"
                          );
                          return (
                        <Image
                          src={imageSrc}
                          alt={category.name || "Category"}
                          fill
                          sizes="128px"
                          unoptimized={shouldBypassNextImageOptimizer(imageSrc)}
                          className="rounded-full object-cover"
                        />
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    )}
                    <span className="text-xs text-center whitespace-nowrap">
                      {category.name || "카테고리"}
                    </span>
                  </button>
                ))}

            <span className="text-white text-xs cursor-default">_</span>
          </div>
        </div>
        {showChevron && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              onClick={handleChevronClick}
              aria-label="Scroll categories"
              className="pointer-events-auto h-full px-1 bg-gradient-to-l from-white via-white/80 to-transparent"
            >
              <ChevronRightIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
