"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildAbsoluteUrl } from "@/lib/shared/url";
import {
  buildOfflineTouchpointCoach,
  type OfflineTouchpointOrderInput,
} from "@/lib/order/offline-touchpoint";
import type { OrderMessage } from "./orderAccordion.types";

type OfflineTouchpointCoachCardProps = {
  order: OfflineTouchpointOrderInput;
  messages?: OrderMessage[];
  surface: "order-complete" | "my-orders";
  className?: string;
};

const toneClasses = {
  sky: {
    card: "border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]",
    badge: "bg-sky-100 text-sky-700",
    button: "bg-sky-500 text-white hover:bg-sky-600",
  },
  emerald: {
    card: "border-emerald-200 bg-[linear-gradient(180deg,#f4fcf7_0%,#ffffff_100%)]",
    badge: "bg-emerald-100 text-emerald-700",
    button: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
} as const;

function joinClassNames(...values: Array<string | false | null | undefined>) {
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

export default function OfflineTouchpointCoachCard({
  order,
  messages = [],
  surface,
  className,
}: OfflineTouchpointCoachCardProps) {
  const coach = useMemo(
    () =>
      buildOfflineTouchpointCoach({
        order,
        messages,
        surface,
      }),
    [messages, order, surface]
  );
  const tone = toneClasses[coach.tone];
  const [feedback, setFeedback] = useState("");
  const shareUrl = useMemo(() => buildAbsoluteUrl(coach.primaryHref), [coach.primaryHref]);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: coach.shareTitle,
          text: coach.shareText,
          url: shareUrl,
        });
        setFeedback("다른 기기나 가족에게 열 링크를 공유했어요.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("오프라인 QR용 링크를 복사했어요.");
        return;
      }

      setFeedback("이 기기에서는 자동 공유가 열리지 않아요.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("링크를 준비하지 못했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <section
      className={joinClassNames("rounded-2xl border p-4 shadow-sm", tone.card, className)}
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

      <div className="mt-4 rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200">
        <div className="text-sm font-bold text-slate-900">{coach.qrLabel}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{coach.qrSummary}</p>
      </div>

      <div className="mt-4 space-y-3">
        <Section title="지금 한 번만 정해두면 좋은 것" items={coach.stepLines} />
        <Section title="동봉 QR·안내문에서 특히 중요한 포인트" items={coach.insertLines} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={coach.primaryHref}
          className={joinClassNames(
            "inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
            tone.button
          )}
        >
          {coach.primaryActionLabel}
        </Link>
        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          QR 링크 복사·공유
        </button>
        <Link
          href={coach.secondaryHref}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          {coach.secondaryLabel}
        </Link>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">{coach.helper}</p>
      {feedback ? <p className="mt-2 text-xs text-slate-500">{feedback}</p> : null}
    </section>
  );
}
