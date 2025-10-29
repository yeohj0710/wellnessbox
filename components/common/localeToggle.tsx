"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLoading } from "@/components/common/loadingContext.client";

declare global {
  interface Window {
    __wbEnglishModeActive?: boolean;
  }
}

const EN_PREFIX = "/en";

function isEnglishPath(path: string) {
  return path === EN_PREFIX || path.startsWith(`${EN_PREFIX}/`);
}

function buildEnglishPath(path: string) {
  if (isEnglishPath(path)) {
    return path;
  }
  if (path === "/") {
    return EN_PREFIX;
  }
  return `${EN_PREFIX}${path}`;
}

function stripEnglishPrefix(path: string) {
  if (!isEnglishPath(path)) {
    return path || "/";
  }
  if (path === EN_PREFIX) {
    return "/";
  }
  const stripped = path.slice(EN_PREFIX.length);
  return stripped.length === 0 ? "/" : stripped;
}

type LocaleToggleSize = "compact" | "default" | "expanded";

type SizePreset = {
  root: string;
  track: string;
  gapLeft: string;
  gapRight: string;
};

const SIZE_PRESETS: Record<LocaleToggleSize, SizePreset> = {
  compact: {
    root: "h-8 w-[3.75rem] px-1",
    track: "h-[26px] text-[0.68rem] tracking-[0.32em]",
    gapLeft: "0.22rem",
    gapRight: "0.22rem",
  },
  default: {
    root: "h-9 w-[4.75rem] px-[6px]",
    track: "h-7 text-[0.72rem] tracking-[0.28em]",
    gapLeft: "0.28rem",
    gapRight: "0.28rem",
  },
  expanded: {
    root: "h-10 w-full px-2",
    track: "h-8 text-[0.75rem] tracking-[0.3em]",
    gapLeft: "0.32rem",
    gapRight: "0.32rem",
  },
};

interface LocaleToggleProps {
  className?: string;
  size?: LocaleToggleSize;
}

export default function LocaleToggle({
  className = "",
  size = "default",
}: LocaleToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showLoading } = useLoading();
  const [mounted, setMounted] = useState(false);
  const [isEnglish, setIsEnglish] = useState(false);

  const preset = SIZE_PRESETS[size] ?? SIZE_PRESETS.default;

  const updateLocaleState = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const englishFromPath = isEnglishPath(window.location.pathname);
    const englishActive = englishFromPath || Boolean(window.__wbEnglishModeActive);
    setIsEnglish(englishActive);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    updateLocaleState();
  }, [mounted, pathname, updateLocaleState]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") {
      return;
    }
    const handlePopState = () => {
      updateLocaleState();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mounted, updateLocaleState]);

  const highlightStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {
      boxShadow: "0 12px 30px rgba(90, 105, 255, 0.32)",
    };
    if (isEnglish) {
      baseStyle.left = `calc(50% + ${preset.gapLeft})`;
      baseStyle.right = preset.gapRight;
    } else {
      baseStyle.left = preset.gapRight;
      baseStyle.right = `calc(50% + ${preset.gapLeft})`;
    }
    return baseStyle;
  }, [isEnglish, preset.gapLeft, preset.gapRight]);

  const handleToggle = () => {
    if (!mounted || typeof window === "undefined") {
      return;
    }
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    const nextIsEnglish = !isEnglish;
    const targetPath = nextIsEnglish
      ? buildEnglishPath(currentPath)
      : stripEnglishPrefix(currentPath);
    const nextUrl = `${targetPath}${currentSearch}${currentHash}`;
    const currentUrl = `${currentPath}${currentSearch}${currentHash}`;

    if (nextUrl === currentUrl) {
      setIsEnglish(nextIsEnglish);
      return;
    }

    setIsEnglish(nextIsEnglish);
    showLoading();
    router.replace(nextUrl, { scroll: false });
  };

  const baseClasses = [
    "relative inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/80",
    "backdrop-blur-md text-slate-500 transition-all duration-300",
    "shadow-[0_12px_35px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_42px_rgba(15,23,42,0.14)]",
    "hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8BA9FF]",
    preset.root,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      aria-pressed={isEnglish}
      aria-label={isEnglish ? "Switch to Korean" : "Switch to English"}
      className={baseClasses}
      onClick={handleToggle}
    >
      <span className="sr-only">언어 전환</span>
      <div
        className={`relative flex w-full items-center justify-between font-semibold uppercase text-slate-400 ${preset.track}`}
      >
        <span
          className={`z-10 flex-1 text-center transition-colors duration-200 ${
            isEnglish ? "text-slate-400" : "text-slate-900"
          }`}
        >
          KO
        </span>
        <span
          className={`z-10 flex-1 text-center transition-colors duration-200 ${
            isEnglish ? "text-slate-900" : "text-slate-400"
          }`}
        >
          EN
        </span>
        <span
          className={`absolute top-[0.18rem] bottom-[0.18rem] rounded-full bg-gradient-to-r from-[#59C1FF] to-[#7B61FF] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={highlightStyle}
        />
      </div>
    </button>
  );
}
