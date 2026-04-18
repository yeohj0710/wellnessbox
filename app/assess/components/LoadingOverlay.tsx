"use client";

export default function LoadingOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/88 backdrop-blur-sm sm:rounded-3xl">
      <div className="w-[min(90%,21rem)] overflow-hidden rounded-[24px] border border-sky-100/90 bg-white/95 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.42)]">
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-[wb-assess-loading_1.1s_ease-in-out_infinite]" />
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 shadow-sm">
            <span
              aria-hidden
              className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-r-transparent"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{text}</p>
            <p className="mt-2 text-xs text-slate-500">곧 다음 단계로 이어집니다.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wb-assess-loading {
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
