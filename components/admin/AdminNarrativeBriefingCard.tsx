import { loadAiExperimentSummary } from "@/lib/ai-experiments/service";
import { buildAdminNarrativeBriefing } from "@/lib/admin/narrative-briefing";

export default async function AdminNarrativeBriefingCard() {
  const summary = await loadAiExperimentSummary({
    experimentKey: "explore_education_entry_v1",
    windowDays: 14,
  });
  const briefing = buildAdminNarrativeBriefing(summary);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.48)]">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-200/80">
          Admin Briefing
        </p>
        <h2 className="text-xl font-black tracking-[-0.03em] text-white">
          {briefing.headline}
        </h2>
        <p className="text-sm leading-6 text-slate-200">{briefing.summary}</p>
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

      <div className="mt-5 rounded-[24px] bg-white/6 p-4 ring-1 ring-white/10">
        <div className="text-xs font-semibold text-emerald-200">그래서 지금 할 일</div>
        <div className="mt-3 space-y-2">
          {briefing.actionLines.map((line) => (
            <p key={line} className="text-sm leading-6 text-slate-100">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
