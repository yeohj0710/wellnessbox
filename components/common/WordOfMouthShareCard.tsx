"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BetaFeatureGate from "@/components/common/BetaFeatureGate";
import { buildAbsoluteUrl } from "@/lib/shared/url";
import type { WordOfMouthShareModel } from "@/lib/word-of-mouth/engine";

type WordOfMouthShareCardProps = {
  model: WordOfMouthShareModel;
  className?: string;
  hideBehindBeta?: boolean;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveTone(tone: WordOfMouthShareModel["tone"]) {
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

export default function WordOfMouthShareCard({
  model,
  className,
  hideBehindBeta = true,
}: WordOfMouthShareCardProps) {
  const tone = resolveTone(model.tone);
  const [feedback, setFeedback] = useState("");
  const shareUrl = useMemo(() => buildAbsoluteUrl(model.sharePath), [model.sharePath]);
  const sharePayload = useMemo(
    () => `${model.shareText}\n${shareUrl}`,
    [model.shareText, shareUrl]
  );

  const handlePrimaryAction = async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: model.shareTitle,
          text: model.shareText,
          url: shareUrl,
        });
        setFeedback("공유 창을 열었어요.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePayload);
        setFeedback("공유 문구를 복사했어요.");
        return;
      }

      setFeedback("이 기기에서는 자동 공유가 어려워요.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("공유를 준비하지 못했어요. 다시 시도해 주세요.");
    }
  };

  const content = (
    <section
      className={joinClassNames("rounded-[2rem] border p-5 shadow-sm", tone.shell, className)}
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
          {model.audienceLabel}
        </span>
      </div>

      <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">
        {model.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{model.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{model.helper}</p>

      <div className="mt-4 rounded-[1.25rem] bg-white/90 p-4 ring-1 ring-white/80">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          공유 문구
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-800">{model.shareText}</p>
      </div>

      {model.reasonLines.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          {model.reasonLines.map((line) => (
            <p key={line} className="text-xs leading-5 text-slate-600">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            void handlePrimaryAction();
          }}
          className={joinClassNames(
            "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition",
            tone.primary
          )}
        >
          {model.primaryActionLabel}
        </button>
        {model.secondaryAction ? (
          <Link
            href={model.secondaryAction.href}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            {model.secondaryAction.label}
          </Link>
        ) : null}
      </div>

      {feedback ? <p className="mt-3 text-xs text-slate-500">{feedback}</p> : null}
    </section>
  );

  if (!hideBehindBeta) {
    return content;
  }

  return <BetaFeatureGate title="Beta 공유 제안">{content}</BetaFeatureGate>;
}
