"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedAssessResult } from "@/app/chat/hooks/useChat.results";
import PersonalizedTrustPanel from "@/components/common/PersonalizedTrustPanel";
import { usePersonalizedTrustSummary } from "@/components/common/usePersonalizedTrustSummary";
import { descOf, labelOf } from "@/lib/categories";
import type { CSectionResult } from "./CSection";
import { sectionA, sectionB, type Question } from "../data/questions";

interface Props {
  cResult: CSectionResult;
  answers: Record<string, unknown>;
  recommendedIds: number[];
  onBack: () => void;
  onReset: () => void;
  showLoading: () => void;
}

const ALL_ASSESS_QUESTIONS = [...sectionA, ...sectionB];

function formatAssessAnswer(question: Question, value: unknown) {
  if (value == null) return "";

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const option = question.options?.find((item) => item.value === entry);
        return option?.label || String(entry);
      })
      .filter(Boolean)
      .join(", ");
  }

  const option = question.options?.find((item) => item.value === value);
  if (option?.label) return option.label;

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return typeof value === "string" ? value : "";
}

function buildLocalAssessResult(
  cResult: CSectionResult,
  answers: Record<string, unknown>
): NormalizedAssessResult {
  const detailedAnswers: NormalizedAssessResult["answers"] = [];

  for (const question of ALL_ASSESS_QUESTIONS) {
    const answer = formatAssessAnswer(question, answers[question.id]);
    if (!answer) continue;
    detailedAnswers.push({
      question: question.text,
      answer,
    });
  }

  return {
    createdAt: Date.now(),
    summary: cResult.catsOrdered.map((code, index) => {
      const percent = Math.min(100, cResult.percents[index] * 100);
      return `${labelOf(code)} ${percent.toFixed(1)}%`;
    }),
    answers: detailedAnswers,
  };
}

export default function DoneSection({
  cResult,
  answers,
  recommendedIds,
  onBack,
  onReset,
  showLoading,
}: Props) {
  const [play, setPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPlay(true);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const items = useMemo(
    () =>
      cResult.catsOrdered.map((code, index) => ({
        key: code,
        label: labelOf(code),
        desc: descOf(code),
        percent: Math.min(100, cResult.percents[index] * 100),
        rank: index + 1,
      })),
    [cResult]
  );

  const localAssessResult = useMemo(
    () => buildLocalAssessResult(cResult, answers),
    [cResult, answers]
  );
  const trustSummary = usePersonalizedTrustSummary({
    assessResult: localAssessResult,
  });

  return (
    <div className="mx-auto w-full px-4 pb-24 sm:w-[640px] sm:pb-28 lg:w-[760px]">
      <div
        ref={containerRef}
        className="relative mt-4 overflow-hidden rounded-2xl bg-white/80 p-4 shadow-none sm:mt-10 sm:rounded-3xl sm:p-10 sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] sm:ring-1 sm:ring-black/5 sm:backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_-10%,#7dd3fc,transparent_50%),radial-gradient(60%_60%_at_80%_-10%,#a78bfa,transparent_50%)] opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,rgba(0,0,0,0.3),transparent_70%)] sm:opacity-60" />

        <div className="relative z-10 mb-5 flex justify-between text-xs text-gray-500 sm:mb-6">
          <button
            onClick={onBack}
            className="select-none underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation"
          >
            이전
          </button>
          <button
            onClick={onReset}
            className="select-none underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation"
          >
            다시하기
          </button>
        </div>

        <h1 className="relative z-10 mb-1 text-xl font-extrabold text-gray-900 sm:text-2xl">
          맞춤 추천 결과
        </h1>
        <p className="relative z-10 mb-5 text-[13px] text-gray-600 sm:mb-6 sm:text-sm">
          입력한 답변을 바탕으로 먼저 보기 좋은 방향을 정리했어요. 아래 결과는
          가볍게 비교해보는 기준으로 봐주세요.
        </p>

        <ul className="relative z-10 space-y-3 sm:space-y-4">
          {items.map((item, index) => (
            <ResultItem
              key={item.key}
              item={item}
              play={play}
              delayMs={index * 120}
            />
          ))}
        </ul>

        <div className="relative z-10 mt-7 sm:mt-8">
          <PersonalizedTrustPanel summary={trustSummary} />
        </div>

        <p className="relative z-10 mt-5 text-center text-[13px] text-gray-600 sm:mt-6 sm:text-sm">
          아래 버튼을 누르면 추천 카테고리가 적용된 상품 목록으로 바로
          이동해요.
        </p>
        <div className="relative z-10 mt-3 flex justify-center sm:mt-4">
          <Link
            href={`/explore${
              recommendedIds.length
                ? `?categories=${recommendedIds.join(",")}`
                : ""
            }#home-products`}
            className="group relative inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow transition-all will-change-transform hover:brightness-110 active:translate-y-[1px] sm:w-2/3 sm:px-6"
            onClick={showLoading}
          >
            <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            추천 상품 보러 가기
          </Link>
        </div>

        <style jsx>{`
          @keyframes fillBar {
            from {
              width: 0%;
            }
            to {
              width: var(--w);
            }
          }
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          @keyframes popIn {
            0% {
              transform: translateY(8px) scale(0.98);
              opacity: 0;
            }
            100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function ResultItem({
  item,
  play,
  delayMs,
}: {
  item: { label: string; desc: string; percent: number; rank: number };
  play: boolean;
  delayMs: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!play) return;
    const timeoutId = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timeoutId);
  }, [play, delayMs]);

  const percent = item.percent;
  const hue =
    item.rank === 1
      ? "from-amber-400 to-yellow-500"
      : item.rank === 2
        ? "from-sky-400 to-blue-500"
        : "from-violet-400 to-indigo-500";
  const glow =
    item.rank === 1
      ? "shadow-[0_0_0_3px_rgba(251,191,36,0.12)]"
      : item.rank === 2
        ? "shadow-[0_0_0_3px_rgba(56,189,248,0.12)]"
        : "shadow-[0_0_0_3px_rgba(167,139,250,0.12)]";

  return (
    <li
      className={`relative rounded-xl bg-white/70 p-3 ring-0 ${glow} sm:rounded-2xl sm:p-4 sm:ring-1 sm:ring-black/5`}
      style={{
        animation: ready ? "popIn 420ms cubic-bezier(0.22,1,0.36,1)" : "none",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-extrabold text-gray-900">
              {item.rank}
            </span>
            <span className="truncate font-semibold">{item.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="tabular-nums text-sm font-semibold text-gray-700">
            {percent.toFixed(1)}%
          </span>
          <span
            className={`hidden h-6 w-6 rounded-full bg-gradient-to-br shadow-lg sm:inline-flex ${hue}`}
          />
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200/80">
        <div className="relative h-full w-full">
          <div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${hue}`}
            style={
              ready
                ? {
                    ["--w" as any]: `${item.percent}%`,
                    animation: "fillBar 900ms ease-out forwards",
                  }
                : { width: 0 }
            }
          />
          <div
            className="absolute inset-y-0 w-24 bg-white/25 blur-sm mix-blend-overlay"
            style={
              ready
                ? {
                    animation: "shimmer 1600ms linear infinite",
                    animationDelay: "120ms",
                  }
                : { opacity: 0 }
            }
          />
        </div>
      </div>

      <p className="mt-2 text-[13px] text-gray-600 sm:text-sm">{item.desc}</p>
    </li>
  );
}
