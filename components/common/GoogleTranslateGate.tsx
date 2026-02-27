"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const DISABLED_PATH = "/en/check-ai";

function isTranslateDisabled(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return pathname === DISABLED_PATH || pathname.startsWith(`${DISABLED_PATH}/`);
}

export default function GoogleTranslateGate() {
  const pathname = usePathname();
  const disableTranslate = isTranslateDisabled(pathname);

  if (disableTranslate) {
    return null;
  }

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} />
      <Script
        id="google-translate-orchestrator"
        strategy="afterInteractive"
        src="/scripts/google-translate-orchestrator.js"
      />
    </>
  );
}
