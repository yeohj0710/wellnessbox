import { buildPharmCopilotSummary } from "@/lib/pharm/copilot";
import { buildPharmOrderTriage } from "@/lib/pharm/triage";
import type { OrderAccordionOrder, OrderMessage } from "@/components/order/orderAccordion.types";

type PharmOrderCopilotSectionProps = {
  order: OrderAccordionOrder;
  messages: OrderMessage[];
  onApplyDraft: (text: string) => void;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PharmOrderCopilotSection({
  order,
  messages,
  onApplyDraft,
}: PharmOrderCopilotSectionProps) {
  const summary = buildPharmCopilotSummary({ order, messages });
  const triage = buildPharmOrderTriage({ order, messages });
  const tone =
    summary.priorityTone === "strong"
      ? {
          shell:
            "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
          badge: "bg-amber-100 text-amber-800",
          dot: "bg-amber-400",
          button: "bg-amber-500 hover:bg-amber-600 text-white",
        }
      : summary.priorityTone === "medium"
      ? {
          shell:
            "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50",
          badge: "bg-sky-100 text-sky-800",
          dot: "bg-sky-400",
          button: "bg-sky-500 hover:bg-sky-600 text-white",
        }
      : {
          shell:
            "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100",
          badge: "bg-slate-200 text-slate-700",
          dot: "bg-slate-400",
          button: "bg-slate-900 hover:bg-slate-950 text-white",
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
              {summary.priorityLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              약사 코파일럿
            </span>
          </div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900">
            지금 바로 확인할 포인트와 응답 초안을 먼저 정리했어요
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {summary.overview}
          </p>
        </div>
      </div>

      {summary.priorityReasons.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {summary.priorityReasons.map((reason) => (
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

      <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
        <div className="text-sm font-bold text-slate-900">지금 해야 할 일</div>
        <ul className="mt-3 space-y-2">
          {triage.checklist.map((item) => (
            <li key={item} className="text-xs leading-5 text-slate-600 sm:text-sm">
              {item}
            </li>
          ))}
        </ul>
        {triage.missingSignals.length > 0 ? (
          <p className="mt-3 text-xs leading-5 font-medium text-slate-700 sm:text-sm">
            누락 감지: {triage.missingSignals[0]}
          </p>
        ) : null}
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
              현재는 기본 상담 질문과 복용 안내를 차분히 정리하면 되는 주문이에요.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
          <div className="text-sm font-bold text-slate-900">상품 설명 기반 상담 포인트</div>
          <ul className="mt-3 space-y-2">
            {summary.counselHighlights.map((line) => (
              <li key={line} className="text-xs leading-5 text-slate-600 sm:text-sm">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-white/70">
        <div className="text-sm font-bold text-slate-900">응답 초안</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          바로 전송하지 않고 입력창에 넣어드려요. 약사 검토 후 편집해서 보내세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.draftReplies.map((draft) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => onApplyDraft(draft.text)}
              className={joinClassNames(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                tone.button
              )}
            >
              {draft.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
