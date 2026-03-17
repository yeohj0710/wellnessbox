import Link from "next/link";
import type { MyDataCollections } from "./myDataPageData";
import { buildMyDataChangeMilestonesModel } from "./myDataChangeMilestones";
import { Pill } from "./myDataPagePrimitives";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: "neutral" | "good" | "warn") {
  if (tone === "good") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (tone === "warn") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export default function MyDataChangeMilestonesSection({
  assessResults,
  checkAiResults,
  orders,
  healthLink,
  chatSessions,
}: {
  assessResults: MyDataCollections["assessResults"];
  checkAiResults: MyDataCollections["checkAiResults"];
  orders: MyDataCollections["orders"];
  healthLink: MyDataCollections["healthLink"];
  chatSessions: MyDataCollections["chatSessions"];
}) {
  const model = buildMyDataChangeMilestonesModel({
    assessResults,
    checkAiResults,
    orders,
    healthLink,
    chatSessions,
  });

  if (!model) return null;

  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-sky-50/60 to-emerald-50/60 p-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
              {model.badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              누적 기록 마일스톤
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            {model.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {model.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>
        </div>

        {model.badges.length > 0 ? (
          <div className="flex max-w-xl flex-wrap justify-end gap-2">
            {model.badges.map((badge) => (
              <Pill key={badge}>{badge}</Pill>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {model.cards.map((card) => (
          <article
            key={`${card.label}-${card.title}`}
            className="rounded-2xl bg-white/90 p-4 ring-1 ring-white/70"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={joinClassNames(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  resolveTone(card.tone)
                )}
              >
                {card.label}
              </span>
            </div>
            <div className="mt-3 text-base font-extrabold text-slate-900">
              {card.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{card.body}</p>
          </article>
        ))}
      </div>

      {model.patternLines.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-white/85 p-4 ring-1 ring-white/70">
          <div className="text-sm font-extrabold text-slate-900">지금 읽히는 패턴</div>
          <div className="mt-3 space-y-2">
            {model.patternLines.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href={model.primaryAction.href}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-950"
        >
          {model.primaryAction.label}
        </Link>
        {model.secondaryAction ? (
          <Link
            href={model.secondaryAction.href}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {model.secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
