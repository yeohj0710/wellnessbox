#!/usr/bin/env node

const { spawnSync } = require("child_process");

function isTruthy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "y";
}

const shouldInstall = isTruthy(process.env.B2B_INSTALL_PLAYWRIGHT_CHROMIUM);
if (!shouldInstall) {
  console.log(
    "[playwright:install] skipped (set B2B_INSTALL_PLAYWRIGHT_CHROMIUM=1 to enable browser install)"
  );
  process.exit(0);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || "0",
};

console.log(
  `[playwright:install] installing chromium (PLAYWRIGHT_BROWSERS_PATH=${env.PLAYWRIGHT_BROWSERS_PATH})`
);

const result = spawnSync(command, ["playwright", "install", "chromium"], {
  stdio: "inherit",
  env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
