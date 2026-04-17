#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

function isTruthy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "y";
}

function resolveInstallMode() {
  const explicit = String(process.env.B2B_INSTALL_PLAYWRIGHT_CHROMIUM || "").trim();
  if (explicit.length > 0) {
    return {
      shouldInstall: isTruthy(explicit),
      reason: "B2B_INSTALL_PLAYWRIGHT_CHROMIUM",
    };
  }

  const isVercel = isTruthy(process.env.VERCEL) || String(process.env.VERCEL_ENV || "").trim().length > 0;
  if (isVercel) {
    return {
      shouldInstall: false,
      reason: "vercel-skip",
    };
  }

  const shouldAutoInstall =
    isTruthy(process.env.CI) ||
    process.env.NODE_ENV === "production";

  return {
    shouldInstall: shouldAutoInstall,
    reason: shouldAutoInstall ? "auto-ci-production" : "default-skip",
  };
}

function cleanupLocalBrowsers() {
  const candidates = [
    path.join(process.cwd(), "node_modules", "playwright-core", ".local-browsers"),
    path.join(process.cwd(), "node_modules", "playwright", ".local-browsers"),
  ];

  for (const candidate of candidates) {
    try {
      fs.rmSync(candidate, { recursive: true, force: true });
      console.log(`[playwright:install] removed cached browsers at ${candidate}`);
    } catch (error) {
      console.warn(
        `[playwright:install] failed to remove cached browsers at ${candidate}: ${error.message}`
      );
    }
  }
}

const installMode = resolveInstallMode();
const shouldInstall = installMode.shouldInstall;
if (!shouldInstall) {
  cleanupLocalBrowsers();
  console.log(
    `[playwright:install] skipped (${installMode.reason}; set B2B_INSTALL_PLAYWRIGHT_CHROMIUM=1 to force install)`
  );
  process.exit(0);
}

const command = process.execPath;
const playwrightEntryPath = require.resolve("playwright");
const playwrightCliPath = path.join(path.dirname(playwrightEntryPath), "cli.js");
const args = [playwrightCliPath, "install", "chromium"];
const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || "0",
};

console.log(
  `[playwright:install] installing chromium (${installMode.reason}, PLAYWRIGHT_BROWSERS_PATH=${env.PLAYWRIGHT_BROWSERS_PATH})`
);

const result = spawnSync(command, args, {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(`[playwright:install] failed to spawn installer: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}
