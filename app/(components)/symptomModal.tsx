"use client";

import { useEffect, useState } from "react";
import {
  XMarkIcon,
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

interface SearchModalProps {
  onSelect: (selectedItems: string[]) => void;
  onClose: () => void;
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

export default function SymptomModal({ onSelect, onClose }: SearchModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const toggleSelection = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="mx-2 relative bg-white rounded-lg px-6 pt-8 pb-6 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-600 hover:text-gray-800"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mt-6 sm:mt-3 mb-6 text-center">
          어떤 영양제를 찾으세요?
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {searchItems.map((item, index) => {
            const Icon = searchIcons[index];
            return (
              <button
                key={item}
                onClick={() => toggleSelection(item)}
                className={`flex flex-col items-center border rounded-lg px-2 py-2 aspect-[1.1] sm:aspect-square
                  ${
                    selectedItems.includes(item)
                      ? "bg-sky-100 border-sky-500"
                      : "border-gray-300"
                  }
                hover:bg-sky-50`}
              >
                <div className="flex flex-col items-center my-auto">
                  <Icon className="w-6 h-6 mb-1 text-sky-500" />
                  <span className="text-sm text-center">{item}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="px-3 py-1 bg-sky-400 hover:bg-sky-500 text-white rounded disabled:opacity-50"
            onClick={() => {
              if (selectedItems.length === 0) {
                onClose();
              } else {
                onSelect(selectedItems);
              }
            }}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
}
