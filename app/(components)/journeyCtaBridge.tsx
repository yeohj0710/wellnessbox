"use client";

import { pretendard } from "../fonts";

export default function JourneyCtaBridge() {
  return (
    <section
      className={`relative isolate w-full overflow-hidden bg-gradient-to-b from-[#EEF3FF] via-[#E5ECFF] to-white py-16 sm:py-20 ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(to_bottom,#EEF3FF,rgba(238,243,255,0))]" />

      <div className="pointer-events-none absolute -left-24 top-8 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,255,0.10),transparent)]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,255,0.10),transparent)]" />

      <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 md:px-10">
        <div className="text-center">
          <p className="text-sm sm:text-base md:text-lg font-extrabold text-[#0F1222]">
            웰니스박스와 함께
          </p>
          <h2 className="mt-3 text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-[#0F1222]">
            나만의 맞춤 영양 여정을{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2F45B0] via-[#4158F6] to-[#2F45B0]">
              시작해보세요.
            </span>
          </h2>
        </div>
      </div>
    </section>
  );
}
