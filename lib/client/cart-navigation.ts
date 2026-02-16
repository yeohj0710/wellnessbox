type CartReturnState = {
  pathWithSearch: string;
  scrollY: number;
  ts: number;
};

type CartScrollRestoreState = {
  pathWithSearch: string;
  scrollY: number;
  ts: number;
};

const CART_RETURN_STATE_KEY = "wbCartReturnStateV1";
const CART_SCROLL_RESTORE_STATE_KEY = "wbCartScrollRestoreStateV1";
const CART_STATE_MAX_AGE_MS = 30 * 60 * 1000;

function isStorageAvailable() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function normalizePathWithSearch(pathWithSearch: string): string {
  if (!pathWithSearch) return "/";
  if (pathWithSearch.startsWith("http://") || pathWithSearch.startsWith("https://")) {
    try {
      const parsed = new URL(pathWithSearch);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return "/";
    }
  }

  const hashIndex = pathWithSearch.indexOf("#");
  const withoutHash =
    hashIndex >= 0 ? pathWithSearch.slice(0, hashIndex) : pathWithSearch;
  return withoutHash || "/";
}

function parseState<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isFresh(ts: unknown) {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return Date.now() - ts <= CART_STATE_MAX_AGE_MS;
}

export function isCartHostPath(pathname: string | null | undefined) {
  return pathname === "/" || pathname === "/explore";
}

export function getCurrentPathWithSearchFromWindow() {
  if (typeof window === "undefined") return "/";
  return normalizePathWithSearch(`${window.location.pathname}${window.location.search}`);
}

export function captureCartReturnStateFromWindow() {
  if (!isStorageAvailable()) return;
  const state: CartReturnState = {
    pathWithSearch: getCurrentPathWithSearchFromWindow(),
    scrollY: typeof window.scrollY === "number" ? window.scrollY : 0,
    ts: Date.now(),
  };
  window.sessionStorage.setItem(CART_RETURN_STATE_KEY, JSON.stringify(state));
}

export function clearCartReturnState() {
  if (!isStorageAvailable()) return;
  window.sessionStorage.removeItem(CART_RETURN_STATE_KEY);
}

export function consumeCartReturnState(): CartReturnState | null {
  if (!isStorageAvailable()) return null;
  const state = parseState<CartReturnState>(
    window.sessionStorage.getItem(CART_RETURN_STATE_KEY)
  );
  window.sessionStorage.removeItem(CART_RETURN_STATE_KEY);
  if (!state || !isFresh(state.ts)) return null;

  return {
    pathWithSearch: normalizePathWithSearch(state.pathWithSearch),
    scrollY: typeof state.scrollY === "number" ? state.scrollY : 0,
    ts: state.ts,
  };
}

export function queueCartScrollRestore(
  pathWithSearch: string,
  scrollY: number
) {
  if (!isStorageAvailable()) return;
  const state: CartScrollRestoreState = {
    pathWithSearch: normalizePathWithSearch(pathWithSearch),
    scrollY: Number.isFinite(scrollY) ? scrollY : 0,
    ts: Date.now(),
  };
  window.sessionStorage.setItem(
    CART_SCROLL_RESTORE_STATE_KEY,
    JSON.stringify(state)
  );
}

export function consumeCartScrollRestoreForPath(pathWithSearch: string) {
  if (!isStorageAvailable()) return null;
  const state = parseState<CartScrollRestoreState>(
    window.sessionStorage.getItem(CART_SCROLL_RESTORE_STATE_KEY)
  );
  if (!state || !isFresh(state.ts)) {
    window.sessionStorage.removeItem(CART_SCROLL_RESTORE_STATE_KEY);
    return null;
  }

  const normalizedCurrent = normalizePathWithSearch(pathWithSearch);
  const normalizedTarget = normalizePathWithSearch(state.pathWithSearch);
  if (normalizedCurrent !== normalizedTarget) {
    return null;
  }

  window.sessionStorage.removeItem(CART_SCROLL_RESTORE_STATE_KEY);
  return Number.isFinite(state.scrollY) ? state.scrollY : 0;
}
