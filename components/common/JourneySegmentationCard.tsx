"use client";

import type { UserContextSummary } from "@/lib/chat/context";

type JourneySegmentationCardProps = {
  segment: UserContextSummary["journeySegment"];
  primaryAction?: {
    label: string;
    onClick: () => void;
  } | null;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } | null;
  className?: string;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(segmentId: UserContextSummary["journeySegment"]["id"]) {
  if (segmentId === "safety_first_manager") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  }
  if (segmentId === "steady_maintainer") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    };
  }
  if (segmentId === "drifting_returner") {
    return {
      shell:
        "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50",
      badge: "bg-cyan-100 text-cyan-800",
      primary: "bg-cyan-600 hover:bg-cyan-700 text-white",
    };
  }
  if (segmentId === "guided_decider") {
    return {
      shell:
        "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50",
      badge: "bg-violet-100 text-violet-800",
      primary: "bg-violet-600 hover:bg-violet-700 text-white",
    };
  }
  if (segmentId === "goal_driven_builder") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
    };
  }
  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 hover:bg-slate-950 text-white",
  };
}

export default function JourneySegmentationCard({
  segment,
  primaryAction,
  secondaryAction,
  className,
}: JourneySegmentationCardProps) {
  const tone = resolveTone(segment.id);

  return (
    <section
      className={joinClassNames(
        "rounded-[1.75rem] border p-4 sm:p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            tone.badge
          )}
        >
          {segment.label}
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          행동 기반 세그먼트
        </span>
      </div>

      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
        {segment.headline}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{segment.summary}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{segment.helper}</p>

      {segment.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {segment.reasonLines.map((reason) => (
            <p key={reason} className="text-xs leading-5 text-slate-600">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {primaryAction || secondaryAction ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={joinClassNames(
                "rounded-2xl px-4 py-3 text-sm font-bold transition",
                tone.primary
              )}
            >
              {primaryAction.label}
            </button>
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
