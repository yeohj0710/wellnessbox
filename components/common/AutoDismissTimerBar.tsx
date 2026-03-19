"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const startedAt = Date.now();
    setRemainingMs(safeDuration);

    const intervalId = window.setInterval(() => {
      const nextRemaining = Math.max(0, safeDuration - (Date.now() - startedAt));
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [safeDuration]);

  const progress = Math.max(0, Math.min(100, (remainingMs / safeDuration) * 100));
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
          "h-1.5 w-full overflow-hidden rounded-full bg-white/15",
          trackClassName
        )}
        aria-hidden="true"
      >
        <div
          className={joinClasses("h-full rounded-full", barClassName)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
