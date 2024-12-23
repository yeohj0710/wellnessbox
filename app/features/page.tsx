"use client";

import Payment from "@/components/payment";

export default function Features() {
  return (
    <div className="w-full max-w-[640px] xl:max-w-1/2 px-7 py-8 bg-white border border-gray-200 rounded-lg shadow-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">결제하기</h1>
      <hr className="border-t border-gray-300 mb-6" />
      <Payment />
    </div>
  );
}
