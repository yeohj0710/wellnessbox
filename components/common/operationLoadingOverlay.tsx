"use client";

import Image from "next/image";

type OperationLoadingOverlayProps = {
  visible: boolean;
  title?: string;
  description?: string;
  detailLines?: string[];
  elapsedSec?: number;
  position?: "center" | "top";
};

function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function OperationLoadingOverlay({
  visible,
  title = "작업을 처리하고 있어요.",
  description = "잠시만 기다려 주세요.",
  detailLines = [],
  elapsedSec,
  position = "center",
}: OperationLoadingOverlayProps) {
  if (!visible) return null;

  const topPosition = position === "top";
  const hasElapsed =
    typeof elapsedSec === "number" && Number.isFinite(elapsedSec) && elapsedSec > 0;

  return (
    <div
      className={`fixed inset-0 z-[1300] bg-slate-900/28 backdrop-blur-[2px] ${
        topPosition
          ? "flex items-start justify-center pt-20"
          : "flex items-center justify-center"
      }`}
    >
      <div className="relative w-[min(92vw,34rem)] overflow-hidden rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.65)]">
        <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-[wb-op-progress_1.1s_ease-in-out_infinite]" />
        </div>

        <div className="flex items-start gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-400/30 to-indigo-400/30 blur-md" />
            <div className="absolute inset-0 rounded-full bg-white shadow-sm" />
            <div className="absolute inset-0 animate-spin">
              <div className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-500 shadow" />
            </div>
            <Image
              src="/logo.png"
              alt="로딩"
              width={22}
              height={22}
              className="absolute inset-0 m-auto h-[22px] w-[22px] animate-pulse"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">{title}</p>
              {hasElapsed ? (
                <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  {formatElapsed(elapsedSec)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            {detailLines.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {detailLines.map((line) => (
                  <li key={line} className="leading-5">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wb-op-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
}
