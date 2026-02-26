#!/usr/bin/env node

const { spawn } = require("node:child_process");

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
    console.warn(
      `[prisma:generate] detected engine lock (EPERM rename). waiting ${waitMs}ms before retry...`
    );
    await sleep(waitMs);
  }
}

void main();
