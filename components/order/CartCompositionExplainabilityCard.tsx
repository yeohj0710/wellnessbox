"use client";

import Link from "next/link";
import { buildCartCompositionExplainability } from "@/lib/cart-composition-explainability";
import type { UserContextSummary } from "@/lib/chat/context";
import type { ResolvedCartItemRow } from "./cartItemsSection.view-model";

type CartCompositionExplainabilityCardProps = {
  items: ResolvedCartItemRow[];
  summary: UserContextSummary | null | undefined;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: "slate" | "sky" | "emerald" | "amber") {
  if (tone === "amber") {
    return {
      shell:
        "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
      badge: "bg-amber-100 text-amber-800",
      accent: "bg-amber-500 hover:bg-amber-600 text-white",
    };
  }

  if (tone === "sky") {
    return {
      shell:
        "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50",
      badge: "bg-sky-100 text-sky-800",
      accent: "bg-sky-600 hover:bg-sky-700 text-white",
    };
  }

  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
      badge: "bg-emerald-100 text-emerald-800",
      accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
    };
  }

  return {
    shell:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50",
    badge: "bg-slate-200 text-slate-700",
    accent: "bg-slate-900 hover:bg-slate-950 text-white",
  };
}

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <p key={`${title}-${item}`} className="text-xs leading-5 text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CartCompositionExplainabilityCard({
  items,
  summary,
}: CartCompositionExplainabilityCardProps) {
  const model = buildCartCompositionExplainability({
    rows: items,
    summary,
  });

  if (!model) return null;

  const tone = resolveTone(model.tone);

  return (
    <div
      className={joinClassNames(
        "rounded-[1.75rem] border px-4 py-5 shadow-sm",
        tone.shell
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={joinClassNames(
                "rounded-full px-3 py-1 text-[11px] font-semibold",
                tone.badge
              )}
            >
              {model.badgeLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              성분·구성 이해
            </span>
          </div>
          <h3 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            {model.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {model.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Section title="왜 이 조합인지" items={model.reasonLines} />
        <Section title="겹치거나 부담될 수 있는 부분" items={model.overlapLines} />
        <Section title="내 경우엔 왜 더 조심해서 봐야 하는지" items={model.cautionLines} />
      </div>

      {model.primaryAction ? (
        <div className="mt-4">
          <Link
            href={model.primaryAction.href}
            className={joinClassNames(
              "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
              tone.accent
            )}
          >
            {model.primaryAction.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
