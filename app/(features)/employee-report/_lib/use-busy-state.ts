"use client";

import { useEffect, useState } from "react";

export type BusyHint =
  | "default"
  | "sync-preflight"
  | "sync-remote"
  | "force-preflight"
  | "force-remote";

export function useBusyState() {
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [busyStartedAt, setBusyStartedAt] = useState<number | null>(null);
  const [busyElapsedSec, setBusyElapsedSec] = useState(0);
  const [busyHint, setBusyHint] = useState<BusyHint>("default");

  function beginBusy(message: string, hint: BusyHint = "default") {
    setBusyMessage(message);
    setBusyHint(hint);
    setBusy(true);
    setBusyStartedAt(Date.now());
    setBusyElapsedSec(0);
  }

  function endBusy() {
    setBusy(false);
    setBusyMessage("");
    setBusyStartedAt(null);
    setBusyElapsedSec(0);
    setBusyHint("default");
  }

  function updateBusy(input: { message?: string; hint?: BusyHint }) {
    if (input.message != null) {
      setBusyMessage(input.message);
    }
    if (input.hint != null) {
      setBusyHint(input.hint);
    }
  }

  useEffect(() => {
    if (!busy || busyStartedAt == null) return;
    const updateElapsed = () => {
      const elapsedMs = Date.now() - busyStartedAt;
      setBusyElapsedSec(Math.max(0, Math.floor(elapsedMs / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [busy, busyStartedAt]);

  return {
    busy,
    busyMessage,
    busyElapsedSec,
    busyHint,
    beginBusy,
    updateBusy,
    endBusy,
  };
}
