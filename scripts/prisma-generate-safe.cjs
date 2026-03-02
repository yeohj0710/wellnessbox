#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

function parsePositiveInt(rawValue, fallbackValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return Math.floor(parsed);
}

const MAX_ATTEMPTS = parsePositiveInt(process.env.PRISMA_GENERATE_RETRIES, 4);
const BASE_DELAY_MS = parsePositiveInt(
  process.env.PRISMA_GENERATE_RETRY_DELAY_MS,
  1500
);
const AUTO_UNLOCK_ENABLED =
  process.env.PRISMA_GENERATE_AUTO_UNLOCK !== "0" &&
  process.env.PRISMA_GENERATE_AUTO_UNLOCK !== "false";

function isPrismaEngineLockError(output) {
  return (
    /EPERM:\s*operation not permitted,\s*rename/i.test(output) &&
    /query_engine/i.test(output)
  );
}

function runPrismaGenerateAttempt() {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "npx prisma generate" : "npx prisma generate";
    const child = spawn(command, [], {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let mergedOutput = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      mergedOutput += text;
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      mergedOutput += text;
      process.stderr.write(chunk);
    });

    child.on("error", (error) => {
      mergedOutput += `\n${String(error)}`;
      resolve({ code: 1, output: mergedOutput });
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: mergedOutput });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTaskListCsvLine(line) {
  const match = /^"([^"]+)","([^"]+)"/.exec(line.trim());
  if (!match) return null;
  const imageName = match[1];
  const pid = Number(match[2]);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  return { imageName, pid };
}

function listWindowsEngineLockHolders() {
  const tasklist = spawnSync(
    "tasklist",
    ["/m", "query_engine-windows.dll.node", "/fo", "csv", "/nh"],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
    }
  );
  const stdout = String(tasklist.stdout || "");
  if (!stdout.trim() || /no tasks are running/i.test(stdout)) return [];

  const rows = stdout
    .split(/\r?\n/)
    .map((line) => parseTaskListCsvLine(line))
    .filter(Boolean);

  return rows.map((row) => {
    const commandInfo = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${row.pid}" | Select-Object -ExpandProperty CommandLine)`,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
        windowsHide: true,
      }
    );
    return {
      imageName: row.imageName,
      pid: row.pid,
      commandLine: String(commandInfo.stdout || "").trim(),
    };
  });
}

function isWorkspacePrismaLockCandidate(holder) {
  const commandLine = String(holder.commandLine || "");
  if (!commandLine) return false;

  const normalizedCommand = commandLine.replace(/\//g, "\\").toLowerCase();
  const normalizedCwd = path.resolve(process.cwd()).replace(/\//g, "\\").toLowerCase();
  const inWorkspace = normalizedCommand.includes(normalizedCwd);
  if (!inWorkspace) return false;

  const isNodeProcess = String(holder.imageName || "").toLowerCase() === "node.exe";
  if (!isNodeProcess) return false;

  return (
    normalizedCommand.includes("\\next\\dist\\") ||
    normalizedCommand.includes(" prisma ") ||
    normalizedCommand.includes("\\prisma\\")
  );
}

function tryAutoReleaseWindowsEngineLock() {
  if (process.platform !== "win32" || !AUTO_UNLOCK_ENABLED) {
    return { holders: [], killed: [] };
  }

  const holders = listWindowsEngineLockHolders();
  const killTargets = holders.filter((holder) => isWorkspacePrismaLockCandidate(holder));
  const killed = [];

  for (const target of killTargets) {
    const result = spawnSync("taskkill", ["/PID", String(target.pid), "/T", "/F"], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) {
      killed.push(target);
    }
  }

  return { holders, killed };
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      console.log(
        `[prisma:generate] retry attempt ${attempt}/${MAX_ATTEMPTS}`
      );
    }

    const result = await runPrismaGenerateAttempt();
    if (result.code === 0) {
      process.exit(0);
      return;
    }

    const canRetry =
      attempt < MAX_ATTEMPTS && isPrismaEngineLockError(result.output);
    if (!canRetry) {
      if (isPrismaEngineLockError(result.output)) {
        console.error("");
        console.error(
          "[prisma:generate] Prisma engine file appears to be locked."
        );
        console.error(
          "Close processes using Prisma client files (for example Prisma Studio), then rerun the command."
        );
      }
      process.exit(result.code || 1);
      return;
    }

    const waitMs = BASE_DELAY_MS * attempt;
    const unlockResult = tryAutoReleaseWindowsEngineLock();
    if (unlockResult.killed.length > 0) {
      console.warn(
        `[prisma:generate] released engine lock by stopping ${unlockResult.killed.length} process(es): ${unlockResult.killed
          .map((row) => `${row.imageName}#${row.pid}`)
          .join(", ")}`
      );
      await sleep(400);
    } else if (process.platform === "win32" && unlockResult.holders.length > 0) {
      console.warn(
        `[prisma:generate] engine lock holders detected: ${unlockResult.holders
          .map((row) => `${row.imageName}#${row.pid}`)
          .join(", ")}`
      );
    }
    console.warn(
      `[prisma:generate] detected engine lock (EPERM rename). waiting ${waitMs}ms before retry...`
    );
    await sleep(waitMs);
  }
}

void main();
