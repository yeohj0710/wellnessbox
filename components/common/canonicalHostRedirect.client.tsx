"use client";

import { useEffect } from "react";

const CANONICAL_ORIGIN = "https://wellnessbox.kr";
const LEGACY_HOSTS = new Set([
  "wellnessbox.me",
  "www.wellnessbox.me",
  "www.wellnessbox.kr",
]);

export default function CanonicalHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { hostname, pathname, search, hash } = window.location;
    if (!LEGACY_HOSTS.has(hostname)) return;

    const target = `${CANONICAL_ORIGIN}${pathname}${search}${hash}`;
    if (target === window.location.href) return;

    window.location.replace(target);
  }, []);

  return null;
}
