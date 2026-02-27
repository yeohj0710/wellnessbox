const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");

type ListFilesOptions = {
  excludeDirs?: string[] | Set<string>;
  includeExtensions?: string[] | Set<string>;
  ignoreDotEntries?: boolean;
};

function toSet(values?: string[] | Set<string>) {
  if (!values) return null;
  if (values instanceof Set) return values;
  return new Set(values);
}

function normalizeExtensions(values?: string[] | Set<string>) {
  const set = toSet(values);
  if (!set) return null;
  return new Set([...set].map((value) => value.toLowerCase()));
}

function listFilesRecursively(rootDir: string, options: ListFilesOptions = {}): string[] {
  if (!fs.existsSync(rootDir)) return [];

  const ignoreDotEntries = options.ignoreDotEntries !== false;
  const excludeDirs = toSet(options.excludeDirs);
  const includeExtensions = normalizeExtensions(options.includeExtensions);
  const out: string[] = [];

  function walk(currentDir: string) {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (ignoreDotEntries && entry.name.startsWith(".")) continue;
      const absPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (excludeDirs?.has(entry.name)) continue;
        walk(absPath);
        continue;
      }
      if (!entry.isFile()) continue;

      if (includeExtensions) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!includeExtensions.has(ext)) continue;
      }

      out.push(absPath);
    }
  }

  walk(rootDir);
  return out;
}

function countFileLines(filePath: string) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.length === 0) return 0;
  return source.split(/\r?\n/).length;
}

function toPosixRelative(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

module.exports = {
  countFileLines,
  listFilesRecursively,
  toPosixRelative,
};
