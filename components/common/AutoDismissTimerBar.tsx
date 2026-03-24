"use client";

import { useEffect, useRef, useState } from "react";

type AutoDismissTimerBarProps = {
  durationMs: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  label?: string;
  labelClassName?: string;
  countdownClassName?: string;
  showCountdown?: boolean;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AutoDismissTimerBar({
  durationMs,
  className,
  trackClassName,
  barClassName,
  label,
  labelClassName,
  countdownClassName,
  showCountdown = true,
}: AutoDismissTimerBarProps) {
  const safeDuration = Math.max(1, durationMs);
  const [remainingMs, setRemainingMs] = useState(safeDuration);
  const barRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    setRemainingMs(safeDuration);

    if (barRef.current) {
      animationRef.current?.cancel();
      animationRef.current = barRef.current.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        {
          duration: safeDuration,
          easing: "linear",
          fill: "forwards",
        }
      );
    }

    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextRemaining = Math.max(0, safeDuration - elapsed);
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
      animationRef.current?.cancel();
    };
  }, [safeDuration]);

  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div className={joinClasses("space-y-1.5", className)}>
      {(label || showCountdown) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <span
              className={joinClasses("text-[10px] font-medium leading-none", labelClassName)}
            >
              {label}
            </span>
          ) : (
            <span />
          )}
          {showCountdown ? (
            <span
              className={joinClasses(
                "tabular-nums text-[10px] font-semibold leading-none opacity-80",
                countdownClassName
              )}
              aria-label={`${secondsLeft}초 후 사라집니다`}
            >
              {secondsLeft}s
            </span>
          ) : null}
        </div>
      )}

      <div
        className={joinClasses(
          "relative h-2 w-full overflow-hidden rounded-full bg-white/15 ring-1 ring-inset ring-black/5",
          trackClassName
        )}
        aria-hidden="true"
      >
        <div
          ref={barRef}
          className={joinClasses("h-full rounded-full", barClassName)}
          style={{ transformOrigin: "left center" }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_35%,transparent_70%)]" />
      </div>
    </div>
  );
}
