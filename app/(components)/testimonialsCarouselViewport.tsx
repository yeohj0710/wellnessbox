"use client";

import type { RefObject } from "react";
import type { TestimonialItem } from "./testimonials.types";
import { TestimonialCard } from "./testimonialCard";
import { TestimonialsProgressBar } from "./testimonialsProgressBar";

type TestimonialsCarouselViewportProps = {
  trackRef: RefObject<HTMLDivElement>;
  items: readonly TestimonialItem[];
  progress: number;
};

export function TestimonialsCarouselViewport({
  trackRef,
  items,
  progress,
}: TestimonialsCarouselViewportProps) {
  return (
    <div className="relative mt-8 sm:mt-10">
      <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-24 -z-10 bg-[linear-gradient(to_top,#EAF1FF,rgba(234,241,255,0))]" />
      <div className="pointer-events-none absolute -left-8 top-0 bottom-0 w-16 bg-[linear-gradient(to_right,#EAF1FF,rgba(234,241,255,0))]" />
      <div className="pointer-events-none absolute -right-8 top-0 bottom-0 w-16 bg-[linear-gradient(to_left,#EAF1FF,rgba(234,241,255,0))]" />

      <div className="relative overflow-hidden px-2 sm:px-0 select-none bg-[#EAF1FF]">
        <div
          ref={trackRef}
          className="will-change-transform flex gap-5 md:gap-6 cursor-grab"
          style={{ touchAction: "pan-y" }}
        >
          {items.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.id}-${index}`}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>

      <TestimonialsProgressBar progress={progress} />
    </div>
  );
}
