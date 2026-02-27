const fs = require("node:fs") as typeof import("node:fs");
const pathUtil = require("node:path") as typeof import("node:path");

type RouteEntry = {
  file: string;
  route: string;
  methods: string[];
  guards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
  note: string | null;
  classification:
    | "guarded"
    | "review_expected"
    | "review_unexpected"
    | "public_or_internal";
};

const REPO_ROOT = process.cwd();
const API_ROOT = pathUtil.join(REPO_ROOT, "app", "api");
const OUTPUT_PATH = pathUtil.join(REPO_ROOT, "API_GUARD_MAP.md");

const GUARD_TOKENS = [
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

const EXPECTED_SESSION_ROUTES: Record<string, string> = {
  "/api/auth/kakao/callback":
    "OAuth callback route that sets login session after provider redirect.",
  "/api/auth/kakao/complete/[token]":
    "One-time token completion route that finalizes login session.",
  "/api/auth/login-status":
    "Read-only route that reports current session status to UI.",
  "/api/auth/logout":
    "Logout route that clears session cookies.",
  "/api/logout":
    "Legacy logout compatibility route that clears session cookies.",
  "/api/verify-password":
    "Admin password verification route that creates admin/test session.",
};

function walkRouteFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  const out: string[] = [];

  for (const entry of entries) {
    const full = pathUtil.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkRouteFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name !== "route.ts") continue;
    out.push(full);
  }

  return out;
}

function toRel(filePath: string) {
  return pathUtil.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function toRoutePath(relativeRouteFile: string) {
  return (
    "/" +
    relativeRouteFile
      .replace(/^app\/api\//, "api/")
      .replace(/\/route\.ts$/, "")
  );
}

function extractMethods(source: string) {
  const matches = source.matchAll(
    /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g
  );
  const methods = new Set<string>();
  for (const match of matches) {
    methods.add(match[1]);
  }
  return [...methods].sort();
}

function hasRouteAuthImport(source: string) {
  return (
    source.includes('from "@/lib/server/route-auth"') ||
    source.includes("from '@/lib/server/route-auth'")
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractGuardCalls(source: string) {
  return GUARD_TOKENS.filter((token) => {
    const pattern = new RegExp(`\\b${escapeRegex(token)}\\s*\\(`);
    return pattern.test(source);
  });
}

function resolveClassification(input: {
  route: string;
  guards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
}): RouteEntry["classification"] {
  if (input.guards.length > 0) return "guarded";
  if (input.usesGetSession || input.importsRouteAuth) {
    return EXPECTED_SESSION_ROUTES[input.route]
      ? "review_expected"
      : "review_unexpected";
  }
  return "public_or_internal";
}

function resolveSessionAccessLabel(entry: RouteEntry) {
  if (entry.usesGetSession) return "getSession";
  if (entry.importsRouteAuth) return "route-auth-import";
  return "none";
}

function section(title: string, rows: RouteEntry[]) {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push("");
  lines.push("| Route | Methods | Guards | Session Access | Note | File |");
  lines.push("|---|---|---|---|---|---|");
  for (const row of rows) {
    lines.push(
      `| \`${row.route}\` | ${
        row.methods.length > 0 ? `\`${row.methods.join(", ")}\`` : "-"
      } | ${
        row.guards.length > 0 ? `\`${row.guards.join(", ")}\`` : "-"
      } | \`${resolveSessionAccessLabel(row)}\` | ${
        row.note ? row.note.replace(/\|/g, "\\|") : "-"
      } | \`${row.file}\` |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const strict = process.argv.includes("--strict");
  const files = walkRouteFiles(API_ROOT);
  const entries: RouteEntry[] = files
    .map((filePath) => {
      const file = toRel(filePath);
      const source = fs.readFileSync(filePath, "utf8");
      const route = toRoutePath(file);
      const guards = extractGuardCalls(source);
      const importsRouteAuth = hasRouteAuthImport(source);
      const usesGetSession = source.includes("getSession(");
      const classification = resolveClassification({
        route,
        guards,
        importsRouteAuth,
        usesGetSession,
      });
      return {
        file,
        route,
        methods: extractMethods(source),
        guards,
        importsRouteAuth,
        usesGetSession,
        note: EXPECTED_SESSION_ROUTES[route] ?? null,
        classification,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const guarded = entries.filter((entry) => entry.classification === "guarded");
  const expectedReview = entries.filter(
    (entry) => entry.classification === "review_expected"
  );
  const unexpectedReview = entries.filter(
    (entry) => entry.classification === "review_unexpected"
  );
  const publicOrInternal = entries.filter(
    (entry) => entry.classification === "public_or_internal"
  );

  const doc: string[] = [];
  doc.push("# API Guard Map");
  doc.push("");
  doc.push("Auto-generated by `scripts/agent/generate-api-guard-map.cts`.");
  doc.push("Run `npm run agent:guard-map` to refresh this report.");
  doc.push(`Generated at: \`${new Date().toISOString()}\``);
  doc.push("");
  doc.push("## Summary");
  doc.push("");
  doc.push(`- Total routes: **${entries.length}**`);
  doc.push(`- Guarded routes: **${guarded.length}**`);
  doc.push(`- Expected session-managed routes: **${expectedReview.length}**`);
  doc.push(`- Unexpected review needed: **${unexpectedReview.length}**`);
  doc.push(`- Public/Internal candidate routes: **${publicOrInternal.length}**`);
  doc.push("");
  doc.push(
    "- `Unexpected review needed` means route-auth import or direct `getSession()` is present but route policy does not explain the route yet."
  );
  doc.push("");
  doc.push(section("Unexpected Review Needed", unexpectedReview));
  doc.push(section("Expected Session-Managed Routes", expectedReview));
  doc.push(section("Public Or Internal Candidates", publicOrInternal));
  doc.push(section("Guarded Routes", guarded));

  fs.writeFileSync(OUTPUT_PATH, doc.join("\n"), "utf8");
  console.log(`Wrote guard map: ${toRel(OUTPUT_PATH)}`);

  if (strict && unexpectedReview.length > 0) {
    console.error(
      `[guard-map] unexpected review routes detected: ${unexpectedReview.length}`
    );
    process.exitCode = 1;
  }
}

main();
