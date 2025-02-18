"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

interface Category {
  id: number;
  name: string;
  image?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedCategories: number[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function CategoryFilter({
  categories,
  selectedCategories,
  setSelectedCategories,
  isLoading,
  setIsLoading,
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

  return (
    <section className="py-3 bg-gray-50">
      <div className="relative">
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-3 flex flex-nowrap items-start gap-2 w-full max-w-[640px]">
            <button
              onClick={() => {
                setIsLoading(true);
                setSelectedCategories([]);
                setIsLoading(false);
              }}
              className={`flex flex-col items-center justify-center h-12 shrink-0 px-4 border rounded-full ${
                selectedCategories.length === 0
                  ? "bg-gray-200 font-bold"
                  : "bg-white border-gray-300"
              } hover:bg-gray-100`}
            >
              <span className="text-sm">전체</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setIsLoading(true);
                  setSelectedCategories((prev: number[]) =>
                    prev.includes(category.id)
                      ? prev.filter((id: number) => id !== category.id)
                      : [...prev, category.id]
                  );
                  setIsLoading(false);
                }}
                className={`gap-0.5 flex flex-col items-center justify-center h-12 min-w-24 shrink-0 px-4 border rounded-full ${
                  selectedCategories.includes(category.id)
                    ? "bg-sky-100 border-sky-400 font-bold"
                    : "bg-white border-gray-300"
                } hover:bg-sky-50`}
              >
                {category.image ? (
                  <img
                    src={category.image.replace("/public", "/avatar")}
                    alt={category.name || "Category"}
                    className="w-6 h-6 rounded-full object-cover"
                  />
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
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronRightIcon className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
    </section>
  );
}
