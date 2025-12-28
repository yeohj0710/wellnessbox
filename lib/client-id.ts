import Cookies from "js-cookie";
import {
  CLIENT_COOKIE_NAME,
  CLIENT_ID_MAX_AGE,
  CLIENT_LS_KEY,
  generateClientId,
} from "./shared/client-id";

function persistCookie(id: string) {
  Cookies.set(CLIENT_COOKIE_NAME, id, {
    expires: CLIENT_ID_MAX_AGE / (60 * 60 * 24),
    path: "/",
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  });
}

function persistLocalStorage(id: string) {
  try {
    localStorage.setItem(CLIENT_LS_KEY, id);
  } catch {}
}

export function readClientIdFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  const fromCookie = Cookies.get(CLIENT_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  try {
    const ls = localStorage.getItem(CLIENT_LS_KEY);
    if (ls) return ls;
  } catch {}
  return null;
}

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return generateClientId();
  const existing = readClientIdFromBrowser();
  if (existing) {
    // refresh cookie expiry if present only in localStorage
    persistCookie(existing);
    persistLocalStorage(existing);
    return existing;
  }
  const id = generateClientId();
  persistCookie(id);
  persistLocalStorage(id);
  return id;
}

export function refreshClientIdCookieIfNeeded() {
  const id = readClientIdFromBrowser();
  if (!id) return;
  persistCookie(id);
}
