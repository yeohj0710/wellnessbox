"use client";

import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";

type LoadingScreenProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  layout?: "default" | "detail";
};

function LoadingBlock({ className }: { className: string }) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl bg-slate-200/80",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)] before:animate-[wb-loading-shimmer_1.2s_ease-in-out_infinite]",
        className,
      ].join(" ")}
    />
  );
}

export default function LoadingScreen({
  eyebrow = "\uD654\uBA74 \uC900\uBE44 \uC911",
  title = "\uC7A0\uC2DC\uB9CC\uC694",
  description = "\uAE08\uBC29 \uC774\uC5B4\uC9D1\uB2C8\uB2E4.",
  layout = "default",
}: LoadingScreenProps) {
  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.28)_0%,_rgba(248,250,252,0.96)_46%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <div className="grid gap-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] ring-1 ring-white/70 backdrop-blur sm:p-8">
            <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/90 px-3 py-1 text-[11px] font-semibold text-sky-700">
              <InlineSpinnerLabel
                label={eyebrow}
                spinnerClassName="text-sky-500"
                className="gap-2"
              />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.2rem]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">{description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={`loading-kpi-${item}`}
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4"
                >
                  <LoadingBlock className="h-3 w-20" />
                  <LoadingBlock className="mt-4 h-8 w-24" />
                  <LoadingBlock className="mt-4 h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </section>

          <section
            className={[
              "grid gap-6",
              layout === "detail"
                ? "lg:grid-cols-[minmax(0,1fr)_18rem]"
                : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]",
            ].join(" ")}
          >
            <div className="rounded-[28px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] sm:p-6">
              <LoadingBlock className="h-4 w-24" />
              <LoadingBlock className="mt-4 h-9 w-2/3" />
              <LoadingBlock className="mt-3 h-4 w-full" />
              <LoadingBlock className="mt-2 h-4 w-5/6" />
              <LoadingBlock className="mt-6 h-56 w-full rounded-[24px]" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <LoadingBlock className="h-24 w-full" />
                <LoadingBlock className="h-24 w-full" />
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.26)]">
                <LoadingBlock className="h-4 w-20" />
                <LoadingBlock className="mt-4 h-3 w-full" />
                <LoadingBlock className="mt-2 h-3 w-5/6" />
                <LoadingBlock className="mt-2 h-3 w-2/3" />
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.26)]">
                <LoadingBlock className="h-4 w-24" />
                <LoadingBlock className="mt-4 h-10 w-full rounded-2xl" />
                <LoadingBlock className="mt-3 h-10 w-full rounded-2xl" />
                {layout === "detail" ? (
                  <LoadingBlock className="mt-3 h-28 w-full rounded-[20px]" />
                ) : (
                  <LoadingBlock className="mt-3 h-16 w-full rounded-[20px]" />
                )}
              </div>
            </aside>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wb-loading-shimmer {
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </section>
  );
}
