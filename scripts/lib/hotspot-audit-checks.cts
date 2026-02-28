const { readFileSync, statSync } = require("node:fs");
const path = require("node:path") as typeof import("node:path");
const {
  CRITICAL_GUARD_CHECKS,
  EXPECTED_SESSION_ROUTE_ENTRIES,
  ROUTE_GUARD_POLICIES,
  ROUTE_GUARD_TOKENS,
} = require("./api-route-guard-config.cts") as {
  CRITICAL_GUARD_CHECKS: Array<{ file: string; requiredTokens: string[] }>;
  EXPECTED_SESSION_ROUTE_ENTRIES: Array<{
    route: string;
    routeFile: string;
    note: string;
  }>;
  ROUTE_GUARD_POLICIES: Array<{
    routePrefix: string;
    requiredTokens: string[];
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
const {
  evaluateRouteGuardPolicies,
  scanApiGuardEntries,
} = require("./guard-map.cts") as {
  evaluateRouteGuardPolicies: (
    entries: Array<{
      file: string;
      route: string;
      methods: string[];
      guards: string[];
      directGuards: string[];
      importsRouteAuth: boolean;
      usesGetSession: boolean;
      note: string | null;
      classification:
        | "guarded"
        | "review_expected"
        | "review_unexpected"
        | "public_or_internal";
    }>,
    policies: Array<{
      routePrefix: string;
      requiredTokens: string[];
      note: string;
    }>
  ) => Array<{
    route: string;
    file: string;
    guards: string[];
    requiredTokens: string[];
    missingTokens: string[];
    note: string;
  }>;
  scanApiGuardEntries: (input: {
    repoRoot: string;
    apiRoot: string;
    routeGuardTokens: string[];
    expectedSessionRouteNotes: Record<string, string>;
  }) => Array<{
    file: string;
    route: string;
    methods: string[];
    guards: string[];
    directGuards: string[];
    importsRouteAuth: boolean;
    usesGetSession: boolean;
    note: string | null;
    classification:
      | "guarded"
      | "review_expected"
      | "review_unexpected"
      | "public_or_internal";
  }>;
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

function runRoutePolicyChecks(rootDir: string): {
  checked: number;
  failed: number;
} {
  const apiRoot = path.join(rootDir, "app", "api");
  const expectedSessionRouteNotes = Object.fromEntries(
    EXPECTED_SESSION_ROUTE_ENTRIES.map((item) => [item.route, item.note])
  );

  const entries = scanApiGuardEntries({
    repoRoot: rootDir,
    apiRoot,
    routeGuardTokens: ROUTE_GUARD_TOKENS,
    expectedSessionRouteNotes,
  });
  const violations = evaluateRouteGuardPolicies(entries, ROUTE_GUARD_POLICIES);
  const checked = entries.filter((entry) =>
    ROUTE_GUARD_POLICIES.some(
      (policy) =>
        entry.route === policy.routePrefix ||
        entry.route.startsWith(`${policy.routePrefix}/`)
    )
  ).length;

  for (const violation of violations) {
    console.log(
      `[FAIL] ${violation.file} (missing policy guards: ${violation.missingTokens.join(", ")})`
    );
  }

  return {
    checked,
    failed: violations.length,
  };
}

module.exports = {
  runGuardChecks,
  runRoutePolicyChecks,
  runRouteMethodExportChecks,
  runUnexpectedSessionRouteChecks,
};
