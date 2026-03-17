import type { OrderAccordionOrder } from "@/components/order/orderAccordion.types";
import { buildPharmNarrativeBriefing } from "@/lib/pharm/narrative-briefing";

export function PharmNarrativeBriefingCard({
  inboxOrders,
  feedbackOrders,
}: {
  inboxOrders: OrderAccordionOrder[];
  feedbackOrders: OrderAccordionOrder[];
}) {
  const briefing = buildPharmNarrativeBriefing({
    inboxOrders,
    feedbackOrders,
  });
  if (!briefing) return null;

  return (
    <div className="mx-auto w-full max-w-[640px] rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.72)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
            운영 브리핑
          </div>
          <h2 className="mt-2 text-lg font-extrabold tracking-tight text-white">
            {briefing.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">{briefing.summary}</p>
        </div>
      </div>

      {briefing.statBadges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {briefing.statBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 ring-1 ring-white/10"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
          <div className="text-xs font-semibold text-sky-200">그래서 지금 할 일</div>
          <div className="mt-3 space-y-2">
            {briefing.actionLines.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-100">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
          <div className="text-xs font-semibold text-amber-200">
            놓치기 쉬운 흐름
          </div>
          <div className="mt-3 space-y-2">
            {briefing.blindspotLines.length > 0 ? (
              briefing.blindspotLines.map((line) => (
                <p key={line} className="text-sm leading-6 text-slate-200">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-200">
                지금은 급한 이상징후보다 기본 응답 속도와 요청사항 확인만 유지해도 흐름이 크게 흔들리지 않아요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
