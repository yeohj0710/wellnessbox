"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function buildSessionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function postExperimentEvent(body: Record<string, unknown>) {
  return fetch("/api/experiments/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

export function useAiExperiment(input: {
  experimentKey: string;
  surface: string;
  route: string;
  initialVariantKey: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
}) {
  const enabled = input.enabled !== false;
  const [variantKey, setVariantKey] = useState(input.initialVariantKey);
  const sessionKeyRef = useRef<string>(buildSessionKey());
  const impressionLoggedRef = useRef(false);

  useEffect(() => {
    if (!enabled || impressionLoggedRef.current) return;
    impressionLoggedRef.current = true;

    void postExperimentEvent({
      experimentKey: input.experimentKey,
      eventName: "impression",
      surface: input.surface,
      route: input.route,
      sessionKey: sessionKeyRef.current,
      payload: input.payload,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!result || typeof result.variantKey !== "string") return;
        setVariantKey(result.variantKey);
      })
      .catch(() => {
        // noop
      });
  }, [
    enabled,
    input.experimentKey,
    input.payload,
    input.route,
    input.surface,
  ]);

  const track = useCallback(
    (eventName: "primary_cta_click" | "secondary_cta_click" | "article_click", payload?: Record<string, unknown>) => {
      if (!enabled) return;
      void postExperimentEvent({
        experimentKey: input.experimentKey,
        eventName,
        surface: input.surface,
        route: input.route,
        sessionKey: sessionKeyRef.current,
        payload: {
          ...(input.payload ?? {}),
          ...(payload ?? {}),
        },
      }).catch(() => {
        // noop
      });
    },
    [
      enabled,
      input.experimentKey,
      input.payload,
      input.route,
      input.surface,
    ]
  );

  return useMemo(
    () => ({
      variantKey,
      sessionKey: sessionKeyRef.current,
      track,
    }),
    [track, variantKey]
  );
}
