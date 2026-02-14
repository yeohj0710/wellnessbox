"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canRunPrefetch, enqueueRoutePrefetch } from "@/lib/navigation/prefetch";

const HOME_WARMUP_SESSION_KEY = "wb-home-route-warmup:v1";
const HOME_WARMUP_ROUTES = ["/explore", "/chat"];

export default function HomeRouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canRunPrefetch()) return;

    const warmed = window.sessionStorage.getItem(HOME_WARMUP_SESSION_KEY);
    if (warmed === "1") return;
    window.sessionStorage.setItem(HOME_WARMUP_SESSION_KEY, "1");

    let cancelled = false;
    const timers: number[] = [];
    const cancelWarmup = () => {
      cancelled = true;
      timers.forEach((timerId) => window.clearTimeout(timerId));
      window.removeEventListener("pointerdown", cancelWarmup, true);
      window.removeEventListener("keydown", cancelWarmup, true);
    };

    window.addEventListener("pointerdown", cancelWarmup, true);
    window.addEventListener("keydown", cancelWarmup, true);

    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        HOME_WARMUP_ROUTES.forEach((href, index) => {
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              enqueueRoutePrefetch(router, href);
            }, 300 * index)
          );
        });
      }, 2200)
    );

    return () => {
      cancelWarmup();
    };
  }, [router]);

  return null;
}
