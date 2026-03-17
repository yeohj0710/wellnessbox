import type { PharmUser360Summary } from "@/lib/pharm/user-360";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type PharmUser360SectionProps = {
  summary: PharmUser360Summary | null;
};

export function PharmUser360Section({ summary }: PharmUser360SectionProps) {
  if (!summary) return null;

  const tone =
    summary.tone === "strong"
      ? {
          shell:
            "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50",
          badge: "bg-rose-100 text-rose-700",
          chip: "border-rose-200 bg-white/85 text-rose-700",
          dot: "bg-rose-400",
          action: "border-rose-200 bg-rose-50/80",
        }
      : summary.tone === "medium"
      ? {
          shell:
            "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50",
          badge: "bg-sky-100 text-sky-700",
          chip: "border-sky-200 bg-white/85 text-sky-700",
          dot: "bg-sky-400",
          action: "border-sky-200 bg-sky-50/80",
        }
      : {
          shell:
            "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100",
          badge: "bg-slate-200 text-slate-700",
          chip: "border-slate-200 bg-white/85 text-slate-700",
          dot: "bg-slate-400",
          action: "border-slate-200 bg-slate-50/80",
        };

  return (
    <section
      className={joinClassNames(
        "mt-8 rounded-[1.75rem] border p-4 sm:p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]",
        tone.shell
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
              사용자 360
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              주문 밖 맥락까지 함께 보기
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900">
            {summary.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {summary.summary}
          </p>
        </div>
      </div>

      {summary.statBadges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.statBadges.map((badge) => (
            <span
              key={badge}
              className={joinClassNames(
                "rounded-full border px-3 py-1 text-[11px] font-semibold sm:text-xs",
                tone.chip
              )}
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
          <div className="text-sm font-bold text-slate-900">핵심 맥락</div>
          <ul className="mt-3 space-y-2">
            {summary.contextLines.map((line) => (
              <li key={line} className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm">
                <span
                  className={joinClassNames(
                    "mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full",
                    tone.dot
                  )}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
          <div className="text-sm font-bold text-slate-900">최근 변화</div>
          {summary.recentChangeLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {summary.recentChangeLines.map((line) => (
                <li key={line} className="text-xs leading-5 text-slate-600 sm:text-sm">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-500 sm:text-sm">
              주문 외에 이어진 최근 변화 신호는 아직 많지 않아요.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
          <div className="text-sm font-bold text-slate-900">주의 포인트</div>
          {summary.cautionLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {summary.cautionLines.map((line) => (
                <li key={line} className="text-xs leading-5 text-slate-600 sm:text-sm">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-500 sm:text-sm">
              사용자 레벨의 뚜렷한 주의 신호는 아직 크지 않아요.
            </p>
          )}
        </div>

        <div
          className={joinClassNames(
            "rounded-2xl border p-4 ring-1 ring-white/70",
            tone.action
          )}
        >
          <div className="text-sm font-bold text-slate-900">지금 필요한 액션</div>
          <ul className="mt-3 space-y-2">
            {summary.nextActionLines.map((line) => (
              <li key={line} className="text-xs leading-5 font-medium text-slate-700 sm:text-sm">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
