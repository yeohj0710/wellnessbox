"use client";

import { useEffect } from "react";
import { App, URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { APP_HOST, APP_SCHEME } from "@/lib/auth/kakao/constants";
import { buildAbsoluteUrl, resolvePublicBaseUrl } from "@/lib/shared/url";

async function closeBrowserSafely() {
  try {
    await Browser.close();
  } catch {
    return;
  }
}

function handleUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol.replace(":", "") !== APP_SCHEME) return;
    if (parsed.hostname !== APP_HOST) return;

    const segments = parsed.pathname.split("/").filter(Boolean);
    const [provider, token] = segments;

    if (provider !== "kakao" || !token) return;

    const target = buildAbsoluteUrl(
      `/api/auth/kakao/complete/${encodeURIComponent(token)}`,
      resolvePublicBaseUrl()
    );

    void closeBrowserSafely();
    window.location.href = target;
  } catch {
    return;
  }
}

export default function AppDeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      const listener = await App.addListener(
        "appUrlOpen",
        (event: URLOpenListenerEvent) => {
          if (event?.url) handleUrl(event.url);
        }
      );

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        handleUrl(launch.url);
      }

      return () => {
        listener.remove();
      };
    };

    const teardownPromise = setup();

    return () => {
      teardownPromise.then((dispose) => dispose?.());
    };
  }, []);

  return null;
}
