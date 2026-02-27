(function runRouteMethodExportAudit() {
  const { auditRouteMethodExports } = require("./lib/route-method-export-audit.cts") as {
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

  const auditResult = auditRouteMethodExports(process.cwd());
  if (auditResult.skipped) {
    console.log("Route method export audit skipped: app/api directory not found.");
    return;
  }

  if (auditResult.findings.length === 0) {
    console.log("Route method export audit passed: no missing HTTP method exports found.");
    return;
  }

  console.log("Route method export audit failed:");
  for (const finding of auditResult.findings) {
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
})();
