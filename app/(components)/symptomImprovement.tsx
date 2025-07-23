"use client";

import Link from "next/link";

export default function SymptomImprovement() {
  return (
    <section className="w-full max-w-[640px] mx-auto mt-8 px-4">
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">AI 증상 자가 진단</h1>
        <p className="text-sm text-gray-600 mb-4">
          간단한 설문을 통해 AI에게 영양제 추천을 받아보세요.
        </p>
        <Link href="/check-ai">
          <button className="w-full py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600">
            진단하러 가기
          </button>
        </Link>
      </div>
    </section>
  );
}
