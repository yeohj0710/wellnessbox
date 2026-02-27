"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiErrorPayload } from "./client-types";
import { resolveCooldownUntilFromPayload } from "./client-utils";

export function useForceSyncCooldown() {
  const [forceSyncCooldownUntil, setForceSyncCooldownUntil] = useState<number | null>(
    null
  );
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());

  const forceSyncRemainingSec = useMemo(() => {
    if (!forceSyncCooldownUntil) return 0;
    const remainingMs = forceSyncCooldownUntil - cooldownNow;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }, [cooldownNow, forceSyncCooldownUntil]);

  useEffect(() => {
    if (!forceSyncCooldownUntil) return;
    if (forceSyncCooldownUntil <= Date.now()) {
      setForceSyncCooldownUntil(null);
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forceSyncCooldownUntil]);

  useEffect(() => {
    if (forceSyncRemainingSec <= 0 && forceSyncCooldownUntil) {
      setForceSyncCooldownUntil(null);
    }
  }, [forceSyncCooldownUntil, forceSyncRemainingSec]);

  function applyForceSyncCooldown(payload: ApiErrorPayload | null | undefined) {
    if (!payload) return;
    const until = resolveCooldownUntilFromPayload(payload);
    if (until) {
      setForceSyncCooldownUntil(until);
      setCooldownNow(Date.now());
    }
  }

  return {
    forceSyncRemainingSec,
    applyForceSyncCooldown,
  };
}
