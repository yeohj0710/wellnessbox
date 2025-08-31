"use client";

export default function LoadingOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm sm:rounded-3xl">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "0ms" }} />
        <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "120ms" }} />
        <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-40 dot" style={{ animationDelay: "240ms" }} />
      </div>
      <p className="mt-4 px-4 text-center text-slate-700 font-medium">{text}</p>
      <style jsx>{`
        .dot {
          animation: dot 1.2s ease-in-out infinite;
          will-change: opacity, transform;
        }
        @keyframes dot {
          0%, 20% {
            opacity: 0.35;
            transform: scale(0.92);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          80%, 100% {
            opacity: 0.35;
            transform: scale(0.92);
          }
        }
      `}</style>
    </div>
  );
}
