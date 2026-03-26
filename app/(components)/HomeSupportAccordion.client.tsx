"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState, type ReactNode } from "react";
import SmoothAccordion from "@/components/common/SmoothAccordion.client";

type HomeSupportAccordionProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
  sectionClassName?: string;
};

export default function HomeSupportAccordion({
  eyebrow,
  title,
  description,
  children,
  defaultOpen = false,
  sectionClassName = "",
}: HomeSupportAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`w-full max-w-[640px] mx-auto mt-6 px-4 sm:mt-8 ${sectionClassName}`}
    >
      <SmoothAccordion
        open={open}
        onToggle={() => setOpen((prev) => !prev)}
        className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_14px_40px_-34px_rgba(15,23,42,0.2)]"
        buttonClassName="px-5 py-4 sm:px-6 sm:py-5"
        panelClassName="border-t border-slate-200 bg-slate-50/60"
        panelInnerClassName="px-4 py-4 sm:px-6"
        summary={
          <>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900 sm:text-[18px]">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </>
        }
        indicator={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-500 transition-all duration-300">
            <span
              className={`transition-[opacity,transform] duration-300 ${
                open ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
              }`}
            >
              {open ? "접기" : "열기"}
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            />
          </span>
        }
      >
        {children}
      </SmoothAccordion>
    </section>
  );
}
