"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { usePathname } from "next/navigation";
import { useToast } from "./toastContext.client";

const EXIT_TAP_WINDOW_MS = 1500;

export default function AppBackHandler() {
  const pathname = usePathname();
  const lastExitTapRef = useRef<number>(0);
  const { showToast } = useToast();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    const listenerPromise = App.addListener("backButton", (event) => {
      const canGoBack = event?.canGoBack ?? false;
      if (pathname === "/") {
        const now = Date.now();
        if (now - lastExitTapRef.current < EXIT_TAP_WINDOW_MS) {
          App.exitApp();
          return;
        }

        lastExitTapRef.current = now;
        showToast("한 번 더 누르면 앱이 종료됩니다.", {
          type: "info",
          duration: EXIT_TAP_WINDOW_MS,
        });
        return;
      }

      if (canGoBack) {
        window.history.back();
        return;
      }

      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      App.exitApp();
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [pathname, showToast]);

  return null;
}
