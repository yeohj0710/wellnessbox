const { readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path") as typeof import("node:path");

type FileStat = {
  file: string;
  lines: number;
};

type GuardCheck = {
  file: string;
  requiredTokens: string[];
};

const ROOT = process.cwd();
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  ".agents",
  "node_modules",
  "android",
  "ios",
  "public",
  "resources",
  "tmp",
]);

const CRITICAL_GUARD_CHECKS: GuardCheck[] = [
  {
    file: "app/api/admin/model/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/agent-playground/run/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/debug/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/ingest/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/rag/reindex/route.ts",
    requiredTokens: ["requireAdminSession"],
  },
  {
    file: "app/api/push/subscribe/route.ts",
    requiredTokens: ["requireCustomerOrderAccess"],
  },
  {
    file: "app/api/push/send/route.ts",
    requiredTokens: ["requireCustomerOrderAccess"],
  },
  {
    file: "app/api/pharm-push/subscribe/route.ts",
    requiredTokens: ["requirePharmSession"],
  },
  {
    file: "app/api/rider-push/subscribe/route.ts",
    requiredTokens: ["requireRiderSession"],
  },
];

function walkCodeFiles(relativeDir = ""): string[] {
  const currentDir = path.join(ROOT, relativeDir);
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...walkCodeFiles(path.join(relativeDir, entry.name)));
      continue;
    }
    if (entry.name.startsWith(".")) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!CODE_EXTENSIONS.has(ext)) continue;
    files.push(path.join(relativeDir, entry.name));
  }

  return files;
}

function countLines(filePath: string): number {
  const absPath = path.join(ROOT, filePath);
  const source = readFileSync(absPath, "utf8");
  if (source.length === 0) return 0;
  return source.split(/\r?\n/).length;
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function buildHotspotReport(limit: number): FileStat[] {
  const files = walkCodeFiles();
  const stats = files.map((file) => ({ file: toPosix(file), lines: countLines(file) }));
  return stats.sort((a, b) => b.lines - a.lines).slice(0, limit);
}

function runGuardChecks(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const check of CRITICAL_GUARD_CHECKS) {
    const absPath = path.join(ROOT, check.file);
    const exists = statSafe(absPath);
    if (!exists) {
      failed += 1;
      console.log(`[FAIL] ${check.file} (file missing)`);
      continue;
    }

    const source = readFileSync(absPath, "utf8");
    const missing = check.requiredTokens.filter((token) => !source.includes(token));
    if (missing.length > 0) {
      failed += 1;
      console.log(`[FAIL] ${check.file} (missing: ${missing.join(", ")})`);
      continue;
    }

    passed += 1;
    console.log(`[PASS] ${check.file}`);
  }

  return { passed, failed };
}

function statSafe(absPath: string): boolean {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function main() {
  const hotspots = buildHotspotReport(25);
  console.log("== Code Hotspots (Top 25 by line count) ==");
  for (const { file, lines } of hotspots) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }

  console.log("");
  console.log("== Critical Route Guard Checks ==");
  const guardResult = runGuardChecks();
  console.log(
    `Guard summary: ${guardResult.passed} passed, ${guardResult.failed} failed`
  );

  if (guardResult.failed > 0) {
    process.exitCode = 1;
  }
}

main();
