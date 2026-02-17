"use client";

type RouterPrefetchLike = {
  prefetch: (href: string) => void | Promise<void>;
};

type PrefetchTask = {
  href: string;
  router: RouterPrefetchLike;
};

const SESSION_PREFETCH_KEY = "wb-prefetch:v1";
const MAX_CONCURRENT_PREFETCH = 3;
const MAX_SESSION_PREFETCH_RECORDS = 120;
const PROTECTED_PREFIXES = [
  "/admin",
  "/features",
  "/pharm",
  "/rider",
  "/agent-playground",
  "/api",
  "/rag",
];

const sessionPrefetchedHrefs = new Set<string>();
const inFlightHrefs = new Set<string>();
const queuedHrefs = new Set<string>();
const taskQueue: PrefetchTask[] = [];

let sessionHydrated = false;
let activePrefetchCount = 0;

function isWindowAvailable() {
  return typeof window !== "undefined";
}

function emitPrefetchDebugEvent(
  stage: "queued" | "started" | "succeeded" | "failed",
  href: string
) {
  if (!isWindowAvailable()) return;
  const target = (
    window as {
      __WB_PREFETCH_DEBUG_EVENTS?: Array<{
        stage: "queued" | "started" | "succeeded" | "failed";
        href: string;
        ts: number;
      }>;
    }
  ).__WB_PREFETCH_DEBUG_EVENTS;
  if (!Array.isArray(target)) return;
  target.push({
    stage,
    href,
    ts: Date.now(),
  });
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hydrateSessionPrefetchSet() {
  if (!isWindowAvailable() || sessionHydrated) return;
  sessionHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFETCH_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.forEach((item) => {
      if (typeof item === "string" && item) sessionPrefetchedHrefs.add(item);
    });
  } catch {}
}

function persistSessionPrefetchSet() {
  if (!isWindowAvailable()) return;
  try {
    const values = [...sessionPrefetchedHrefs].slice(
      -MAX_SESSION_PREFETCH_RECORDS
    );
    window.sessionStorage.setItem(SESSION_PREFETCH_KEY, JSON.stringify(values));
  } catch {}
}

function isDataSaverEnabled() {
  if (typeof navigator === "undefined") return false;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;
  return connection?.saveData === true;
}

function hasFastEnoughConnection() {
  if (typeof navigator === "undefined") return false;
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string };
    }
  ).connection;
  if (!connection?.effectiveType) return true;

  const normalized = connection.effectiveType.toLowerCase();
  return normalized === "4g" || normalized === "wifi" || normalized === "ethernet";
}

export function canRunPrefetch() {
  if (!isWindowAvailable()) return false;
  if ((window as { __WB_DISABLE_INTENT_PREFETCH?: boolean })
    .__WB_DISABLE_INTENT_PREFETCH) {
    return false;
  }
  if (isDataSaverEnabled()) return false;
  return hasFastEnoughConnection();
}

export function normalizePrefetchHref(rawHref: string) {
  if (!isWindowAvailable()) return null;
  if (!rawHref || rawHref.startsWith("#")) return null;

  try {
    const url = new URL(rawHref, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (isProtectedPath(url.pathname)) return null;
    if (url.pathname === window.location.pathname) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function runQueue() {
  if (!canRunPrefetch()) return;
  while (activePrefetchCount < MAX_CONCURRENT_PREFETCH && taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (!task) return;

    if (sessionPrefetchedHrefs.has(task.href) || inFlightHrefs.has(task.href)) {
      queuedHrefs.delete(task.href);
      continue;
    }

    activePrefetchCount += 1;
    queuedHrefs.delete(task.href);
    inFlightHrefs.add(task.href);
    emitPrefetchDebugEvent("started", task.href);

    Promise.resolve(task.router.prefetch(task.href))
      .then(() => {
        sessionPrefetchedHrefs.add(task.href);
        persistSessionPrefetchSet();
        emitPrefetchDebugEvent("succeeded", task.href);
      })
      .catch(() => {
        emitPrefetchDebugEvent("failed", task.href);
      })
      .finally(() => {
        activePrefetchCount = Math.max(0, activePrefetchCount - 1);
        inFlightHrefs.delete(task.href);
        runQueue();
      });
  }
}

export function enqueueRoutePrefetch(
  router: RouterPrefetchLike,
  rawHref: string
) {
  if (!canRunPrefetch()) return false;
  hydrateSessionPrefetchSet();

  const href = normalizePrefetchHref(rawHref);
  if (!href) return false;
  if (sessionPrefetchedHrefs.has(href)) return false;
  if (inFlightHrefs.has(href)) return false;
  if (queuedHrefs.has(href)) return false;

  taskQueue.push({ href, router });
  queuedHrefs.add(href);
  emitPrefetchDebugEvent("queued", href);
  runQueue();
  return true;
}
