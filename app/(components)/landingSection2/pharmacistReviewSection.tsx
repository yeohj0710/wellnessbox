"use client";

import Image from "next/image";
import { BeakerIcon, UserCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { pretendard } from "../fonts";

interface PharmacistReviewSectionProps {
  onSelect7Day: () => void;
}

export default function PharmacistReviewSection({ onSelect7Day }: PharmacistReviewSectionProps) {
  return (
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
                7일 체험하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
