"use client";

import {
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CubeIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { pretendard } from "@/app/fonts";

export default function ProcessSection() {
  return (
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
                상담 <span className="font-semibold text-[#1E2A78]">검토</span>
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
  );
}
