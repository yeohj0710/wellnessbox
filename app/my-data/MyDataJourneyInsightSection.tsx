import Link from "next/link";
import type { MyDataCollections } from "./myDataPageData";
import { buildMyDataJourneyInsight } from "./myDataJourneyInsights";
import { formatDate, Pill } from "./myDataPagePrimitives";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: "slate" | "sky" | "emerald" | "amber") {
  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-500 hover:bg-sky-600 text-white",
    };
  }

  if (tone === "amber") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
      primary: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
    badge: "bg-slate-200 text-slate-700",
    primary: "bg-slate-900 hover:bg-slate-950 text-white",
  };
}

export default function MyDataJourneyInsightSection({
  profileData,
  assessResults,
  checkAiResults,
  orders,
  healthLink,
  chatSessions,
}: {
  profileData: unknown;
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const insight = buildMyDataJourneyInsight({
    profileData,
    assessResults,
    checkAiResults,
    orders,
    healthLink,
    chatSessions,
  });

  if (!insight) return null;

  const tone = resolveTone(insight.tone);

  return (
    <section
      id="my-data-journey"
      className={joinClassNames(
        "mt-6 rounded-[2rem] border p-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)]",
        tone.shell
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={joinClassNames(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                tone.badge
              )}
            >
              {insight.stageLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              건강 여정 인사이트
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {insight.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {insight.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{insight.helper}</p>
        </div>

        {insight.evidenceChips.length > 0 ? (
          <div className="flex max-w-xl flex-wrap justify-end gap-2">
            {insight.evidenceChips.map((chip) => (
              <Pill key={chip}>{chip}</Pill>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {insight.changeCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white/90 p-4 ring-1 ring-white/70"
          >
            <div className="text-xs font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-base font-extrabold text-slate-900">
              {card.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{card.body}</p>
          </div>
        ))}
      </div>

      {insight.timeline.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-white/85 p-4 ring-1 ring-white/70">
          <div className="text-sm font-extrabold text-slate-900">
            최근 여정 흐름
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {insight.timeline.map((item) => (
              <div
                key={`${item.label}-${String(item.occurredAt)}`}
                className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500">
                    {formatDate(item.occurredAt)}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href={insight.primaryAction.href}
          className={joinClassNames(
            "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
            tone.primary
          )}
        >
          {insight.primaryAction.label}
        </Link>
        {insight.secondaryAction ? (
          <Link
            href={insight.secondaryAction.href}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {insight.secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
