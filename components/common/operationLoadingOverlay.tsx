"use client";

import Image from "next/image";

type OperationLoadingOverlayProps = {
  visible: boolean;
  title?: string;
  description?: string;
};

export default function OperationLoadingOverlay({
  visible,
  title = "작업을 처리하고 있어요",
  description = "잠시만 기다려 주세요.",
}: OperationLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/32 backdrop-blur-[2px]">
      <div className="relative w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.65)]">
        <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-[wb-op-progress_1s_ease-in-out_infinite]" />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-400/30 to-indigo-400/30 blur-md" />
            <div className="absolute inset-0 rounded-full bg-white shadow-sm" />
            <div className="absolute inset-0 animate-spin">
              <div className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-500 shadow" />
            </div>
            <Image
              src="/logo.png"
              alt="웰니스박스 로딩"
              width={22}
              height={22}
              className="absolute inset-0 m-auto h-[22px] w-[22px] animate-pulse"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
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
