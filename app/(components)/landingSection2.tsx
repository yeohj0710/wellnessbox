"use client";

import Image from "next/image";
import { pretendard } from "../fonts";
import {
  RocketLaunchIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CubeIcon,
  BoltIcon,
  HeartIcon,
  CpuChipIcon,
  BeakerIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import TestimonialsSection from "./testimonialsSection";

interface LandingSection2Props {
  onSelect7Day: () => void;
  onSubscribe: () => void;
}

export default function LandingSection2({
  onSelect7Day,
  onSubscribe,
}: LandingSection2Props) {
  return (
    <>
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
              웰니스박스, 당신만을 위한 프리미엄 맞춤 영양제
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
            웰니스박스(Wellnessbox)는 개인의 증상·복용약·검진 데이터를 기반으로
            필요한 <br className="hidden md:block" />
            영양성분을 추천해 안전하게 제공하는 서비스입니다.
          </p>

          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <div className="h-11 sm:h-12 rounded-full px-5 sm:px-6 bg-white transition duration-300 text-[#3B5BFF] ring-1 ring-white shadow-[0_6px_20px_rgba(67,103,230,0.20)] flex items-center justify-center text-center leading-tight break-words">
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
            <ul className="flex flex-wrap items-center justify-center gap-x-0 gap-y-5 sm:gap-y-6">
              {Array.from({ length: 8 }, (_, i) => (
                <li
                  key={i}
                  className={`shrink-0 flex justify-center items-center ${
                    [2, 3].includes(i)
                      ? "-mx-2 sm:-mx-1 md:mx-0"
                      : "mx-4 sm:mx-6 md:mx-8"
                  }`}
                >
                  <Image
                    src={`/landingPage2/logos/${i + 1}.svg`}
                    alt=""
                    width={0}
                    height={0}
                    sizes="100vw"
                    unoptimized
                    className={`block h-[20px] sm:h-[22px] md:h-6 lg:h-7 w-auto brightness-0 invert ${
                      [2, 3].includes(i) ? "scale-75" : "scale-125"
                    }`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className={`relative isolate w-full min-h-[90vh] sm:min-h-[92vh] md:min-h-screen overflow-visible bg-gradient-to-b from-[#C7D2FE] via-[#DDE7FF] to-white ${pretendard.className}`}
      >
        <div className="absolute inset-x-0 z-10 -top-4 pointer-events-none overflow-visible">
          <div className="relative mx-auto min-h-[9.5rem] md:min-h-[11rem]">
            <div className="absolute left-1/2 -translate-x-1/2 -top-2 rotate-[-8deg] w-[220vw]">
              <div className="mx-auto flex h-10 sm:h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,120,255,0.35)]">
                <div className="flex gap-10 text-white/95 text-xs sm:text-sm tracking-widest font-semibold whitespace-nowrap">
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-6 rotate-[8deg] w-[230vw] opacity-90">
              <div className="mx-auto flex h-9 sm:h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#4AA8FF] to-[#6C4DFF] shadow-[0_8px_24px_rgba(86,120,255,0.28)]">
                <div className="flex gap-10 text-white/95 text-[11px] sm:text-xs tracking-widest font-semibold whitespace-nowrap">
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 md:px-10 pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-14 md:pb-16">
          <div className="relative -mt-8 sm:-mt-12 md:-mt-16 mx-auto w-full max-w-[72rem] rounded-[28px] bg-white px-4 sm:px-6 md:px-8 py-10 md:py-12 shadow-[0_24px_64px_-18px_rgba(67,103,230,0.22)] ring-1 ring-white/60">
            <div className="text-center">
              <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-[#4B63E6]">
                PERSONALIZED PROCESS
              </p>
              <h2 className="mt-2 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F1222]">
                맞춤 프로세스 <span className="text-[#3B5BFF]">안내</span>
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              <div className="rounded-xl bg-[#EEF3FF] px-4 sm:px-5 py-5 shadow-[0_10px_24px_rgba(80,110,230,0.12)] ring-1 ring-white/70">
                <div className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-white/70 grid place-items-center">
                  <ChartBarIcon className="h-8 w-8 md:h-10 md:w-10 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-2 flex h-6 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[10px] font-semibold">
                  STEP 01
                </div>
                <p className="text-center text-[13px] sm:text-sm text-[#5B5A74]">
                  건강
                  <br />
                  데이터{" "}
                  <span className="font-semibold text-[#1E2A78]">분석</span>
                </p>
              </div>

              <div className="rounded-xl bg-[#EEF3FF] px-4 sm:px-5 py-5 shadow-[0_10px_24px_rgba(80,110,230,0.12)] ring-1 ring-white/70">
                <div className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-white/70 grid place-items-center">
                  <ChatBubbleBottomCenterTextIcon className="h-8 w-8 md:h-10 md:w-10 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-2 flex h-6 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[10px] font-semibold">
                  STEP 02
                </div>
                <p className="text-center text-[13px] sm:text-sm text-[#5B5A74]">
                  전문가
                  <br />
                  상담{" "}
                  <span className="font-semibold text-[#1E2A78]">검토</span>
                </p>
              </div>

              <div className="rounded-xl bg-[#EEF3FF] px-4 sm:px-5 py-5 shadow-[0_10px_24px_rgba(80,110,230,0.12)] ring-1 ring-white/70">
                <div className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-white/70 grid place-items-center">
                  <CubeIcon className="h-8 w-8 md:h-10 md:w-10 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-2 flex h-6 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[10px] font-semibold">
                  STEP 03
                </div>
                <p className="text-center text-[13px] sm:text-sm text-[#5B5A74]">
                  맞춤
                  <br />
                  소분{" "}
                  <span className="font-semibold text-[#1E2A78]">패키징</span>
                </p>
              </div>

              <div className="rounded-xl bg-[#EEF3FF] px-4 sm:px-5 py-5 shadow-[0_10px_24px_rgba(80,110,230,0.12)] ring-1 ring-white/70">
                <div className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full bg-white/70 grid place-items-center">
                  <BoltIcon className="h-8 w-8 md:h-10 md:w-10 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-2 flex h-6 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[10px] font-semibold">
                  STEP 04
                </div>
                <p className="text-center text-[13px] sm:text-sm text-[#5B5A74]">
                  지속 케어
                  <br />
                  &nbsp;
                  <span className="font-semibold text-[#1E2A78]">피드백</span>
                </p>
              </div>
            </div>

            <div className="mt-8 md:mt-10 flex justify-center">
              <div className="h-7 w-7 rotate-45 rounded-[6px] border border-[#D3DBFF] bg-white shadow-[0_6px_18px_rgba(80,110,230,0.16)]" />
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative w-full overflow-x-hidden bg-gradient-to-b from-white via-[#F3F6FF] to-white ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9DB7FF] to-transparent opacity-70" />
        <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 md:px-8 pt-8 md:pt-10 pb-10 md:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-8">
            <div className="order-2 md:order-1 md:col-span-5 md:col-start-2">
              <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-[#4B63E6]">
                AI DATA ANALYSIS
              </p>
              <h3 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F1222]">
                건강 데이터 <span className="text-[#3B5BFF]">분석</span>
              </h3>
              <p className="mt-3 text-[13px] sm:text-sm md:text-base text-[#6F7690] leading-relaxed">
                건강검진 결과·복용중인 약·증상 등을 입력하면 AI가 필요한
                영양소를 추천합니다.
              </p>
              <div className="mt-4 flex gap-3">
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <HeartIcon className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <CpuChipIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />
              <div className="mt-6">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 rounded-full px-6 sm:px-7 text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]"
                  onClick={onSelect7Day}
                >
                  7일치 구매하기
                </button>
              </div>
            </div>
            <div className="relative order-1 md:order-2 md:col-span-5 md:col-start-7">
              <div className="relative w-full aspect-[613/511] rounded-[28px] overflow-hidden">
                <Image
                  src="/landingPage2/ai-analysis-hero.png"
                  alt="AI 건강 데이터 분석"
                  fill
                  priority
                  sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative w-full overflow-x-hidden bg-gradient-to-b from-white via-[#F6F3FF] to-white ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B7A9FF] to-transparent opacity-70" />
        <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 md:px-8 pt-8 md:pt-10 pb-10 md:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-8">
            <div className="relative order-1 md:col-span-5 md:col-start-2">
              <div className="relative w-full aspect-[613/511] rounded-[28px] overflow-hidden">
                <Image
                  src="/landingPage2/pharmacist-review-hero.png"
                  alt="전문가 상담 검토"
                  fill
                  sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                  className="object-contain"
                />
              </div>
            </div>
            <div className="order-2 md:col-span-5 md:col-start-7">
              <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-[#7A68FF]">
                PHARMACIST-APPROVED
              </p>
              <h3 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F1222]">
                전문가 <span className="text-[#6C4DFF]">상담 검토</span>
              </h3>
              <p className="mt-3 text-[13px] sm:text-sm md:text-base text-[#6F7690] leading-relaxed">
                추천된 영양제를 약국 소속 약사가 이중 확인하고, 1:1 상담을 통해
                최종 처방합니다.
              </p>
              <div className="mt-4 flex gap-3">
                <div className="h-12 w-12 rounded-xl border border-[#E6E1FF] bg-white shadow-[0_8px_22px_rgba(108,77,255,0.15)] grid place-items-center text-[#6C4DFF]">
                  <BeakerIcon className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded-xl border border-[#E6E1FF] bg-white shadow-[0_8px_22px_rgba(108,77,255,0.15)] grid place-items-center text-[#6C4DFF]">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded-xl border border-[#E6E1FF] bg-white shadow-[0_8px_22px_rgba(108,77,255,0.15)] grid place-items-center text-[#6C4DFF]">
                  <MagnifyingGlassIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />
              <div className="mt-6">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 rounded-full px-6 sm:px-7 text-white bg-gradient-to-r from-[#6C4DFF] to-[#8A6BFF] shadow-[0_10px_28px_rgba(108,77,255,0.30)]"
                  onClick={onSelect7Day}
                >
                  7일치 구매하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative w-full overflow-x-hidden bg-gradient-to-b from-white via-[#F6F3FF]/60 to-[#F6F3FF] ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B7A9FF] to-transparent opacity-70" />
        <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 md:px-8 pt-8 md:pt-10 pb-10 md:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-8">
            <div className="order-2 md:order-1 md:col-span-5 md:col-start-2">
              <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-[#4B63E6]">
                CUSTOMIZED 7-DAY SUPPLY
              </p>
              <h3 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F1222]">
                맞춤 <span className="text-[#3B5BFF]">소분 패키징</span>
              </h3>
              <p className="mt-3 text-[13px] sm:text-sm md:text-base text-[#6F7690] leading-relaxed">
                하루 복용량 기준으로 7일치씩 소분 포장해 배송합니다. 사용자는
                최소 7일부터 부담 없이 시작할 수 있습니다.
              </p>
              <div className="mt-4 flex gap-3">
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <CubeIcon className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />
              <div className="mt-6">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 rounded-full px-6 sm:px-7 text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]"
                  onClick={onSelect7Day}
                >
                  7일치 구매하기
                </button>
              </div>
            </div>
            <div className="relative order-1 md:order-2 md:col-span-5 md:col-start-7">
              <div className="relative w-full aspect-[613/511] rounded-[28px] overflow-hidden">
                <Image
                  src="/landingPage2/customized-supply-hero.png"
                  alt="맞춤 소분 패키징"
                  fill
                  sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative w-full overflow-x-hidden bg-gradient-to-b from-[#F6F3FF] via-[#F6F3FF]/50 to-[#F3F6FF] ${pretendard.className}`}
      >
        <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 md:px-8 pt-8 md:pt-10 pb-14 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-8">
            <div className="relative order-1 md:col-span-5 md:col-start-1">
              <div className="relative w-full aspect-[613/511] rounded-[28px] overflow-hidden">
                <Image
                  src="/landingPage2/health-tracking-hero.png"
                  alt="건강 모니터링 이미지"
                  fill
                  sizes="(min-width:1280px) 560px, (min-width:1024px) 520px, 80vw"
                  className="object-contain"
                />
              </div>
            </div>
            <div className="order-2 md:col-span-5 md:col-start-7">
              <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-[#4B63E6]">
                HEALTH TRACKING
              </p>
              <h3 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F1222]">
                지속 <span className="text-[#3B5BFF]">케어 및 피드백</span>
              </h3>
              <p className="mt-3 text-[13px] sm:text-sm md:text-base text-[#6F7690] leading-relaxed">
                챗봇 기반 피드백과 복약 알림으로 복용을 돕고, 앱에서 건강 변화를
                모니터링합니다. 약사가 피드백을 받아 패키지를 조정합니다.
              </p>
              <div className="mt-4 flex gap-3">
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <BoltIcon className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded-xl border border-[#E0E6FF] bg-white shadow-[0_8px_22px_rgba(67,103,230,0.15)] grid place-items-center text-[#4F68FF]">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 h-px w-full max-w-md bg-[#E7E5FF]" />
              <div className="mt-6">
                <button
                  className="hover:scale-105 transition duration-300 h-11 sm:h-12 rounded-full px-6 sm:px-7 text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]"
                  onClick={onSelect7Day}
                >
                  7일치 구매하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative isolate -mt-px w-full overflow-visible bg-gradient-to-b from-[#F3F6FF] via-[#E6ECFF] to-white pt-20 sm:pt-24 md:pt-28 ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-14 bg-gradient-to-b from-[#F3F6FF] to-transparent" />
        <div className="absolute inset-x-0 top-4 sm:top-6 md:top-8 pointer-events-none overflow-visible">
          <div className="relative mx-auto h-[5.5rem]">
            <div className="absolute left-1/2 -translate-x-1/2 -top-2 rotate-[-8deg] w-[230vw]">
              <div className="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] shadow-[0_10px_30px_rgba(86,120,255,0.35)]">
                <div className="flex gap-10 text-white/95 text-xs sm:text-sm tracking-widest font-semibold whitespace-nowrap">
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-5 rotate-[7deg] w-[235vw] opacity-95">
              <div className="mx-auto flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#4AA8FF] to-[#6C4DFF] shadow-[0_8px_24px_rgba(86,120,255,0.28)]">
                <div className="flex gap-10 text-white/95 text-xs sm:text-sm tracking-widest font-semibold whitespace-nowrap">
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                  <span>WELLNESS BOX</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-[48rem] md:max-w-[50rem] lg:max-w-[52rem] px-4 sm:px-6 md:px-8 pt-12 sm:pt-14 md:pt-16 pb-12 sm:pb-14 md:pb-16">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
              START NOW
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F1222] leading-[1.28] sm:leading-[1.32] md:leading-[1.36]">
              지금 시작하고,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
                7일치 복용
              </span>
              을 경험해보세요!
            </h2>
            <p className="mt-4 text-[13px] sm:text-sm md:text-base text-[#6F7690]">
              7일 간편 체험 후, 나에게 꼭 맞으면 정기구독으로 건강 습관을
              이어가세요.
            </p>
          </div>

          <div className="relative mt-8 sm:mt-10">
            <div className="pointer-events-none absolute -left-10 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.6),transparent)] blur-sm" />
            <div className="pointer-events-none absolute -right-8 bottom-3 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.55),transparent)] blur-sm" />
            <div className="mx-auto grid grid-cols-1 md:grid-cols-none md:grid-flow-col md:auto-cols-max justify-center justify-items-center items-center md:justify-items-stretch md:items-stretch gap-6 md:gap-8">
              <div className="relative h-full w-[16rem] sm:w-[18rem] md:w-[19rem] lg:w-[20rem] rounded-[28px] bg-gradient-to-b from-[#5B4BFF] to-[#5637FF] px-5 sm:px-6 md:px-7 py-7 sm:py-9 md:py-10 text-white shadow-[0_28px_80px_-20px_rgba(77,76,220,0.55)] flex flex-col">
                <div className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#5A46FF] shadow-sm">
                  간편한 체험
                </div>
                <div className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-[#7C6CFF] px-3 py-1 text-[11px] font-semibold">
                  베스트
                </div>
                <h3 className="text-base sm:text-lg font-bold">7일치 구매</h3>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-[34px] sm:text-[38px] md:text-5xl font-extrabold leading-none tracking-tight">
                    700
                  </span>
                  <span className="pb-1 text-xl sm:text-2xl md:text-3xl">
                    ₩
                  </span>
                  <span className="pb-[6px] text-xs sm:text-sm text-white/90">
                    부터
                  </span>
                </div>
                <div className="mt-6 border-t border-white/20 pt-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">7일치 구매하기</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">7일 이내로 취소 가능</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">언제든지 정기구독 전환</span>
                  </div>
                </div>
                <div className="mt-auto pt-7">
                  <button
                    className="hover:scale-105 transition duration-300 h-11 sm:h-12 w-full rounded-full bg-white text-[#3B2BFF] text-sm sm:text-base font-semibold shadow-[0_8px_22px_rgba(255,255,255,0.35)]"
                    onClick={onSelect7Day}
                  >
                    구매하기
                  </button>
                </div>
              </div>

              <div className="relative h-full w-[16rem] sm:w-[18rem] md:w-[19rem] lg:w-[20rem] rounded-[28px] bg-white px-5 sm:px-6 md:px-7 py-7 sm:py-9 md:py-10 text-[#0F1222] shadow-[0_28px_80px_-22px_rgba(67,103,230,0.35)] ring-1 ring-[#E7E9FF]">
                <div className="absolute -top-3 left-4 inline-flex items-center rounded-full bg-[#EAF0FF] px-3 py-1 text-[11px] font-semibold text-[#3B5BFF]">
                  첫 달 75% 할인
                </div>
                <div className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-[#6C4DFF] px-3 py-1 text-[11px] font-semibold text-white">
                  정기구독
                </div>
                <h3 className="text-base sm:text-lg font-bold">스탠다드</h3>
                <div className="mt-2 text-[34px] sm:text-[38px] md:text-5xl font-extrabold leading-none tracking-tight">
                  19,000
                  <span className="text-xl sm:text-2xl md:text-3xl align-top">
                    ₩
                  </span>
                  <span className="ml-1 text-xs sm:text-sm md:text-base font-bold text-[#5B5A74]">
                    / 월
                  </span>
                </div>
                <div className="mt-6 border-t border-[#E9ECFF] pt-5 space-y-3">
                  <div className="flex items-center gap-3 text-[#28314A]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">첫 달 75% 파격적 할인</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#28314A]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">원하는 날짜에 맞춰 구독</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#28314A]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">무료 AI 약사 상담</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#28314A]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF3FF] text-[#3B5BFF]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-sm">
                      정기 구독자를 위한 배송 편의
                    </span>
                  </div>
                </div>
                <div className="mt-7">
                  <button
                    className="hover:scale-105 transition duration-300 h-11 sm:h-12 w-full rounded-full bg-white text-[#0F1222] text-sm sm:text-base ring-1 ring-[#E7E9FF] font-semibold shadow-[0_8px_22px_rgba(20,30,60,0.08)]"
                    onClick={onSubscribe}
                  >
                    구독하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />
    </>
  );
}
