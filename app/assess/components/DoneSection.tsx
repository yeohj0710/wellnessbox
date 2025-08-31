"use client";

import Link from "next/link";
import { CSectionResult } from "./CSection";
import { labelOf, descOf } from "../lib/categories";

interface Props {
  cResult: CSectionResult;
  recommendedIds: number[];
  onBack: () => void;
  onReset: () => void;
  showLoading: () => void;
}

export default function DoneSection({
  cResult,
  recommendedIds,
  onBack,
  onReset,
  showLoading,
}: Props) {
  return (
    <div className="w-full max-w-[760px] mx-auto px-4 pb-28">
      <div className="relative mt-6 sm:mt-10 overflow-hidden rounded-3xl bg-white/70 p-6 sm:p-10 shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-1 ring-black/5 backdrop-blur">
        <div className="flex justify-between text-xs text-gray-500 mb-6">
          <button
            onClick={onBack}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            이전
          </button>
          <button
            onClick={onReset}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            다시하기
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">맞춤 추천 결과</h1>
        <p className="text-sm text-gray-600 mb-6">
          답변을 AI 분석하여 세 가지 영양제 카테고리를 추천드려요. 퍼센트는 현재 상태와의 적합도를 의미해요.
        </p>
        <ul className="space-y-4">
          {cResult.catsOrdered.map((c, i) => (
            <li key={c} className="p-4 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{labelOf(c)}</span>
                <span className="text-sm text-gray-600">
                  {(cResult.percents[i] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                  style={{ width: `${Math.min(100, cResult.percents[i] * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">{descOf(c)}</p>
            </li>
          ))}
        </ul>
        <p className="text-center mt-6 text-sm text-gray-600">
          아래 버튼을 누르면 추천 카테고리가 적용된 상품 목록으로 이동해요.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href={`/explore${recommendedIds.length ? `?categories=${recommendedIds.join(",")}` : ""}#home-products`}
            className="w-full sm:w-2/3 text-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow hover:brightness-110 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
            onClick={showLoading}
          >
            추천 제품 보러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
