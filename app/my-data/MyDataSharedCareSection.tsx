import Link from "next/link";
import { resolveSharedCareModel } from "@/lib/shared-care/engine";
import type { MyDataCollections } from "./myDataPageData";
import { buildMyDataContextSummary } from "./myDataJourneyInsights";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: "slate" | "sky" | "emerald" | "amber") {
  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
      badge: "bg-emerald-100 text-emerald-800",
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      primary: "bg-sky-600 hover:bg-sky-700 text-white",
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

export default function MyDataSharedCareSection({
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
  const summary = buildMyDataContextSummary({
    profileData,
    assessResults,
    checkAiResults,
    orders,
    healthLink,
    chatSessions,
  });
  const model = resolveSharedCareModel({
    summary,
    surface: "my-data",
  });
  const tone = resolveTone(model.tone);

  return (
    <section
      id="my-data-shared-care"
      className={joinClassNames(
        "mt-6 rounded-[2rem] border p-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)]",
        tone.shell
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            tone.badge
          )}
        >
          {model.badgeLabel}
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          가족·커플·보호자 맥락
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
        {model.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{model.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>

      {model.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {model.reasonLines.map((line) => (
            <p key={line} className="text-xs leading-5 text-slate-600">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {model.promptActions.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-white/85 p-4 ring-1 ring-white/70">
          <div className="text-sm font-extrabold text-slate-900">
            가족과 같이 볼 때 바로 쓸 질문
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.promptActions.map((action) => (
              <Link
                key={action.label}
                href={`/chat?from=/my-data&draft=${encodeURIComponent(action.prompt)}`}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href={model.primaryAction.href}
          className={joinClassNames(
            "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
            tone.primary
          )}
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
