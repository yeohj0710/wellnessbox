"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildDeliveryExperienceCoach,
  type DeliveryExperienceCoachModel,
  type DeliveryExperienceOrderInput,
} from "@/lib/order/delivery-experience";
import type { OrderMessage } from "./orderAccordion.types";

type DeliveryExperienceCoachCardProps = {
  order: DeliveryExperienceOrderInput;
  messages?: OrderMessage[];
  surface: "order-complete" | "my-orders";
  className?: string;
  onOpenMessages?: () => void;
};

const toneClasses = {
  sky: {
    card: "border-sky-200 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)]",
    badge: "bg-sky-100 text-sky-700",
    button: "bg-sky-500 text-white hover:bg-sky-600",
  },
  amber: {
    card: "border-amber-200 bg-[linear-gradient(180deg,#fff9f1_0%,#ffffff_100%)]",
    badge: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-white hover:bg-amber-600",
  },
  emerald: {
    card: "border-emerald-200 bg-[linear-gradient(180deg,#f3fcf6_0%,#ffffff_100%)]",
    badge: "bg-emerald-100 text-emerald-700",
    button: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
} as const;

function joinClassNames(...values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(" ");
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
    <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <ul className="mt-2 grid gap-2 pl-5 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Action({
  coach,
  toneClass,
  onOpenMessages,
}: {
  coach: DeliveryExperienceCoachModel;
  toneClass: string;
  onOpenMessages?: () => void;
}) {
  if (coach.primaryAction.kind === "none" || !coach.primaryAction.label) return null;

  if (coach.primaryAction.kind === "link") {
    return (
      <Link
        href={coach.primaryAction.href}
        className={joinClassNames(
          "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
          toneClass
        )}
      >
        {coach.primaryAction.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenMessages}
      className={joinClassNames(
        "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
        toneClass
      )}
    >
      {coach.primaryAction.label}
    </button>
  );
}

export default function DeliveryExperienceCoachCard({
  order,
  messages = [],
  surface,
  className,
  onOpenMessages,
}: DeliveryExperienceCoachCardProps) {
  const coach = useMemo(
    () =>
      buildDeliveryExperienceCoach({
        order,
        messages,
        surface,
      }),
    [messages, order, surface]
  );

  const tone = toneClasses[coach.tone];

  return (
    <section
      className={joinClassNames(
        "rounded-2xl border p-4 shadow-sm",
        tone.card,
        className
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={joinClassNames(
            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.02em]",
            tone.badge
          )}
        >
          {coach.badge}
        </span>
        <strong className="text-sm font-bold text-slate-900">{coach.title}</strong>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-700">{coach.summary}</p>

      <div className="mt-4 space-y-3">
        <Section title="지금 기대를 이렇게 잡아두면 좋아요" items={coach.expectationLines} />
        <Section title="받고 나서 첫 경험은 이렇게 가면 덜 헷갈려요" items={coach.firstExperienceLines} />
        <Section title="불안할 때는 이것만 기억해도 충분해요" items={coach.reassuranceLines} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">{coach.helper}</p>
        <Action
          coach={coach}
          toneClass={tone.button}
          onOpenMessages={onOpenMessages}
        />
      </div>
    </section>
  );
}
