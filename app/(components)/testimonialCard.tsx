"use client";

import Image from "next/image";
import type { TestimonialItem } from "./testimonials.types";

type TestimonialCardProps = {
  testimonial: TestimonialItem;
};

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <article className="flex-none w-[290px] sm:w-[360px] md:w-[420px] rounded-[22px] bg-white ring-1 ring-[#E7E9FF] shadow-[0_18px_60px_-20px_rgba(67,103,230,0.25)] overflow-hidden">
      <div className="relative h-[170px] sm:h-[190px] md:h-[210px]">
        <Image
          src={testimonial.img}
          alt={testimonial.name}
          fill
          sizes="(min-width:1024px) 420px, 70vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#2F45B0_0%,rgba(98,123,247,0)_100%)] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2F45B0]/70 via-[#2F45B0]/40 to-transparent" />
        <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#3341FF]">
          {testimonial.rating}
        </div>
        <div className="absolute left-4 bottom-4 flex items-center gap-3 text-white">
          <span className="h-6 w-6 rounded-full bg-white/85 ring-1 ring-white/70" />
          <div>
            <div className="text-sm font-semibold leading-none">
              {testimonial.name}
            </div>
            <div className="mt-1 text-[11px] opacity-90">{testimonial.role}</div>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5">
        <h3 className="text-base sm:text-lg font-extrabold text-[#0F1222]">
          {testimonial.headline}
        </h3>
        <p className="mt-2 text-[13px] sm:text-sm leading-relaxed text-[#4B5168]">
          {testimonial.body}
        </p>
      </div>
    </article>
  );
}
