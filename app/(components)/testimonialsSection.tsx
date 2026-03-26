"use client";

import { pretendard } from "../fonts";
import { TESTIMONIAL_ITEMS } from "./testimonials.content";
import { useTestimonialsCarousel } from "./useTestimonialsCarousel";
import { TestimonialsCarouselViewport } from "./testimonialsCarouselViewport";

export default function TestimonialsSection() {
  const { trackRef, progress, itemsLocal } = useTestimonialsCarousel(TESTIMONIAL_ITEMS);

  return (
    <section
      className={`relative isolate -mt-px w-full overflow-hidden bg-[linear-gradient(180deg,#FBFCFF_0%,#F6F8FF_42%,#EEF3FF_100%)] py-16 sm:py-20 md:py-24 ${pretendard.className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 -bottom-14 h-28 bg-[linear-gradient(to_top,#EEF3FF,rgba(238,243,255,0))]" />
      <div className="pointer-events-none absolute -left-32 top-36 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,255,0.08),transparent)]" />
      <div className="pointer-events-none absolute -right-32 top-40 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,255,0.08),transparent)]" />

      <div className="relative mx-auto max-w-[100rem] px-4 sm:px-6 md:px-10">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#4B63E6]">
            REAL EXPERIENCES
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F1222]">
            나만을 위한 웰니스,
            <br />
            구독자들의 이야기가{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1E40FF] via-[#3B5BFF] to-[#6C4DFF]">
              이어집니다.
            </span>
          </h2>
        </div>

        <TestimonialsCarouselViewport
          trackRef={trackRef}
          items={itemsLocal}
          progress={progress}
        />
      </div>
    </section>
  );
}
