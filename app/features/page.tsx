"use client";

import PaymentTest from "@/components/paymentTest";

export default function Features() {
  return (
    <div className="mt-8 w-full sm:w-[640px] xl:w-1/2 px-5 py-7 bg-white sm:border sm:border-gray-200 sm:rounded-lg sm:shadow-lg">
      <div className="flex flex-row gap-[2%] justify-between mb-5 sm:mb-6 items-center">
        <h1 className="text-2xl font-bold text-gray-800">결제하기</h1>
      </div>
      <hr className="border-t border-gray-300 mb-6" />
      <PaymentTest />
    </div>
  );
}
