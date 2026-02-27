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
  isApiRouteFile,
  isFrontendSurfaceFile,
  isScriptFile,
} = require("./lib/hotspot-paths.cts") as {
  isApiRouteFile: (file: string) => boolean;
  isFrontendSurfaceFile: (file: string) => boolean;
  isScriptFile: (file: string) => boolean;
};
const {
  runGuardChecks,
  runRouteMethodExportChecks,
  runUnexpectedSessionRouteChecks,
} = require("./lib/hotspot-audit-checks.cts") as {
  runGuardChecks: (rootDir: string) => { passed: number; failed: number };
  runUnexpectedSessionRouteChecks: (routeRows: Array<{
    abs: string;
    file: string;
    lines: number;
  }>) => { expected: number; unexpected: number };
  runRouteMethodExportChecks: (rootDir: string) => { checked: number; failed: number };
};
const {
  buildHotspotReport,
  printHotspotSection,
} = require("./lib/hotspot-report.cts") as {
  buildHotspotReport: (
    rows: Array<{ file: string; lines: number }>,
    limit: number,
    predicate?: (file: string) => boolean
  ) => Array<{ file: string; lines: number }>;
  printHotspotSection: (
    title: string,
    rows: Array<{ file: string; lines: number }>
  ) => void;
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

function main() {
  const runtimeHotspots = buildHotspotReport(
    CODE_FILE_ROWS,
    25,
    (file) => !isScriptFile(file)
  );
  printHotspotSection("== Runtime Code Hotspots (Top 25 by line count) ==", runtimeHotspots);

  const apiRouteHotspots = buildHotspotReport(
    CODE_FILE_ROWS,
    20,
    (file) => isApiRouteFile(file)
  );
  console.log("");
  printHotspotSection("== API Route Hotspots (Top 20 by line count) ==", apiRouteHotspots);

  const frontendHotspots = buildHotspotReport(
    CODE_FILE_ROWS,
    20,
    (file) => isFrontendSurfaceFile(file)
  );
  console.log("");
  printHotspotSection(
    "== Frontend Surface Hotspots (Top 20 by line count) ==",
    frontendHotspots
  );

  const scriptHotspots = buildHotspotReport(
    CODE_FILE_ROWS,
    15,
    (file) => isScriptFile(file)
  );
  console.log("");
  printHotspotSection("== Script Hotspots (Top 15 by line count) ==", scriptHotspots);

  console.log("");
  console.log("== Critical Route Guard Checks ==");
  const guardResult = runGuardChecks(ROOT);
  console.log(
    `Guard summary: ${guardResult.passed} passed, ${guardResult.failed} failed`
  );

  console.log("");
  console.log("== Unexpected Session Route Checks ==");
  const sessionResult = runUnexpectedSessionRouteChecks(
    CODE_FILE_ROWS.filter((row) => isApiRouteFile(row.file))
  );
  console.log(
    `Session route summary: ${sessionResult.expected} expected, ${sessionResult.unexpected} unexpected`
  );

  console.log("");
  console.log("== Route Method Export Checks ==");
  const routeMethodResult = runRouteMethodExportChecks(ROOT);
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
