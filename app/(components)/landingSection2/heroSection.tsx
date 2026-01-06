"use client";

import Image from "next/image";
import { pretendard } from "@/app/fonts";

interface HeroSectionProps {
  onSelect7Day: () => void;
}

export default function HeroSection({ onSelect7Day }: HeroSectionProps) {
  return (
    <section
      className={`relative w-full min-h-[86vh] sm:min-h-[90vh] md:min-h-screen overflow-hidden bg-gradient-to-b from-white via-[#EEF2FF] to-[#C7D2FE] ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute -left-1/3 -top-1/4 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(closest-side,rgba(99,140,255,0.18),transparent)] sm:h-[24rem] sm:w-[24rem] md:h-[32rem] md:w-[32rem]" />
      <div className="pointer-events-none absolute -right-1/4 bottom-[-15%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(142,122,255,0.22),transparent)] sm:h-[30rem] sm:w-[30rem] md:h-[40rem] md:w-[40rem]" />

      <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 md:px-10 pt-24 sm:pt-28 md:pt-36 pb-16 sm:pb-20 md:pb-28">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-400" />
            <div className="-ml-2 w-5 h-5 sm:-ml-2 sm:w-6 sm:h-6 rounded-full bg-sky-500" />
            <div className="-ml-2 w-5 h-5 sm:-ml-2 sm:w-6 sm:h-6 rounded-full bg-indigo-500" />
          </div>
          <span className="text-xs sm:text-sm md:text-base text-[#5B5A74]">
            당신만을 위한 프리미엄 맞춤 영양제
          </span>
        </div>

        <h1 className="mt-4 sm:mt-6 text-center text-[#0F1222] font-extrabold tracking-tight flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
          <span className="block sm:hidden leading-[1.4] text-3xl">
            내 몸에 딱 맞는
            <br />
            “AI+약사 설계”
          </span>
          <span className="hidden sm:block md:hidden leading-none text-4xl">
            내 몸에 딱 맞는 “AI+약사 설계”
          </span>
          <span className="hidden md:block lg:hidden leading-none text-5xl">
            내 몸에 딱 맞는 “AI+약사 설계”
          </span>
          <span className="hidden lg:block leading-none text-7xl">
            내 몸에 딱 맞는 “AI+약사 설계”
          </span>
          <span className="leading-none bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF] text-3xl sm:text-4xl md:text-5xl lg:text-7xl">
            Premium 건강 솔루션
          </span>
        </h1>

        <p className="mt-5 sm:mt-7 mx-auto max-w-xl sm:max-w-2xl text-center text-[13px] sm:text-sm md:text-base text-[#7A8094]">
          웰니스박스는 개인의 증상·복용약·검진 데이터를 기반으로 필요한
          <br className="hidden md:block" />
          영양성분을 추천해 안전하게 제공하는 서비스입니다.
        </p>

        <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <div className="h-11 sm:h-12 rounded-full px-5 sm:px-6 bg-white transition duration-300 text-[#3B5BFF] ring-1 ring-white shadow-[0_6px_20px_rgba(67,103,230,0.20)] flex items-center justify-center">
            7일 단위 시작으로 부담 없이!
          </div>
          <button
            className="hover:scale-105 transition duration-300 h-11 sm:h-12 rounded-full px-5 sm:px-6 text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]"
            onClick={onSelect7Day}
          >
            7일치 구매하기
          </button>
        </div>

        <div className="mt-10 sm:mt-14">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 md:gap-x-10 gap-y-5 sm:gap-y-6">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="shrink-0">
                <Image
                  src={`/landingPage2/logos/${i + 1}.svg`}
                  alt=""
                  width={0}
                  height={0}
                  sizes="100vw"
                  unoptimized
                  className="block h-[20px] sm:h-[22px] md:h-6 lg:h-7 w-auto brightness-0 invert"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
