(function runRouteMethodExportAudit() {
  const { existsSync, readFileSync } = require("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const {
    extractExportedHttpMethods,
    extractImportedMethodAliases,
    walkRouteFiles,
  } = require("./lib/route-method-audit.cts") as {
    extractExportedHttpMethods: (source: string) => string[];
    extractImportedMethodAliases: (source: string) => string[];
    walkRouteFiles: (dir: string) => string[];
  };

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app", "api");

type Finding = {
  file: string;
  issue: "missing_exports" | "missing_alias_exports";
  importedMethods: string[];
  exportedMethods: string[];
  missingMethods: string[];
};

function toPosix(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function toRepoRelative(filePath: string) {
  return toPosix(path.relative(ROOT, filePath));
}

function main() {
  if (!existsSync(API_ROOT)) {
    console.log("Route method export audit skipped: app/api directory not found.");
    return;
  }

  const routeFiles = walkRouteFiles(API_ROOT);
  const findings: Finding[] = [];

  for (const routeFile of routeFiles) {
    const source = readFileSync(routeFile, "utf8");
    const exportedMethods = extractExportedHttpMethods(source);
    if (exportedMethods.length === 0) {
      findings.push({
        file: toRepoRelative(routeFile),
        issue: "missing_exports",
        importedMethods: [],
        exportedMethods: [],
        missingMethods: [],
      });
      continue;
    }

    const importedMethods = extractImportedMethodAliases(source);
    if (importedMethods.length === 0) continue;

    const exportedSet = new Set(exportedMethods);
    const missingMethods = importedMethods.filter((method) => !exportedSet.has(method));
    if (missingMethods.length === 0) continue;

    findings.push({
      file: toRepoRelative(routeFile),
      issue: "missing_alias_exports",
      importedMethods,
      exportedMethods,
      missingMethods,
    });
  }

  if (findings.length === 0) {
    console.log("Route method export audit passed: no missing HTTP method exports found.");
    return;
  }

  console.log("Route method export audit failed:");
  for (const finding of findings) {
    console.log(`- ${finding.file}`);
    if (finding.issue === "missing_exports") {
      console.log("  issue: no exported HTTP method handler found in route.ts");
      continue;
    }
    console.log(`  imported HTTP methods: ${finding.importedMethods.join(", ")}`);
    console.log(
      `  exported HTTP methods: ${
        finding.exportedMethods.length > 0 ? finding.exportedMethods.join(", ") : "(none)"
      }`
    );
    console.log(`  missing exports: ${finding.missingMethods.join(", ")}`);
  }

  process.exitCode = 1;
}

  main();
})();
