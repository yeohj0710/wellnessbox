import "server-only";

import { existsSync } from "fs";

type PlaywrightModule = typeof import("playwright");

const DEFAULT_PLAYWRIGHT_BROWSERS_PATH = "0";
const KNOWN_BROWSER_EXECUTABLES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/microsoft-edge",
  "/usr/bin/microsoft-edge-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/snap/bin/chromium",
] as const;

function toErrorReason(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function ensurePlaywrightRuntimeEnv() {
  const current = (process.env.PLAYWRIGHT_BROWSERS_PATH || "").trim();
  if (!current) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = DEFAULT_PLAYWRIGHT_BROWSERS_PATH;
  }
}

function buildLaunchAttempts() {
  const executablePaths = KNOWN_BROWSER_EXECUTABLES.filter((value, index, array) => {
    const normalized = value.trim();
    return normalized.length > 0 && array.indexOf(value) === index && existsSync(normalized);
  });

  return [
    {
      label: "bundled-chromium",
      options: { headless: true },
    },
    {
      label: "msedge-channel",
      options: { headless: true, channel: "msedge" as const },
    },
    {
      label: "chrome-channel",
      options: { headless: true, channel: "chrome" as const },
    },
    ...executablePaths.map((executablePath) => ({
      label: `executable:${executablePath}`,
      options: { headless: true, executablePath },
    })),
  ];
}

export async function loadPlaywrightModule(): Promise<
  | { ok: true; playwright: PlaywrightModule }
  | { ok: false; reason: string }
> {
  ensurePlaywrightRuntimeEnv();

  try {
    const playwright = await import("playwright");
    if (!playwright?.chromium) {
      return {
        ok: false,
        reason: "Playwright chromium launcher is unavailable",
      };
    }
    return {
      ok: true,
      playwright,
    };
  } catch (error) {
    return {
      ok: false,
      reason: toErrorReason(error, "Playwright is not available"),
    };
  }
}

export async function launchPlaywrightChromium(): Promise<
  | { ok: true; browser: any }
  | { ok: false; reason: string }
> {
  const loaded = await loadPlaywrightModule();
  if (!loaded.ok) {
    return loaded;
  }

  const reasons: string[] = [];
  for (const attempt of buildLaunchAttempts()) {
    try {
      const browser = await loaded.playwright.chromium.launch(attempt.options);
      return {
        ok: true,
        browser,
      };
    } catch (error) {
      reasons.push(`${attempt.label}: ${toErrorReason(error, "launch failed")}`);
    }
  }

  return {
    ok: false,
    reason: reasons.join(" | ") || "Playwright browser launch failed",
  };
}
