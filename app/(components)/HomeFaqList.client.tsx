"use client";

import { useState } from "react";
import SmoothAccordion from "@/components/common/SmoothAccordion.client";

type FaqItem = {
  question: string;
  answer: string;
};

type HomeFaqListProps = {
  items: readonly FaqItem[];
};

export default function HomeFaqList({ items }: HomeFaqListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
      {items.map((item, index) => {
        const open = openIndex === index;

        return (
          <SmoothAccordion
            key={item.question}
            open={open}
            onToggle={() => setOpenIndex((prev) => (prev === index ? null : index))}
            className="border-b border-slate-200 last:border-b-0"
            buttonClassName="px-4 py-4 sm:px-5"
            panelInnerClassName="px-4 pb-4 pt-0 sm:px-5"
            summary={
              <>
                <span className="text-[11px] font-semibold tracking-[0.16em] text-sky-700">
                  Q{index + 1}
                </span>
                <h3 className="mt-1 text-[15px] font-bold leading-6 text-slate-900">
                  {item.question}
                </h3>
              </>
            }
            indicator={
              <span
                className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-500 transition-all duration-300 ${
                  open
                    ? "rotate-45 border-sky-200 bg-sky-50 text-sky-700"
                    : ""
                }`}
              >
                +
              </span>
            }
          >
            <p className="rounded-[1rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {item.answer}
            </p>
          </SmoothAccordion>
        );
      })}
    </div>
  );
}
