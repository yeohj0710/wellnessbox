import type { OrderMessage, OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import {
  buildPharmInboxTriageSummary,
  buildPharmOrderTriage,
} from "@/lib/pharm/triage";
import { PharmHumanPriorityStrip } from "@/components/pharm/pharmHumanPriority";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getToneStyle(tone: ReturnType<typeof buildPharmOrderTriage>["tone"]) {
  if (tone === "urgent") {
    return {
      shell: "border-amber-200 bg-amber-50/90",
      badge: "bg-amber-100 text-amber-800",
      accent: "text-amber-700",
    };
  }

  if (tone === "attention") {
    return {
      shell: "border-sky-200 bg-sky-50/90",
      badge: "bg-sky-100 text-sky-800",
      accent: "text-sky-700",
    };
  }

  return {
    shell: "border-slate-200 bg-slate-50/90",
    badge: "bg-slate-200 text-slate-700",
    accent: "text-slate-700",
  };
}

export function PharmInboxTriageCard({
  orders,
}: {
  orders: OrderAccordionOrder[];
}) {
  const summary = buildPharmInboxTriageSummary(orders);

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            메시지 트리아지
          </div>
          <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            {summary.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{summary.summary}</p>
        </div>
        <div className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-500">누락 감지</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {summary.missingCount}건
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          우선 처리 {summary.urgentCount}건
        </span>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
          고객 답변 필요 {summary.replyCount}건
        </span>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
          상담 지연 {summary.staleCount}건
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          요청 확인 {summary.requestCount}건
        </span>
      </div>

    </div>
  );
}

export function PharmOrderTriageStrip({
  order,
  messages,
}: {
  order: OrderAccordionOrder;
  messages?: OrderMessage[];
}) {
  const triage = buildPharmOrderTriage({ order, messages });
  const style = getToneStyle(triage.tone);

  return (
    <div
      className={joinClassNames(
        "mt-4 rounded-2xl border px-4 py-3",
        style.shell
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            style.badge
          )}
        >
          {triage.toneLabel}
        </span>
        <span className="text-sm font-bold text-slate-900">{triage.nextActionLabel}</span>
      </div>

      <p className={joinClassNames("mt-2 text-sm leading-6", style.accent)}>
        {triage.nextActionDescription}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {triage.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-1">
        {triage.checklist.slice(0, 2).map((item) => (
          <p key={item} className="text-xs leading-5 text-slate-600">
            {item}
          </p>
        ))}
        {triage.missingSignals[0] ? (
          <p className="text-xs leading-5 font-medium text-slate-700">
            누락 감지: {triage.missingSignals[0]}
          </p>
        ) : null}
      </div>

      <PharmHumanPriorityStrip order={order} messages={messages} />
    </div>
  );
}
