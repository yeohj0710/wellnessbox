"use client";

import Link from "next/link";
import { SparklesIcon } from "@heroicons/react/24/outline";

export default function SymptomImprovement() {
  return (
    <section className="w-full max-w-[640px] mx-auto mt-10 px-4">
      <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-r from-[#4568F5] via-[#7C5CFF] to-[#6C4DFF] shadow-[0_12px_40px_rgba(76,81,191,0.15)]">
        <div className="relative rounded-2xl bg-white">
          <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full bg-[#6C4DFF]/20 blur-3xl" />
          <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="relative p-7 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-700 shadow-sm">
              <SparklesIcon className="h-4 w-4 text-[#6C4DFF]" />
              2~3분 소요 · 맞춤 추천
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">
              AI 증상 자가 진단
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              몇 가지 질문에 답하면 AI가 나에게 맞는 영양제를 추천해줘요.
            </p>
            <div className="mt-6">
              <Link href="/assess">
                <button className="w-full rounded-xl bg-gradient-to-r from-[#4568F5] via-[#6C4DFF] to-[#7C5CFF] px-5 py-2.5 text-base font-semibold text-white shadow-md transition-all duration-300 bg-[length:200%_200%] hover:bg-right-bottom">
                  진단하러 가기
                </button>
              </Link>
              <p className="mt-3 text-[12px] text-gray-500">
                로그인 없이 바로 시작할 수 있어요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
