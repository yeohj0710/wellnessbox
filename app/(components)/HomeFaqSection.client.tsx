"use client";

import Link from "next/link";
import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type HomeFaqSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly FaqItem[];
  aboutHref: string;
  aboutLabel: string;
  contactHref: string;
  contactLabel: string;
};

export default function HomeFaqSection({
  eyebrow,
  title,
  description,
  items,
  aboutHref,
  aboutLabel,
  contactHref,
  contactLabel,
}: HomeFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] pb-16 pt-6 sm:pb-24">
      <div className="w-full max-w-[640px] mx-auto px-4">
        <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:gap-5">
          <div className="rounded-[1.9rem] border border-[#e7edf6] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] p-6 shadow-[0_20px_55px_-48px_rgba(15,23,42,0.3)] sm:p-7">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#4a78ff]">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-[1.7rem] font-black tracking-[-0.03em] text-slate-900 sm:text-[2rem]">
              {title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href={aboutHref}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#b8c8ff] hover:text-[#3357e8]"
              >
                {aboutLabel}
              </Link>
              <Link
                href={contactHref}
                className="rounded-full border border-transparent bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {contactLabel}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <article
                  key={item.question}
                  className={`overflow-hidden rounded-[1.45rem] border transition-all duration-200 ${
                    isOpen
                      ? "border-[#cfdcff] bg-white shadow-[0_18px_40px_-34px_rgba(74,120,255,0.28)]"
                      : "border-slate-200 bg-white/92 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIndex((current) => (current === index ? null : index))
                    }
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold tracking-[0.18em] text-[#4a78ff]">
                        Q{index + 1}
                      </span>
                      <h3 className="mt-1 text-[15px] font-bold leading-6 text-slate-900 sm:text-[17px]">
                        {item.question}
                      </h3>
                    </div>
                    <span
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg transition ${
                        isOpen
                          ? "border-[#cfdcff] bg-[#eef3ff] text-[#3357e8] rotate-45"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      +
                    </span>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        <div className="rounded-[1.2rem] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)] px-4 py-4 text-sm leading-7 text-slate-600 ring-1 ring-inset ring-slate-200/80">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
