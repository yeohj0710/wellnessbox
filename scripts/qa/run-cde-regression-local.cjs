/* eslint-disable no-console */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const {
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  findAvailablePort,
  stopProcessTree,
} = require("./lib/dev-server.cjs");
const { acquireQaLock } = require("./lib/qa-lock.cjs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_PORT || "3107");
const EXPLICIT_BASE_URL = process.env.BASE_URL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");

function clearNextBuildArtifacts() {
  const nextDir = path.join(ROOT, ".next");
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[qa] cleared .next cache/build artifacts");
  } catch (error) {
    console.warn(
      "[qa] failed to clear .next artifacts:",
      error instanceof Error ? error.message : error
    );
  }
}

async function run() {
  const nextDevBin = resolveNextDevCommand();
  const useExisting = EXPLICIT_BASE_URL.length > 0 && process.env.QA_USE_EXISTING === "1";
  const targetPort = useExisting ? null : await findAvailablePort(QA_PORT);
  const baseUrl = useExisting ? EXPLICIT_BASE_URL : `http://localhost:${targetPort}`;
  const devEnv = {
    ...process.env,
    ...(targetPort ? { PORT: String(targetPort) } : {}),
  };
  let devProc = null;
  const releaseQaLock = useExisting
    ? () => {}
    : await acquireQaLock({
        lockName: "qa-dev-server",
        owner: "qa:cde:regression:local",
      });

  if (useExisting) {
    console.log(`[qa] using existing server: ${baseUrl}`);
  } else {
    clearNextBuildArtifacts();
    console.log(`[qa] starting isolated dev server: ${nextDevBin} dev --port ${targetPort}`);
    devProc = spawnNextDev({
      rootDir: ROOT,
      nextDevBin,
      port: targetPort,
      env: devEnv,
    });

    devProc.stdout.on("data", (chunk) => {
      process.stdout.write(`[dev] ${chunk.toString()}`);
    });
    devProc.stderr.on("data", (chunk) => {
      process.stderr.write(`[dev] ${chunk.toString()}`);
    });
  }

  try {
    const ready = await waitForServerReady(baseUrl, START_TIMEOUT_MS);
    if (!ready) {
      throw new Error(`dev server ready timeout (${baseUrl})`);
    }

    console.log(`[qa] server ready: ${baseUrl}`);
    const qaProc = spawn(process.execPath, [path.join(ROOT, "scripts/qa/verify-cde-regression.cjs")], {
      cwd: ROOT,
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        ...(ADMIN_PASSWORD ? { ADMIN_PASSWORD } : {}),
      },
      stdio: "inherit",
    });

    const exitCode = await new Promise((resolve) => {
      qaProc.on("exit", (code) => resolve(code ?? 1));
      qaProc.on("error", () => resolve(1));
    });

    if (exitCode !== 0) {
      process.exitCode = exitCode;
      return;
    }
    console.log("[qa] regression passed");
  } finally {
    if (devProc) {
      await stopProcessTree(devProc);
    }
    releaseQaLock();
  }
}

run().catch((error) => {
  console.error("[qa] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
