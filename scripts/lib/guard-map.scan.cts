const fs = require("node:fs") as typeof import("node:fs");
const pathUtil = require("node:path") as typeof import("node:path");
const {
  extractExportedHttpMethods,
  walkRouteFiles: walkApiRouteFiles,
} = require("./route-method-audit.cts") as {
  extractExportedHttpMethods: (source: string) => string[];
  walkRouteFiles: (dir: string) => string[];
};
const {
  extractGuardCalls,
  hasRouteAuthImport,
} = require("./route-guard-scan.cts") as {
  extractGuardCalls: (source: string, guardTokens: string[]) => string[];
  hasRouteAuthImport: (source: string) => boolean;
};

type RouteEntryClassification =
  | "guarded"
  | "review_expected"
  | "review_unexpected"
  | "public_or_internal";

type RouteEntry = {
  file: string;
  route: string;
  methods: string[];
  guards: string[];
  directGuards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
  note: string | null;
  classification: RouteEntryClassification;
};

type GuardMapGroups = {
  guarded: RouteEntry[];
  expectedReview: RouteEntry[];
  unexpectedReview: RouteEntry[];
  publicOrInternal: RouteEntry[];
  missingMethodExports: RouteEntry[];
};

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
];

function toRel(repoRoot: string, filePath: string) {
  return pathUtil.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function readUtf8(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function extractModuleSpecifiers(source: string) {
  const specifiers = new Set<string>();

  const fromPattern = /\b(?:import|export)\s[\s\S]*?\bfrom\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(fromPattern)) {
    if (match[1]) specifiers.add(match[1]);
  }

  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(dynamicImportPattern)) {
    if (match[1]) specifiers.add(match[1]);
  }

  return [...specifiers];
}

function toImportBasePath(repoRoot: string, importerFile: string, specifier: string) {
  if (specifier.startsWith("@/")) {
    return pathUtil.join(repoRoot, specifier.slice(2));
  }
  if (specifier.startsWith(".")) {
    return pathUtil.resolve(pathUtil.dirname(importerFile), specifier);
  }
  return null;
}

function tryResolveSourceFile(basePath: string) {
  if (pathUtil.extname(basePath)) {
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath;
    }
    return null;
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = `${basePath}${ext}`;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const indexPath = pathUtil.join(basePath, `index${ext}`);
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return indexPath;
    }
  }

  return null;
}

function collectTransitiveSourceNodes(input: {
  repoRoot: string;
  entryFile: string;
  maxDepth?: number;
}) {
  const maxDepth = input.maxDepth ?? 6;
  const visitedDepth = new Map<string, number>();
  const queue: Array<{ file: string; depth: number }> = [
    { file: input.entryFile, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const normalizedFile = pathUtil.normalize(current.file);
    const previousDepth = visitedDepth.get(normalizedFile);
    if (previousDepth !== undefined && previousDepth <= current.depth) continue;
    visitedDepth.set(normalizedFile, current.depth);

    if (current.depth >= maxDepth) continue;

    let source = "";
    try {
      source = readUtf8(normalizedFile);
    } catch {
      continue;
    }

    const specifiers = extractModuleSpecifiers(source);
    for (const specifier of specifiers) {
      const importBasePath = toImportBasePath(
        input.repoRoot,
        normalizedFile,
        specifier
      );
      if (!importBasePath) continue;
      const resolved = tryResolveSourceFile(importBasePath);
      if (!resolved) continue;
      if (!resolved.startsWith(input.repoRoot)) continue;
      queue.push({ file: resolved, depth: current.depth + 1 });
    }
  }

  return [...visitedDepth.entries()].map(([file, depth]) => ({ file, depth }));
}

function collectRouteGuardSignals(input: {
  repoRoot: string;
  routeFilePath: string;
  routeGuardTokens: string[];
}) {
  const sourceNodes = collectTransitiveSourceNodes({
    repoRoot: input.repoRoot,
    entryFile: input.routeFilePath,
  });

  const directSource = readUtf8(input.routeFilePath);
  const directGuards = extractGuardCalls(directSource, input.routeGuardTokens);

  const guardSet = new Set<string>();
  let importsRouteAuth = false;
  let usesGetSession = false;

  for (const node of sourceNodes) {
    const source = readUtf8(node.file);
    const guards = extractGuardCalls(source, input.routeGuardTokens);
    for (const guard of guards) {
      guardSet.add(guard);
    }

    if (node.depth <= 1 && !importsRouteAuth && hasRouteAuthImport(source)) {
      importsRouteAuth = true;
    }
    if (node.depth <= 1 && !usesGetSession && source.includes("getSession(")) {
      usesGetSession = true;
    }
  }

  return {
    guards: [...guardSet].sort((a, b) => a.localeCompare(b)),
    directGuards,
    importsRouteAuth,
    usesGetSession,
  };
}

function toRoutePath(relativeRouteFile: string) {
  return (
    "/" +
    relativeRouteFile
      .replace(/^app\/api\//, "api/")
      .replace(/\/route\.ts$/, "")
  );
}

function resolveClassification(input: {
  route: string;
  guards: string[];
  importsRouteAuth: boolean;
  usesGetSession: boolean;
  expectedSessionRouteNotes: Record<string, string>;
}): RouteEntryClassification {
  if (input.guards.length > 0) return "guarded";
  if (input.expectedSessionRouteNotes[input.route]) return "review_expected";
  if (input.usesGetSession || input.importsRouteAuth) {
    return "review_unexpected";
  }
  return "public_or_internal";
}

function scanApiGuardEntries(input: {
  repoRoot: string;
  apiRoot: string;
  routeGuardTokens: string[];
  expectedSessionRouteNotes: Record<string, string>;
}): RouteEntry[] {
  return walkApiRouteFiles(input.apiRoot)
    .map((filePath) => {
      const file = toRel(input.repoRoot, filePath);
      const source = readUtf8(filePath);
      const route = toRoutePath(file);
      const signals = collectRouteGuardSignals({
        repoRoot: input.repoRoot,
        routeFilePath: filePath,
        routeGuardTokens: input.routeGuardTokens,
      });

      return {
        file,
        route,
        methods: extractExportedHttpMethods(source),
        guards: signals.guards,
        directGuards: signals.directGuards,
        importsRouteAuth: signals.importsRouteAuth,
        usesGetSession: signals.usesGetSession,
        note: input.expectedSessionRouteNotes[route] ?? null,
        classification: resolveClassification({
          route,
          guards: signals.guards,
          importsRouteAuth: signals.importsRouteAuth,
          usesGetSession: signals.usesGetSession,
          expectedSessionRouteNotes: input.expectedSessionRouteNotes,
        }),
      } satisfies RouteEntry;
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

function groupRouteEntries(entries: RouteEntry[]): GuardMapGroups {
  return {
    guarded: entries.filter((entry) => entry.classification === "guarded"),
    expectedReview: entries.filter(
      (entry) => entry.classification === "review_expected"
    ),
    unexpectedReview: entries.filter(
      (entry) => entry.classification === "review_unexpected"
    ),
    publicOrInternal: entries.filter(
      (entry) => entry.classification === "public_or_internal"
    ),
    missingMethodExports: entries.filter((entry) => entry.methods.length === 0),
  };
}

module.exports = {
  groupRouteEntries,
  scanApiGuardEntries,
};
