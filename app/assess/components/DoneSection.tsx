"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CSectionResult } from "./CSection";
import { labelOf, descOf } from "../lib/categories";

interface Props {
  cResult: CSectionResult;
  recommendedIds: number[];
  onBack: () => void;
  onReset: () => void;
  showLoading: () => void;
}

function useCountUp(target: number, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      setValue(target * p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

export default function DoneSection({
  cResult,
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
      cResult.catsOrdered.map((c, i) => ({
        key: c,
        label: labelOf(c),
        desc: descOf(c),
        percent: Math.min(100, cResult.percents[i] * 100),
        rank: i + 1,
      })),
    [cResult]
  );

  return (
    <div className="w-full max-w-[760px] mx-auto px-3 sm:px-4 pb-24 sm:pb-28">
      <div
        ref={containerRef}
        className="relative mt-4 sm:mt-10 overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 p-4 sm:p-10 shadow-none sm:shadow-[0_10px_40px_rgba(2,6,23,0.08)] ring-0 sm:ring-1 sm:ring-black/5 backdrop-blur-0 sm:backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,rgba(0,0,0,0.3),transparent_70%)] bg-[radial-gradient(60%_60%_at_20%_-10%,#7dd3fc,transparent_50%),radial-gradient(60%_60%_at_80%_-10%,#a78bfa,transparent_50%)] opacity-50 sm:opacity-60" />
        <div className="flex justify-between text-xs text-gray-500 mb-5 sm:mb-6 relative z-10">
          <button
            onClick={onBack}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            이전
          </button>
          <button
            onClick={onReset}
            className="underline hover:text-gray-700 [-webkit-tap-highlight-color:transparent] touch-manipulation select-none"
          >
            다시하기
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1 relative z-10">
          맞춤 추천 결과
        </h1>
        <p className="text-[13px] sm:text-sm text-gray-600 mb-5 sm:mb-6 relative z-10">
          답변을 AI 분석하여 세 가지 영양제 카테고리를 추천드려요. 퍼센트는 현재
          상태와의 적합도를 의미해요.
        </p>

        <ul className="space-y-3 sm:space-y-4 relative z-10">
          {items.map((it, i) => (
            <ResultItem key={it.key} item={it} play={play} delayMs={i * 120} />
          ))}
        </ul>

        <p className="text-center mt-5 sm:mt-6 text-[13px] sm:text-sm text-gray-600 relative z-10">
          아래 버튼을 누르면 추천 카테고리가 적용된 상품 목록으로 이동해요.
        </p>
        <div className="mt-3 sm:mt-4 flex justify-center relative z-10">
          <Link
            href={`/explore${
              recommendedIds.length
                ? `?categories=${recommendedIds.join(",")}`
                : ""
            }#home-products`}
            className="group relative w-full sm:w-2/3 inline-flex items-center justify-center rounded-full px-5 sm:px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 shadow hover:brightness-110 active:translate-y-[1px] transition-all will-change-transform"
            onClick={showLoading}
          >
            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
            추천 제품 보러 가기
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
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [play, delayMs]);

  const p = useCountUp(item.percent, 900 + item.rank * 120, ready);
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
      className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/70 ring-0 sm:ring-1 sm:ring-black/5 ${glow}`}
      style={{
        animation: ready ? `popIn 420ms cubic-bezier(0.22,1,0.36,1)` : "none",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full text-[11px] font-extrabold text-gray-900 bg-gray-100">
              {item.rank}
            </span>
            <span className="font-semibold truncate">{item.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 tabular-nums">
            {p.toFixed(1)}%
          </span>
          <span
            className={`hidden sm:inline-flex h-6 w-6 rounded-full bg-gradient-to-br ${hue} shadow-lg`}
          />
        </div>
      </div>

      <div className="mt-3 h-2.5 rounded-full bg-gray-200/80 overflow-hidden">
        <div className="relative h-full w-full">
          <div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${hue}`}
            style={
              ready
                ? {
                    ["--w" as any]: `${item.percent}%`,
                    animation: `fillBar 900ms ease-out forwards`,
                  }
                : { width: 0 }
            }
          />
          <div
            className="absolute inset-y-0 w-24 bg-white/25 blur-sm mix-blend-overlay"
            style={
              ready
                ? {
                    animation: `shimmer 1600ms linear infinite`,
                    animationDelay: "120ms",
                  }
                : { opacity: 0 }
            }
          />
        </div>
      </div>

      <p className="mt-2 text-[13px] sm:text-sm text-gray-600">{item.desc}</p>
    </li>
  );
}
