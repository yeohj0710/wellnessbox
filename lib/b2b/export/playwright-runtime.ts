import "server-only";

type PlaywrightModule = typeof import("playwright");

const DEFAULT_PLAYWRIGHT_BROWSERS_PATH = "0";

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

  try {
    const browser = await loaded.playwright.chromium.launch({ headless: true });
    return {
      ok: true,
      browser,
    };
  } catch (error) {
    return {
      ok: false,
      reason: toErrorReason(error, "Playwright browser launch failed"),
    };
  }
}
