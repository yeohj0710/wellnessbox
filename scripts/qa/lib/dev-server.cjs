/* eslint-disable no-console */
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(baseUrl, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 150000);
  const probePath = options.path || "/";
  const intervalMs = Number(options.intervalMs || 1000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}${probePath}`, {
        redirect: "manual",
        cache: "no-store",
      });
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // no-op
    }
    await wait(intervalMs);
  }
  return false;
}

function resolveNextDevCommand(rootDir = process.cwd()) {
  const binName = process.platform === "win32" ? "next.cmd" : "next";
  return path.join(rootDir, "node_modules", ".bin", binName);
}

function spawnNextDev(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const nextDevBin = options.nextDevBin || resolveNextDevCommand(rootDir);
  const port = Number(options.port || 3000);
  const env = options.env || process.env;

  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", nextDevBin, "dev", "--port", String(port)], {
      cwd: rootDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return spawn(nextDevBin, ["dev", "--port", String(port)], {
    cwd: rootDir,
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
      if (!proc.killed) proc.kill("SIGKILL");
      resolve();
    }, 3000);
  });
}

module.exports = {
  wait,
  waitForServerReady,
  resolveNextDevCommand,
  spawnNextDev,
  isPortAvailable,
  findAvailablePort,
  stopProcessTree,
};
