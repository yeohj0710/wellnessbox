"use client";

import Image from "next/image";
import { BoltIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { pretendard } from "@/app/fonts";

interface HealthTrackingSectionProps {
  onSelect7Day: () => void;
}

export default function HealthTrackingSection({
  onSelect7Day,
}: HealthTrackingSectionProps) {
  return (
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
  );
}
