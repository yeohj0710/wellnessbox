"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CanonicalHostRedirect = dynamic(
  () => import("./canonicalHostRedirect.client"),
  {
    ssr: false,
  }
);
const AppDeepLinkHandler = dynamic(() => import("./appDeepLinkHandler"), {
  ssr: false,
});
const KakaoExternalBridge = dynamic(() => import("./kakaoExternalBridge"), {
  ssr: false,
});
const PullToRefresh = dynamic(() => import("./pullToRefresh"), {
  ssr: false,
});

const PULL_TO_REFRESH_MOUNT_DELAY_MS = 1400;

function isTouchCapableDevice() {
  if (typeof window === "undefined") return false;
  const legacyNavigator = navigator as Navigator & { msMaxTouchPoints?: number };
  return (
    "ontouchstart" in window ||
    (navigator?.maxTouchPoints ?? 0) > 0 ||
    (legacyNavigator.msMaxTouchPoints ?? 0) > 0
  );
}

function DeferredPullToRefresh() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount || typeof window === "undefined") return;
    if (!isTouchCapableDevice()) return;

    let timeoutId: number | null = null;

    const enable = () => {
      setShouldMount(true);
    };

    timeoutId = window.setTimeout(enable, PULL_TO_REFRESH_MOUNT_DELAY_MS);
    window.addEventListener("touchstart", enable, {
      passive: true,
      once: true,
    });

    return () => {
      window.removeEventListener("touchstart", enable);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [shouldMount]);

  return shouldMount ? <PullToRefresh /> : null;
}

export default function RootLayoutBoot() {
  return (
    <>
      <CanonicalHostRedirect />
      <AppDeepLinkHandler />
      <KakaoExternalBridge />
      <DeferredPullToRefresh />
    </>
  );
}
