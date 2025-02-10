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
} from "@heroicons/react/24/outline";

interface SymptomFilterProps {
  selectedSymptoms: string[];
  onChange: (symptoms: string[]) => void;
}

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

export default function SymptomFilter({
  selectedSymptoms,
  onChange,
}: SymptomFilterProps) {
  const toggleSelection = (item: string) => {
    if (selectedSymptoms.includes(item)) {
      onChange(selectedSymptoms.filter((i) => i !== item));
    } else {
      onChange([...selectedSymptoms, item]);
    }
  };
  const clearSelection = () => {
    onChange([]);
  };
  return (
    <section className="px-3 py-2 mb-3 bg-gray-100 overflow-x-auto scrollbar-hide">
      <div className="flex flex-nowrap items-center gap-2">
        <button
          onClick={clearSelection}
          className={`flex flex-col items-center justify-center h-12 shrink-0 px-4 border rounded-full ${
            selectedSymptoms.length === 0 ? "bg-gray-200 font-bold" : "bg-white"
          } hover:bg-gray-100`}
        >
          <span className="text-sm font-bold">전체</span>
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
                  ? "bg-sky-100 border-sky-500"
                  : "bg-white border-gray-300"
              } hover:bg-sky-50`}
            >
              <Icon className="w-6 h-6 mb-1 text-sky-500" />
              <span className="text-xs text-center whitespace-nowrap">
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
