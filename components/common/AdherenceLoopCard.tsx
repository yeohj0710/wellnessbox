"use client";

import Link from "next/link";
import { useMemo } from "react";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import { useAdherenceLoop } from "./useAdherenceLoop";
import type { AdherenceLoopSurface } from "@/lib/adherence-loop/engine";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(stage: "setup" | "check" | "adjust") {
  if (stage === "setup") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-[0_14px_34px_-24px_rgba(16,185,129,0.35)]",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 text-white hover:bg-emerald-600",
      dot: "bg-emerald-400",
    };
  }

  if (stage === "check") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.35)]",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 text-white hover:bg-sky-600",
      dot: "bg-sky-400",
    };
  }

  return {
    shell:
      "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_14px_34px_-24px_rgba(217,119,6,0.4)]",
    badge: "bg-amber-100 text-amber-800",
    primary: "bg-amber-500 text-white hover:bg-amber-600",
    dot: "bg-amber-400",
  };
}

export default function AdherenceLoopCard({
  orders,
  surface,
  enableRemoteContext = false,
  className,
  hideBehindBeta = true,
}: {
  orders: unknown[];
  surface: AdherenceLoopSurface;
  enableRemoteContext?: boolean;
  className?: string;
  hideBehindBeta?: boolean;
}) {
  const { action, loading } = useAdherenceLoop({
    surface,
    orders,
    enableRemoteContext,
  });

  const href = useMemo(() => {
    if (!action) return "";
    const params = new URLSearchParams();
    params.set("from", surface === "order-complete" ? "/order-complete" : "/my-data");
    params.set("draft", action.draftPrompt);
    return `/chat?${params.toString()}`;
  }, [action, surface]);

  if (loading || !action) return null;

  const tone = resolveTone(action.stage);
  const badgeLabel =
    action.stage === "setup"
      ? "복용 시작 루프"
      : action.stage === "check"
      ? "체감 체크 루프"
      : "구성 조정 루프";

  const content = (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-4 sm:p-5",
        tone.shell,
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={joinClassNames(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                tone.badge
              )}
            >
              {badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Smart Follow-up Loop
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            {action.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {action.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{action.helper}</p>
        </div>

        <div className="rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm ring-1 ring-white/60">
          <div className="text-[11px] font-semibold text-slate-500">지금 단계</div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            복용 {action.elapsedDays}일째
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{action.milestoneLabel}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
          <div className="text-[11px] font-semibold text-slate-500">루틴 힌트</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {action.anchorLabel}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
          <div className="text-[11px] font-semibold text-slate-500">체감 기록</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {action.trackingLabel}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
          <div className="text-[11px] font-semibold text-slate-500">현재 cadence 해석</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {action.cadenceLabel}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {action.cadenceHelper}
          </p>
        </div>
      </div>

      {action.reasonLines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {action.reasonLines.slice(0, 3).map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
            >
              <span
                className={joinClassNames(
                  "mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full",
                  tone.dot
                )}
              />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <Link
          href={href}
          className={joinClassNames(
            "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
            tone.primary
          )}
        >
          {action.ctaLabel}
        </Link>
      </div>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 복용 루프">{content}</BetaFeatureGate>;
}
