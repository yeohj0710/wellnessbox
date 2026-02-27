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

type SessionRouteCheck = {
  routeFile: string;
  note?: string;
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
  {
    file: "app/api/me/profile/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/phone-status/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/link-phone/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/unlink-phone/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/me/nickname/check/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/auth/email/send-otp/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/auth/email/verify-otp/route.ts",
    requiredTokens: ["requireUserSession"],
  },
  {
    file: "app/api/messages/stream/token/route.ts",
    requiredTokens: ["requirePharmSession", "requireRiderSession"],
  },
  {
    file: "app/api/b2b/employee/sync/route.ts",
    requiredTokens: ["requireNhisSession"],
  },
];

const ROUTE_GUARD_TOKENS = [
  "requireAdminSession",
  "requireAnySession",
  "requireUserSession",
  "requireNhisSession",
  "requirePharmSession",
  "requireRiderSession",
  "requireCustomerOrderAccess",
  "requireB2bEmployeeToken",
  "requireCronSecret",
];

const EXPECTED_SESSION_ROUTE_CHECKS: SessionRouteCheck[] = [
  {
    routeFile: "app/api/auth/kakao/callback/route.ts",
    note: "OAuth callback sets session after provider redirect.",
  },
  {
    routeFile: "app/api/auth/kakao/complete/[token]/route.ts",
    note: "One-time complete route finalizes session.",
  },
  {
    routeFile: "app/api/auth/login-status/route.ts",
    note: "Session state read endpoint for UI.",
  },
  {
    routeFile: "app/api/auth/logout/route.ts",
    note: "Session clear endpoint.",
  },
  {
    routeFile: "app/api/logout/route.ts",
    note: "Legacy session clear endpoint.",
  },
  {
    routeFile: "app/api/verify-password/route.ts",
    note: "Admin/test session issue endpoint.",
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

function buildHotspotReport(
  limit: number,
  predicate?: (file: string) => boolean
): FileStat[] {
  const files = walkCodeFiles();
  const filtered = predicate ? files.filter((file) => predicate(toPosix(file))) : files;
  const stats = filtered.map((file) => ({ file: toPosix(file), lines: countLines(file) }));
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
    EXPECTED_SESSION_ROUTE_CHECKS.map((item) => [item.routeFile, item.note ?? ""])
  );
  let expected = 0;
  let unexpected = 0;
  const routeFiles = walkCodeFiles().map(toPosix).filter((file) => isApiRouteFile(file));

  for (const routeFile of routeFiles) {
    const absPath = path.join(ROOT, routeFile);
    const source = readFileSync(absPath, "utf8");
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

  if (guardResult.failed > 0 || sessionResult.unexpected > 0) {
    process.exitCode = 1;
  }
}

main();
