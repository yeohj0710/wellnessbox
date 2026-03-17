import { buildAdminCopyGovernanceReport } from "@/lib/admin/copy-governance";

function severityTone(severity: "high" | "medium" | "low") {
  if (severity === "high") {
    return {
      badge: "주의 먼저",
      badgeClassName:
        "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
    };
  }

  if (severity === "medium") {
    return {
      badge: "문구 조정",
      badgeClassName:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
    };
  }

  return {
    badge: "톤 정리",
    badgeClassName:
      "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  };
}

export default function AdminCopyGovernanceCard() {
  const report = buildAdminCopyGovernanceReport();

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-amber-50 via-white to-rose-50/40 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.36)]">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-700/80">
          Copy Governance
        </p>
        <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
          {report.headline}
        </h2>
        <p className="text-sm leading-6 text-slate-600">{report.summary}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {report.statBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80"
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {report.surfaceLines.map((surface) => {
          const tone = severityTone(surface.severity);
          const topFinding = surface.findings[0];

          return (
            <article
              key={surface.source}
              className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.38)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    {surface.surface}
                  </div>
                  <h3 className="text-base font-black tracking-[-0.02em] text-slate-950">
                    {surface.source}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badgeClassName}`}
                >
                  {tone.badge}
                </span>
              </div>

              {topFinding ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500">
                    가장 먼저 보이는 표현
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {topFinding.match}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {topFinding.reason}
                  </p>
                </div>
              ) : null}

              <p className="mt-4 text-sm leading-6 text-slate-700">
                {surface.action}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
