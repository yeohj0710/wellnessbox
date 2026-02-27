const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const HTTP_METHOD_PATTERN = HTTP_METHODS.join("|");
const HTTP_METHOD_SET = new Set(HTTP_METHODS);

function stripComments(block: string) {
  return block
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function parseNamedSpecifiers(block: string) {
  return stripComments(block)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function walkRouteFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkRouteFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(full);
    }
  }

  return files;
}

function extractImportedMethodAliases(source: string): string[] {
  const methods = new Set<string>();
  const importBlockRegex = /import\s*\{([\s\S]*?)\}\s*from\s*["'][^"']+["']/g;

  for (const match of source.matchAll(importBlockRegex)) {
    const specifiers = parseNamedSpecifiers(match[1]);
    for (const specifier of specifiers) {
      const aliasMatch = specifier.match(
        new RegExp(`\\bas\\s+(${HTTP_METHOD_PATTERN})\\b`)
      );
      if (aliasMatch) {
        methods.add(aliasMatch[1]);
        continue;
      }
      if (HTTP_METHOD_SET.has(specifier)) {
        methods.add(specifier);
      }
    }
  }

  return [...methods].sort();
}

function extractExportedHttpMethods(source: string): string[] {
  const methods = new Set<string>();
  const functionRegex = new RegExp(
    `\\bexport\\s+(?:async\\s+)?function\\s+(${HTTP_METHOD_PATTERN})\\s*\\(`,
    "g"
  );
  const constRegex = new RegExp(
    `\\bexport\\s+const\\s+(${HTTP_METHOD_PATTERN})\\s*=`,
    "g"
  );
  const exportBlockRegex =
    /export\s*\{([\s\S]*?)\}\s*(?:from\s*["'][^"']+["'])?\s*;?/g;

  for (const match of source.matchAll(functionRegex)) {
    methods.add(match[1]);
  }

  for (const match of source.matchAll(constRegex)) {
    methods.add(match[1]);
  }

  for (const match of source.matchAll(exportBlockRegex)) {
    const specifiers = parseNamedSpecifiers(match[1]);
    for (const specifier of specifiers) {
      if (specifier.startsWith("type ")) continue;
      const aliasMatch = specifier.match(
        new RegExp(`\\bas\\s+(${HTTP_METHOD_PATTERN})\\b`)
      );
      if (aliasMatch) {
        methods.add(aliasMatch[1]);
        continue;
      }
      if (HTTP_METHOD_SET.has(specifier)) {
        methods.add(specifier);
      }
    }
  }

  return [...methods].sort();
}

module.exports = {
  HTTP_METHODS,
  extractExportedHttpMethods,
  extractImportedMethodAliases,
  walkRouteFiles,
};
