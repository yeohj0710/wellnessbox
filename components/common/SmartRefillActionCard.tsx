"use client";

import Link from "next/link";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import { useSmartRefillAction } from "./useSmartRefillAction";
import type { SmartRefillSurface } from "@/lib/refill-timing/engine";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(status: "watch" | "due" | "overdue") {
  if (status === "overdue") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_14px_34px_-24px_rgba(217,119,6,0.45)]",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 text-white hover:bg-amber-600",
      dot: "bg-amber-400",
    };
  }

  if (status === "due") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.35)]",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 text-white hover:bg-sky-600",
      dot: "bg-sky-400",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 text-white hover:bg-slate-950",
    dot: "bg-slate-400",
  };
}

export default function SmartRefillActionCard({
  orders,
  surface,
  enableRemoteContext = false,
  className,
  hideBehindBeta = true,
}: {
  orders: unknown[];
  surface: SmartRefillSurface;
  enableRemoteContext?: boolean;
  className?: string;
  hideBehindBeta?: boolean;
}) {
  const { action, loading, handlePrimaryAction, feedback } = useSmartRefillAction({
    surface,
    orders,
    enableRemoteContext,
  });

  if (loading || !action) return null;

  const tone = resolveTone(action.status);
  const badgeLabel =
    action.status === "overdue"
      ? "리필이 끊기기 쉬운 시점"
      : action.status === "due"
      ? "지금 다시 담기 좋은 시점"
      : "리필 제안";

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
              Smart Refill Trigger
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
          <div className="text-[11px] font-semibold text-slate-500">리필 타이밍</div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {action.elapsedDays}일째 / 예상 {action.targetDays}일
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            보통 {action.triggerDay}일 이후부터 다시 담기 좋아요
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
        <div className="text-[11px] font-semibold text-slate-500">현재 cadence 해석</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {action.cadenceLabel}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {action.cadenceHelper}
        </p>
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

      {feedback ? (
        <p className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-white/70">
          {feedback}
        </p>
      ) : null}

      <div className="mt-4">
        {action.ctaType === "reorder" ? (
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={joinClassNames(
              "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
              tone.primary
            )}
          >
            {action.ctaLabel}
          </button>
        ) : action.href ? (
          <Link
            href={action.href}
            className={joinClassNames(
              "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
              tone.primary
            )}
          >
            {action.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 리필 타이밍">{content}</BetaFeatureGate>;
}
