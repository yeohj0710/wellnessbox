const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");

type EncodingFinding = {
  file: string;
  line: number;
  reason: string;
  snippet: string;
};

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

const AUDIT_ENTRY_FILE_POSIX = "scripts/audit-encoding.ts";
const AUDIT_CORE_FILE_POSIX = "scripts/lib/encoding-audit.cts";

function toPosix(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function shouldScanFile(filePath: string) {
  const basename = path.basename(filePath).toLowerCase();
  if (TEXT_FILENAMES.has(basename)) return true;
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function walkScannableFiles(rootDir: string, relativeDir = ""): string[] {
  const currentDir = path.join(rootDir, relativeDir);
  const entries = fs
    .readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...walkScannableFiles(rootDir, path.join(relativeDir, entry.name)));
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

function findLineByIndex(content: string, index: number) {
  const safeIndex = Math.max(0, Math.min(index, content.length));
  const line = content.slice(0, safeIndex).split(/\n/).length;
  const lineText = content.split(/\r?\n/)[line - 1] ?? "";
  return { line, lineText };
}

function findLineIssues(rootDir: string, filePath: string): EncodingFinding[] {
  const posixFilePath = toPosix(filePath);
  if (
    posixFilePath === AUDIT_ENTRY_FILE_POSIX ||
    posixFilePath === AUDIT_CORE_FILE_POSIX
  ) {
    return [];
  }

  const buffer = fs.readFileSync(path.join(rootDir, filePath));
  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);
  const findings: EncodingFinding[] = [];

  const hasUtf8Bom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;

  if (hasUtf8Bom) {
    findings.push({
      file: posixFilePath,
      line: 1,
      reason: "contains UTF-8 BOM (use UTF-8 without BOM)",
      snippet: lines[0]?.trim() ?? "",
    });
  }

  const firstCrIndex = content.indexOf("\r");
  if (firstCrIndex >= 0) {
    const { line, lineText } = findLineByIndex(content, firstCrIndex);
    findings.push({
      file: posixFilePath,
      line,
      reason: "contains CRLF/CR line endings (use LF only)",
      snippet: lineText.trim(),
    });
  }

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

function collectEncodingFindings(rootDir: string): EncodingFinding[] {
  const files = walkScannableFiles(rootDir);
  return files.flatMap((filePath) => findLineIssues(rootDir, filePath));
}

module.exports = {
  collectEncodingFindings,
};
