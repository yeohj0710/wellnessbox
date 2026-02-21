(function runEncodingAudit() {
  const { readFileSync, readdirSync } = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");

  type Finding = {
    file: string;
    line: number;
    reason: string;
    snippet: string;
  };

  const ROOT = process.cwd();
  const TEXT_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".md",
    ".json",
    ".css",
    ".scss",
    ".yml",
    ".yaml",
    ".txt",
  ]);

  const TEXT_FILENAMES = new Set([
    ".editorconfig",
    ".gitattributes",
    ".gitignore",
    ".npmrc",
    ".nvmrc",
    ".prettierrc",
    ".prettierignore",
  ]);

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

  const SELF_FILE_POSIX = "scripts/audit-encoding.ts";

  function toPosix(filePath: string) {
    return filePath.split(path.sep).join("/");
  }

  function shouldScanFile(filePath: string) {
    const basename = path.basename(filePath).toLowerCase();
    if (TEXT_FILENAMES.has(basename)) return true;
    const ext = path.extname(filePath).toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
  }

  function walk(relativeDir = ""): string[] {
    const currentDir = path.join(ROOT, relativeDir);
    const entries = readdirSync(currentDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        files.push(...walk(path.join(relativeDir, entry.name)));
        continue;
      }

      const nextPath = path.join(relativeDir, entry.name);
      if (!shouldScanFile(nextPath)) continue;
      files.push(nextPath);
    }

    return files;
  }

  function hasHanAndHangulMixed(line: string) {
    const hasHan = /[\u4E00-\u9FFF]/.test(line);
    const hasHangul = /[\uAC00-\uD7A3]/.test(line);
    return hasHan && hasHangul;
  }

  function isAllowedMixedLine(line: string) {
    return line.includes("CJK") || line.includes("Unicode");
  }

  function hasSuspiciousQuestionMarkPattern(line: string) {
    const trimmedLine = line.trim();
    if (
      /^\/.*\/[a-z]*[;,\s]*$/.test(trimmedLine) ||
      /=\s*\/.*\/[a-z]*[;,\s]*$/.test(trimmedLine)
    ) {
      return false;
    }

    if (line.includes("[\\uAC00-\\uD7A3]?")) {
      return false;
    }

    return (
      /[\uAC00-\uD7A3]\?[\uAC00-\uD7A3]/.test(line) ||
      /\?[\uAC00-\uD7A3]/.test(line)
    );
  }

  function hasSuspiciousDoubleQuestionLiteral(line: string) {
    return /(["'`])\?\?\1/.test(line);
  }

  function findLineIssues(filePath: string): Finding[] {
    const posixFilePath = toPosix(filePath);
    if (posixFilePath === SELF_FILE_POSIX) {
      return [];
    }

    const content = readFileSync(path.join(ROOT, filePath), "utf8");
    const lines = content.split(/\r?\n/);
    const findings: Finding[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (line.includes("\uFFFD")) {
        findings.push({
          file: posixFilePath,
          line: index + 1,
          reason: "contains Unicode replacement character",
          snippet: line.trim(),
        });
        continue;
      }

      if (/[\uF900-\uFAFF]/.test(line)) {
        findings.push({
          file: posixFilePath,
          line: index + 1,
          reason: "contains CJK compatibility ideograph",
          snippet: line.trim(),
        });
        continue;
      }

      if (hasHanAndHangulMixed(line) && !isAllowedMixedLine(line)) {
        findings.push({
          file: posixFilePath,
          line: index + 1,
          reason: "contains mixed Han + Hangul characters",
          snippet: line.trim(),
        });
        continue;
      }

      if (hasSuspiciousQuestionMarkPattern(line)) {
        findings.push({
          file: posixFilePath,
          line: index + 1,
          reason: "contains suspicious '?' pattern near Hangul",
          snippet: line.trim(),
        });
        continue;
      }

      if (hasSuspiciousDoubleQuestionLiteral(line)) {
        findings.push({
          file: posixFilePath,
          line: index + 1,
          reason: "contains suspicious '??' literal",
          snippet: line.trim(),
        });
      }
    }

    return findings;
  }

  function run() {
    const files = walk();
    const findings = files.flatMap((filePath) => findLineIssues(filePath));

    if (findings.length === 0) {
      console.log("Encoding audit passed: no suspicious mojibake patterns found.");
      return;
    }

    console.log(`Encoding audit failed: ${findings.length} issue(s) found.`);
    for (const finding of findings) {
      console.log(
        `- ${finding.file}:${finding.line} [${finding.reason}] ${finding.snippet}`
      );
    }
    process.exitCode = 1;
  }

  run();
})();
