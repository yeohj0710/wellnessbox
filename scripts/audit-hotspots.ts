(function runHotspotAudit() {
  const { readFileSync, statSync } = require("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const {
    countFileLines,
    listFilesRecursively,
    toPosixRelative,
  } = require("./lib/code-file-scan.cts") as {
    countFileLines: (filePath: string) => number;
    listFilesRecursively: (
      rootDir: string,
      options?: {
        excludeDirs?: string[] | Set<string>;
        includeExtensions?: string[] | Set<string>;
        ignoreDotEntries?: boolean;
      }
    ) => string[];
    toPosixRelative: (rootDir: string, filePath: string) => string;
  };
  const {
    CRITICAL_GUARD_CHECKS,
    EXPECTED_SESSION_ROUTE_ENTRIES,
    ROUTE_GUARD_TOKENS,
  } = require("./lib/api-route-guard-config.cts") as {
    CRITICAL_GUARD_CHECKS: Array<{ file: string; requiredTokens: string[] }>;
    EXPECTED_SESSION_ROUTE_ENTRIES: Array<{
      route: string;
      routeFile: string;
      note: string;
    }>;
    ROUTE_GUARD_TOKENS: string[];
  };
  const {
    extractExportedHttpMethods,
    extractImportedMethodAliases,
    walkRouteFiles: walkApiRouteFiles,
  } = require("./lib/route-method-audit.cts") as {
    extractExportedHttpMethods: (source: string) => string[];
    extractImportedMethodAliases: (source: string) => string[];
    walkRouteFiles: (dir: string) => string[];
  };

type FileStat = {
  file: string;
  lines: number;
};

const ROOT = process.cwd();
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
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
const CODE_FILE_ROWS = listFilesRecursively(ROOT, {
  excludeDirs: [...EXCLUDED_DIRS],
  includeExtensions: CODE_EXTENSIONS,
  ignoreDotEntries: true,
})
  .map((abs) => ({
    abs,
    file: toPosixRelative(ROOT, abs),
    lines: countFileLines(abs),
  }))
  .sort((a, b) => a.file.localeCompare(b.file));

function buildHotspotReport(
  limit: number,
  predicate?: (file: string) => boolean
): FileStat[] {
  const filtered = predicate
    ? CODE_FILE_ROWS.filter((row) => predicate(row.file))
    : CODE_FILE_ROWS;
  const stats = filtered.map((row) => ({ file: row.file, lines: row.lines }));
  return stats.sort((a, b) => b.lines - a.lines).slice(0, limit);
}

function isScriptFile(file: string) {
  return file.startsWith("scripts/");
}

function isApiRouteFile(file: string) {
  return file.startsWith("app/api/") && file.endsWith("/route.ts");
}

function isFrontendSurfaceFile(file: string) {
  if (file.startsWith("app/api/")) return false;
  if (file.startsWith("app/")) return true;
  if (file.startsWith("components/")) return true;
  return false;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractGuardCalls(source: string) {
  return ROUTE_GUARD_TOKENS.filter((token) => {
    const pattern = new RegExp(`\\b${escapeRegex(token)}\\s*\\(`);
    return pattern.test(source);
  });
}

function hasRouteAuthImport(source: string) {
  return (
    source.includes('from "@/lib/server/route-auth"') ||
    source.includes("from '@/lib/server/route-auth'")
  );
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

function runUnexpectedSessionRouteChecks(): { expected: number; unexpected: number } {
  const expectedRoutes = new Map(
    EXPECTED_SESSION_ROUTE_ENTRIES.map((item) => [item.routeFile, item.note])
  );
  let expected = 0;
  let unexpected = 0;
  const routeRows = CODE_FILE_ROWS.filter((row) => isApiRouteFile(row.file));

  for (const routeRow of routeRows) {
    const routeFile = routeRow.file;
    const source = readFileSync(routeRow.abs, "utf8");
    const guardCalls = extractGuardCalls(source);
    const usesSession = source.includes("getSession(") || hasRouteAuthImport(source);
    const needsReview = usesSession && guardCalls.length === 0;
    if (!needsReview) continue;

    const note = expectedRoutes.get(routeFile);
    if (note !== undefined) {
      expected += 1;
      console.log(`[PASS] ${routeFile} (expected session route: ${note})`);
      continue;
    }

    unexpected += 1;
    console.log(
      `[FAIL] ${routeFile} (session access without guard token and no allowlist note)`
    );
  }

  return { expected, unexpected };
}

function runRouteMethodExportChecks(): {
  checked: number;
  failed: number;
} {
  const apiRoot = path.join(ROOT, "app", "api");
  const routeFiles = walkApiRouteFiles(apiRoot);
  let checked = routeFiles.length;
  let failed = 0;

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8");
    const exportedMethods = extractExportedHttpMethods(source);
    const rel = toPosixRelative(ROOT, routeFile);
    if (exportedMethods.length === 0) {
      failed += 1;
      console.log(`[FAIL] ${rel} (no exported HTTP method handler found)`);
      continue;
    }

    const importedMethods = extractImportedMethodAliases(source);
    if (importedMethods.length === 0) continue;
    const exportedSet = new Set(exportedMethods);
    const missingMethods = importedMethods.filter((method) => !exportedSet.has(method));
    if (missingMethods.length === 0) continue;

    failed += 1;
    console.log(`[FAIL] ${rel} (missing method exports: ${missingMethods.join(", ")})`);
  }

  return { checked, failed };
}

function statSafe(absPath: string): boolean {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function main() {
  const runtimeHotspots = buildHotspotReport(25, (file) => !isScriptFile(file));
  console.log("== Runtime Code Hotspots (Top 25 by line count) ==");
  for (const { file, lines } of runtimeHotspots) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }

  const apiRouteHotspots = buildHotspotReport(20, (file) => isApiRouteFile(file));
  console.log("");
  console.log("== API Route Hotspots (Top 20 by line count) ==");
  for (const { file, lines } of apiRouteHotspots) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }

  const frontendHotspots = buildHotspotReport(20, (file) => isFrontendSurfaceFile(file));
  console.log("");
  console.log("== Frontend Surface Hotspots (Top 20 by line count) ==");
  for (const { file, lines } of frontendHotspots) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }

  const scriptHotspots = buildHotspotReport(15, (file) => isScriptFile(file));
  console.log("");
  console.log("== Script Hotspots (Top 15 by line count) ==");
  for (const { file, lines } of scriptHotspots) {
    const padded = String(lines).padStart(5, " ");
    console.log(`${padded}  ${file}`);
  }

  console.log("");
  console.log("== Critical Route Guard Checks ==");
  const guardResult = runGuardChecks();
  console.log(
    `Guard summary: ${guardResult.passed} passed, ${guardResult.failed} failed`
  );

  console.log("");
  console.log("== Unexpected Session Route Checks ==");
  const sessionResult = runUnexpectedSessionRouteChecks();
  console.log(
    `Session route summary: ${sessionResult.expected} expected, ${sessionResult.unexpected} unexpected`
  );

  console.log("");
  console.log("== Route Method Export Checks ==");
  const routeMethodResult = runRouteMethodExportChecks();
  const routeMethodPassed = routeMethodResult.checked - routeMethodResult.failed;
  console.log(
    `Route method export summary: ${routeMethodPassed} passed, ${routeMethodResult.failed} failed (checked ${routeMethodResult.checked})`
  );

  if (
    guardResult.failed > 0 ||
    sessionResult.unexpected > 0 ||
    routeMethodResult.failed > 0
  ) {
    process.exitCode = 1;
  }
}

  main();
})();
