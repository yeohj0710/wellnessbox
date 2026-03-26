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
  const edgeFadeMask =
    "linear-gradient(to right, transparent 0, black 3rem, black calc(100% - 3rem), transparent 100%)";

  return (
    <div className="relative mt-8 sm:mt-10">
      <div
        className="relative overflow-hidden px-2 sm:px-0 select-none"
        style={{
          WebkitMaskImage: edgeFadeMask,
          maskImage: edgeFadeMask,
        }}
      >
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
