const { readFileSync, statSync } = require("node:fs");
const path = require("node:path") as typeof import("node:path");
const {
  CRITICAL_GUARD_CHECKS,
  EXPECTED_SESSION_ROUTE_ENTRIES,
  ROUTE_GUARD_TOKENS,
} = require("./api-route-guard-config.cts") as {
  CRITICAL_GUARD_CHECKS: Array<{ file: string; requiredTokens: string[] }>;
  EXPECTED_SESSION_ROUTE_ENTRIES: Array<{
    route: string;
    routeFile: string;
    note: string;
  }>;
  ROUTE_GUARD_TOKENS: string[];
};
const { auditRouteMethodExports } = require("./route-method-export-audit.cts") as {
  auditRouteMethodExports: (rootDir: string) => {
    checked: number;
    skipped: boolean;
    findings: Array<{
      file: string;
      issue: "missing_exports" | "missing_alias_exports";
      importedMethods: string[];
      exportedMethods: string[];
      missingMethods: string[];
    }>;
  };
};
const {
  extractGuardCalls,
  hasRouteAuthImport,
} = require("./route-guard-scan.cts") as {
  extractGuardCalls: (source: string, guardTokens: string[]) => string[];
  hasRouteAuthImport: (source: string) => boolean;
};

type CodeFileRow = {
  abs: string;
  file: string;
  lines: number;
};

function statSafe(absPath: string): boolean {
  try {
    return statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function runGuardChecks(rootDir: string): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const check of CRITICAL_GUARD_CHECKS) {
    const absPath = path.join(rootDir, check.file);
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

function runUnexpectedSessionRouteChecks(
  routeRows: CodeFileRow[]
): { expected: number; unexpected: number } {
  const expectedRoutes = new Map(
    EXPECTED_SESSION_ROUTE_ENTRIES.map((item) => [item.routeFile, item.note])
  );
  let expected = 0;
  let unexpected = 0;

  for (const routeRow of routeRows) {
    const routeFile = routeRow.file;
    const source = readFileSync(routeRow.abs, "utf8");
    const guardCalls = extractGuardCalls(source, ROUTE_GUARD_TOKENS);
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

function runRouteMethodExportChecks(rootDir: string): {
  checked: number;
  failed: number;
} {
  const audit = auditRouteMethodExports(rootDir);
  if (audit.skipped) {
    console.log("[PASS] route method export audit skipped (app/api directory not found)");
    return { checked: 0, failed: 0 };
  }

  let failed = 0;
  for (const finding of audit.findings) {
    failed += 1;
    if (finding.issue === "missing_exports") {
      console.log(`[FAIL] ${finding.file} (no exported HTTP method handler found)`);
      continue;
    }

    console.log(
      `[FAIL] ${finding.file} (missing method exports: ${finding.missingMethods.join(", ")})`
    );
  }

  return { checked: audit.checked, failed };
}

module.exports = {
  runGuardChecks,
  runRouteMethodExportChecks,
  runUnexpectedSessionRouteChecks,
};
