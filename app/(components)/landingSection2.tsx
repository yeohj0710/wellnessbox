"use client";

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
} from "@heroicons/react/24/outline";

export default function LandingSection2() {
  return (
    <>
      <section
        className={`relative w-full min-h-[86vh] sm:min-h-[90vh] md:min-h-screen overflow-hidden bg-gradient-to-b from-white via-white to-[#DDE7FF] ${pretendard.className}`}
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
          <h1 className="mt-4 sm:mt-6 text-center leading-tight tracking-tight text-[#0F1222] text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold">
            내 몸에 딱 맞는 “AI+약사 설계”
            <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
              Premium 건강 솔루션
            </span>
          </h1>
          <p className="mt-5 sm:mt-7 mx-auto max-w-xl sm:max-w-2xl text-center text-[13px] sm:text-sm md:text-base text-[#7A8094]">
            웰니스박스는 개인의 증상·복용약·검진 데이터를 기반으로 필요한
            <br className="hidden md:block" />
            영양성분을 추천해 안전하게 제공하는 서비스입니다.
          </p>
          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button className="h-11 sm:h-12 rounded-full px-5 sm:px-6 bg-white text-[#3B5BFF] ring-1 ring-white shadow-[0_6px_20px_rgba(67,103,230,0.20)]">
              7일 단위 시작으로 부담 없이!
            </button>
            <button className="h-11 sm:h-12 rounded-full px-5 sm:px-6 text-white bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-[0_10px_28px_rgba(67,103,230,0.30)]">
              7일 무료체험
            </button>
          </div>
          <div className="mt-10 sm:mt-14 grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3 sm:gap-y-4 text-[#B5BCD1] opacity-90">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <RocketLaunchIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              startup
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BuildingOfficeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              company
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BanknotesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              venture
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BriefcaseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              business
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BuildingLibraryIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              institute
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <BuildingOffice2Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              agency
            </div>
          </div>
        </div>
      </section>

      <section
        className={`relative w-full min-h-[90vh] sm:min-h-[92vh] md:min-h-screen bg-gradient-to-b from-[#DDE7FF] via-[#EAF0FF] to-white ${pretendard.className}`}
      >
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-10 rotate-[-8deg] w-[220vw] z-20">
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
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1 rotate-[8deg] w-[230vw] opacity-90 z-10">
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

        <div className="relative mx-auto max-w-[100rem] px-4 sm:px-6 md:px-10 pt-24 sm:pt-28 md:pt-36 pb-16 sm:pb-20 md:pb-28">
          <div className="mx-auto w-full max-w-[92rem] rounded-[32px] bg-white px-4 sm:px-8 md:px-12 py-12 md:py-16 shadow-[0_30px_80px_-20px_rgba(67,103,230,0.25)] ring-1 ring-white/60">
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
                PERSONALIZED PROCESS
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F1222]">
                맞춤 프로세스 <span className="text-[#3B5BFF]">안내</span>
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[#EEF3FF] px-6 py-7 shadow-[0_12px_30px_rgba(80,110,230,0.15)] ring-1 ring-white/70">
                <div className="mx-auto mb-5 h-28 w-28 rounded-full bg-white/70 flex items-center justify-center">
                  <ChartBarIcon className="h-12 w-12 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-3 flex h-7 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[11px] font-semibold">
                  STEP 01
                </div>
                <p className="text-center text-sm text-[#5B5A74]">
                  건강
                  <br />
                  데이터{" "}
                  <span className="font-semibold text-[#1E2A78]">분석</span>
                </p>
              </div>

              <div className="rounded-2xl bg-[#EEF3FF] px-6 py-7 shadow-[0_12px_30px_rgba(80,110,230,0.15)] ring-1 ring-white/70">
                <div className="mx-auto mb-5 h-28 w-28 rounded-full bg-white/70 flex items-center justify-center">
                  <ChatBubbleBottomCenterTextIcon className="h-12 w-12 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-3 flex h-7 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[11px] font-semibold">
                  STEP 02
                </div>
                <p className="text-center text-sm text-[#5B5A74]">
                  전문가
                  <br />
                  상담{" "}
                  <span className="font-semibold text-[#1E2A78]">검토</span>
                </p>
              </div>

              <div className="rounded-2xl bg-[#EEF3FF] px-6 py-7 shadow-[0_12px_30px_rgba(80,110,230,0.15)] ring-1 ring-white/70">
                <div className="mx-auto mb-5 h-28 w-28 rounded-full bg-white/70 flex items-center justify-center">
                  <CubeIcon className="h-12 w-12 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-3 flex h-7 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[11px] font-semibold">
                  STEP 03
                </div>
                <p className="text-center text-sm text-[#5B5A74]">
                  맞춤
                  <br />
                  소분{" "}
                  <span className="font-semibold text-[#1E2A78]">패키징</span>
                </p>
              </div>

              <div className="rounded-2xl bg-[#EEF3FF] px-6 py-7 shadow-[0_12px_30px_rgba(80,110,230,0.15)] ring-1 ring-white/70">
                <div className="mx-auto mb-5 h-28 w-28 rounded-full bg-white/70 flex items-center justify-center">
                  <BoltIcon className="h-12 w-12 text-[#4F68FF]" />
                </div>
                <div className="mx-auto mb-3 flex h-7 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#4A6BFF] text-white text-[11px] font-semibold">
                  STEP 04
                </div>
                <p className="text-center text-sm text-[#5B5A74]">
                  지속 케어
                  <br />&{" "}
                  <span className="font-semibold text-[#1E2A78]">피드백</span>
                </p>
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="h-8 w-8 rotate-45 rounded-[6px] border border-[#D3DBFF] bg-white shadow-[0_8px_24px_rgba(80,110,230,0.18)]" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
