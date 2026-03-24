"use client";

import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type HomeAccordionProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  helper?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  contentClassName?: string;
};

type HomeAccordionItemProps = {
  label?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function HomeAccordion({
  eyebrow,
  title,
  helper,
  children,
  defaultOpen = false,
  contentClassName = "",
}: HomeAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reducedMotion = useReducedMotion();

  const contentStyle = useMemo(
    () => ({
      gridTemplateRows: open ? "1fr" : "0fr",
      transitionDuration: reducedMotion ? "0ms" : "360ms",
    }),
    [open, reducedMotion]
  );

  const bodyClassName = [
    "border-t border-[#e5eadf] bg-[#fcfbf8]",
    "transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)]",
    open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
    contentClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-hidden rounded-[1.8rem] bg-white shadow-[0_22px_44px_-34px_rgba(23,32,51,0.18)] ring-1 ring-[#e3e8df]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>
          <h2 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-[#172033]">
            {title}
          </h2>
          {helper ? (
            <p className="mt-2 max-w-[40rem] text-sm leading-7 text-[#657082]">
              {helper}
            </p>
          ) : null}
        </div>

        <span className="mt-1 inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f6f8f3] px-3.5 py-2 text-sm font-semibold text-[#4a5564] ring-1 ring-[#dfe5dc] transition duration-300 group-hover:bg-[#eef2ff] group-hover:text-[#4960e8]">
          <span>{open ? "닫기" : "열기"}</span>
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={contentStyle}
      >
        <div className="overflow-hidden">
          <div
            className={bodyClassName}
            style={{
              transitionDuration: reducedMotion ? "0ms" : "300ms",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeAccordionItem({
  label,
  title,
  children,
  defaultOpen = false,
}: HomeAccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reducedMotion = useReducedMotion();

  const contentStyle = useMemo(
    () => ({
      gridTemplateRows: open ? "1fr" : "0fr",
      transitionDuration: reducedMotion ? "0ms" : "280ms",
    }),
    [open, reducedMotion]
  );

  return (
    <div className="border-b border-[#e5eadf] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
      >
        <div className="min-w-0">
          {label ? (
            <span className="text-xs font-semibold tracking-[0.14em] text-[#4d63e0]">
              {label}
            </span>
          ) : null}
          <h3 className="mt-1 text-base font-semibold leading-7 text-[#172033]">
            {title}
          </h3>
        </div>

        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#536172] ring-1 ring-[#dfe5dc] transition duration-300">
          <PlusIcon
            className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "rotate-45" : ""
            }`}
          />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={contentStyle}
      >
        <div className="overflow-hidden">
          <div
            className={`px-4 pb-4 transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
            style={{
              transitionDuration: reducedMotion ? "0ms" : "240ms",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
