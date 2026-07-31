"use client";

import { ArrowDownIcon } from "@heroicons/react/24/outline";

type ScrollToBottomButtonProps = {
  show: boolean;
  onClick: () => void;
  className?: string;
};

/**
 * Way back to the newest message. Auto-scroll releases as soon as the user
 * scrolls up, so without this the only way down a long answer is to keep
 * flicking.
 */
export default function ScrollToBottomButton({
  show,
  onClick,
  className = "",
}: ScrollToBottomButtonProps) {
  return (
    <div
      className={`pointer-events-none flex justify-center transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden={!show}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={show ? 0 : -1}
        className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none"
        disabled={!show}
        aria-label="최신 메시지로 이동"
      >
        <ArrowDownIcon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
