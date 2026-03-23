"use client";

type RouterLike = {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type NavigateWithFallbackOptions = {
  replace?: boolean;
  scroll?: boolean;
};

const NAVIGATION_FALLBACK_DELAY_MS = 1200;

let pendingFallbackTimer: number | null = null;
let pendingFallbackStartHref = "";
let pendingFallbackTargetHref = "";

function clearPendingTimer() {
  if (pendingFallbackTimer === null || typeof window === "undefined") return;
  window.clearTimeout(pendingFallbackTimer);
  pendingFallbackTimer = null;
}

export function clearNavigationFallback() {
  clearPendingTimer();
  pendingFallbackStartHref = "";
  pendingFallbackTargetHref = "";
}

function resolveBrowserHref(targetHref: string) {
  return new URL(targetHref, window.location.href).toString();
}

function scheduleNavigationFallback(targetHref: string, replace = false) {
  if (typeof window === "undefined") return;

  clearPendingTimer();
  pendingFallbackStartHref = window.location.href;
  pendingFallbackTargetHref = resolveBrowserHref(targetHref);

  pendingFallbackTimer = window.setTimeout(() => {
    const currentHref = window.location.href;
    const startHref = pendingFallbackStartHref;
    const resolvedTargetHref = pendingFallbackTargetHref;
    clearNavigationFallback();

    if (!startHref || !resolvedTargetHref) return;
    if (currentHref !== startHref || currentHref === resolvedTargetHref) return;

    if (replace) {
      window.location.replace(resolvedTargetHref);
      return;
    }

    window.location.assign(resolvedTargetHref);
  }, NAVIGATION_FALLBACK_DELAY_MS);
}

export function scheduleDocumentNavigationFallback(targetHref: string) {
  scheduleNavigationFallback(targetHref, false);
}

export function navigateWithFallback(
  router: RouterLike,
  href: string,
  options: NavigateWithFallbackOptions = {}
) {
  const { replace = false, scroll } = options;

  if (typeof window === "undefined") {
    if (replace) {
      router.replace(href, { scroll });
      return;
    }

    router.push(href, { scroll });
    return;
  }

  scheduleNavigationFallback(href, replace);

  try {
    if (replace) {
      router.replace(href, { scroll });
      return;
    }

    router.push(href, { scroll });
  } catch {
    clearNavigationFallback();
    const resolvedHref = resolveBrowserHref(href);
    if (replace) {
      window.location.replace(resolvedHref);
      return;
    }

    window.location.assign(resolvedHref);
  }
}
