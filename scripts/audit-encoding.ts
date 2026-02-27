(function runEncodingAudit() {
  const { collectEncodingFindings } = require("./lib/encoding-audit.cts") as {
    collectEncodingFindings: (rootDir: string) => Array<{
      file: string;
      line: number;
      reason: string;
      snippet: string;
    }>;
  };

  const findings = collectEncodingFindings(process.cwd());

  if (findings.length === 0) {
    console.log("Encoding audit passed: no suspicious mojibake patterns found.");
    return;
  }

  console.log(`Encoding audit failed: ${findings.length} issue(s) found.`);
  for (const finding of findings) {
    console.log(`- ${finding.file}:${finding.line} [${finding.reason}] ${finding.snippet}`);
  }
  process.exitCode = 1;
})();
