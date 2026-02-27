const fs = require("node:fs");
const path = require("node:path");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensureParentDir(lockPath) {
  const parentDir = path.dirname(lockPath);
  fs.mkdirSync(parentDir, { recursive: true });
}

function readLockMeta(lockPath) {
  if (!fs.existsSync(lockPath)) return null;
  const raw = fs.readFileSync(lockPath, "utf8");
  const meta = parseJsonSafe(raw);
  if (!meta || typeof meta !== "object") return null;
  return meta;
}

function isStaleLock(meta, staleMs) {
  const acquiredAt = Number(meta?.acquiredAt);
  if (!Number.isFinite(acquiredAt)) return true;
  return Date.now() - acquiredAt > staleMs;
}

async function acquireQaLock(options = {}) {
  const lockName = options.lockName || "default";
  const lockPath =
    options.lockPath ||
    path.join(process.cwd(), ".next", "qa-locks", `${String(lockName)}.lock`);
  const owner = options.owner || process.env.npm_lifecycle_event || "qa-script";
  const timeoutMs = Number(options.timeoutMs || 120000);
  const pollMs = Number(options.pollMs || 500);
  const staleMs = Number(options.staleMs || 30 * 60 * 1000);
  const startedAt = Date.now();

  ensureParentDir(lockPath);

  while (Date.now() - startedAt < timeoutMs) {
    const meta = {
      owner,
      pid: process.pid,
      acquiredAt: Date.now(),
    };

    try {
      fs.writeFileSync(lockPath, JSON.stringify(meta), {
        flag: "wx",
        encoding: "utf8",
      });

      return () => {
        try {
          const currentMeta = readLockMeta(lockPath);
          if (currentMeta?.pid === process.pid) {
            fs.rmSync(lockPath, { force: true });
          }
        } catch {
          // no-op
        }
      };
    } catch (error) {
      if (error && error.code !== "EEXIST") throw error;
      const existingMeta = readLockMeta(lockPath);
      if (isStaleLock(existingMeta, staleMs)) {
        try {
          fs.rmSync(lockPath, { force: true });
          continue;
        } catch {
          // another process may own lock; retry
        }
      }
      await sleep(pollMs);
    }
  }

  const lockMeta = readLockMeta(lockPath);
  const ownerInfo = lockMeta?.owner ? String(lockMeta.owner) : "unknown";
  throw new Error(
    `QA lock timeout: ${lockPath} (owner: ${ownerInfo}). Run QA scripts sequentially.`
  );
}

module.exports = {
  acquireQaLock,
};
