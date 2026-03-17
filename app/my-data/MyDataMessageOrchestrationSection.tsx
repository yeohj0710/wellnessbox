import type { MyDataMessageOrchestrationModel } from "@/lib/message-orchestration/engine";

function resolveTone(priority: MyDataMessageOrchestrationModel["priority"]) {
  if (priority === "quality" || priority === "consult") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_14px_34px_-24px_rgba(217,119,6,0.35)]",
      badge: "bg-amber-100 text-amber-800",
      dot: "bg-amber-400",
    };
  }

  if (priority === "adherence" || priority === "refill") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-[0_14px_34px_-24px_rgba(14,165,233,0.32)]",
      badge: "bg-sky-100 text-sky-800",
      dot: "bg-sky-400",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.22)]",
    badge: "bg-slate-200 text-slate-700",
    dot: "bg-slate-400",
  };
}

export default function MyDataMessageOrchestrationSection({
  model,
}: {
  model: MyDataMessageOrchestrationModel;
}) {
  const tone = resolveTone(model.priority);
  const badgeLabel =
    model.priority === "quality"
      ? "기록 정리 우선"
      : model.priority === "adherence"
      ? "복용 루프 우선"
      : model.priority === "refill"
      ? "리필 신호 우선"
      : model.priority === "consult"
      ? "확인 메시지 우선"
      : model.priority === "next_best"
      ? "다음 행동 1개"
      : "조용한 구간";

  return (
    <section className={`mt-6 rounded-[1.75rem] border p-4 sm:p-5 ${tone.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
            >
              {badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Message Orchestration
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            {model.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {model.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
        <div className="text-[11px] font-semibold text-slate-500">현재 cadence 해석</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {model.cadenceLabel}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{model.cadenceHelper}</p>
      </div>

      {model.reasonLines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {model.reasonLines.slice(0, 2).map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
            >
              <span
                className={`mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
              />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {model.mutedLines.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-white/70">
          <div className="text-[11px] font-semibold text-slate-500">
            지금은 잠시 줄인 메시지
          </div>
          <ul className="mt-2 space-y-2">
            {model.mutedLines.slice(0, 2).map((line) => (
              <li
                key={line}
                className="flex gap-2 text-xs leading-5 text-slate-600 sm:text-sm"
              >
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
