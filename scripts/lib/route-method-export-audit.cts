const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const { toPosixRelative } = require("./code-file-scan.cts") as {
  toPosixRelative: (rootDir: string, filePath: string) => string;
};
const {
  extractExportedHttpMethods,
  extractImportedMethodAliases,
  walkRouteFiles,
} = require("./route-method-audit.cts") as {
  extractExportedHttpMethods: (source: string) => string[];
  extractImportedMethodAliases: (source: string) => string[];
  walkRouteFiles: (dir: string) => string[];
};

type RouteMethodExportFinding = {
  file: string;
  issue: "missing_exports" | "missing_alias_exports";
  importedMethods: string[];
  exportedMethods: string[];
  missingMethods: string[];
};

type RouteMethodExportAuditResult = {
  checked: number;
  skipped: boolean;
  findings: RouteMethodExportFinding[];
};

function auditRouteMethodExports(rootDir: string): RouteMethodExportAuditResult {
  const apiRoot = path.join(rootDir, "app", "api");
  if (!fs.existsSync(apiRoot)) {
    return {
      checked: 0,
      skipped: true,
      findings: [],
    };
  }

  const routeFiles = walkRouteFiles(apiRoot);
  const findings: RouteMethodExportFinding[] = [];

  for (const routeFile of routeFiles) {
    const source = fs.readFileSync(routeFile, "utf8");
    const exportedMethods = extractExportedHttpMethods(source);
    const file = toPosixRelative(rootDir, routeFile);

    if (exportedMethods.length === 0) {
      findings.push({
        file,
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
      file,
      issue: "missing_alias_exports",
      importedMethods,
      exportedMethods,
      missingMethods,
    });
  }

  return {
    checked: routeFiles.length,
    skipped: false,
    findings,
  };
}

module.exports = {
  auditRouteMethodExports,
};
