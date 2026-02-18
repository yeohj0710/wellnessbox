"use client";

import {
  BoltIcon,
  EyeIcon,
  UserIcon,
  ScaleIcon,
  HeartIcon,
  FireIcon,
  GlobeAltIcon,
  MoonIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

interface SymptomFilterProps {
  selectedSymptoms: string[];
  setSelectedSymptoms: (symptoms: string[]) => void;
}

export default function SymptomFilter({
  selectedSymptoms,
  setSelectedSymptoms,
}: SymptomFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showChevron, setShowChevron] = useState(false);
  const toggleSelection = (item: string) => {
    if (selectedSymptoms.includes(item)) {
      setSelectedSymptoms(selectedSymptoms.filter((i) => i !== item));
    } else {
      setSelectedSymptoms([...selectedSymptoms, item]);
    }
  };
  const clearSelection = () => {
    setSelectedSymptoms([]);
  };
  const searchItems = [
    "피로감",
    "눈 건강",
    "피부 건강",
    "체지방",
    "혈관 & 혈액순환",
    "간 건강",
    "장 건강",
    "스트레스 & 수면",
    "면역 기능",
    "혈중 콜레스테롤",
  ];
  const searchIcons = [
    BoltIcon,
    EyeIcon,
    UserIcon,
    ScaleIcon,
    HeartIcon,
    FireIcon,
    GlobeAltIcon,
    MoonIcon,
    ShieldCheckIcon,
    ChartPieIcon,
  ];
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
    <section className="relative py-2 bg-gray-100">
      <div
        ref={scrollRef}
        data-horizontal-scroll-area="true"
        className="overflow-x-auto scrollbar-hide touch-pan-x"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
      >
        <div className="mx-3 flex flex-nowrap items-center gap-2">
          <button
            onClick={clearSelection}
            className={`flex flex-col items-center justify-center h-12 shrink-0 px-4 border rounded-full ${
              selectedSymptoms.length === 0
                ? "bg-gray-200 font-bold"
                : "bg-white"
            } md:hover:bg-gray-100`}
          >
            <span className="text-sm">전체</span>
          </button>
          {searchItems.map((item, index) => {
            const Icon = searchIcons[index];
            const isSelected = selectedSymptoms.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleSelection(item)}
                className={`flex flex-col items-center justify-center h-12 min-w-24 shrink-0 px-4 border rounded-full ${
                  isSelected
                    ? "bg-sky-100 border-sky-400"
                    : "bg-white border-gray-300"
                } md:hover:bg-sky-50`}
              >
                <Icon className="w-6 h-6 mb-1 text-sky-500" />
                <span className="text-xs text-center whitespace-nowrap">
                  {item}
                </span>
              </button>
            );
          })}
          <span className="text-gray-100 text-xs cursor-default">_</span>
        </div>
      </div>
      {showChevron && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            onClick={handleChevronClick}
            aria-label="Scroll symptoms"
            className="pointer-events-auto h-full px-1 bg-gradient-to-l from-gray-100 via-gray-100/80 to-transparent"
          >
            <ChevronRightIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      )}
    </section>
  );
}
