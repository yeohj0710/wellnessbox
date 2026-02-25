/* eslint-disable no-console */
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(process.cwd(), ".env"), quiet: true });

const ROOT = process.cwd();
const QA_PORT = Number(process.env.QA_PORT || "3107");
const EXPLICIT_BASE_URL = process.env.BASE_URL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const START_TIMEOUT_MS = Number(process.env.QA_START_TIMEOUT_MS || "150000");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/column`, {
        redirect: "manual",
        cache: "no-store",
      });
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // no-op
    }
    await wait(1000);
  }
  return false;
}

function resolveNextDevCommand() {
  const binName = process.platform === "win32" ? "next.cmd" : "next";
  return path.join(ROOT, "node_modules", ".bin", binName);
}

function spawnNextDev(nextDevBin, qaPort, env) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", nextDevBin, "dev", "--port", String(qaPort)], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return spawn(nextDevBin, ["dev", "--port", String(qaPort)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort, maxScan = 30) {
  for (let offset = 0; offset <= maxScan; offset += 1) {
    const candidate = startPort + offset;
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(candidate);
    if (available) return candidate;
  }
  throw new Error(`no available port from ${startPort} to ${startPort + maxScan}`);
}

function stopProcessTree(proc) {
  if (!proc || proc.killed) return Promise.resolve();
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
      return;
    }
    proc.kill("SIGTERM");
    proc.on("exit", () => resolve());
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
      }
      resolve();
    }, 3000);
  });
}

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

  if (useExisting) {
    console.log(`[qa] using existing server: ${baseUrl}`);
  } else {
    clearNextBuildArtifacts();
    console.log(`[qa] starting isolated dev server: ${nextDevBin} dev --port ${targetPort}`);
    devProc = spawnNextDev(nextDevBin, targetPort, devEnv);

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
  }
}

run().catch((error) => {
  console.error("[qa] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
