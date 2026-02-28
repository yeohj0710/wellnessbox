const {
  countFileLines,
  listFilesRecursively,
  toPosixRelative,
} = require("./code-file-scan.cts") as {
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
const { shouldIncludeHotspotCodeFile } = require("./hotspot-paths.cts") as {
  shouldIncludeHotspotCodeFile: (rel: string) => boolean;
};

type HotspotCodeFile = {
  abs: string;
  rel: string;
};

type HotspotCodeRow = {
  abs: string;
  file: string;
  lines: number;
};

const DEFAULT_EXCLUDE_DIRS = [".git", "node_modules", ".next"] as const;
const DEFAULT_INCLUDE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

function listHotspotCodeFiles(rootDir: string): HotspotCodeFile[] {
  return listFilesRecursively(rootDir, {
    excludeDirs: [...DEFAULT_EXCLUDE_DIRS],
    includeExtensions: [...DEFAULT_INCLUDE_EXTENSIONS],
    ignoreDotEntries: true,
  })
    .map((absPath) => ({
      abs: absPath,
      rel: toPosixRelative(rootDir, absPath),
    }))
    .filter((item) => shouldIncludeHotspotCodeFile(item.rel));
}

function buildHotspotCodeRows(rootDir: string): HotspotCodeRow[] {
  return listHotspotCodeFiles(rootDir).map((item) => ({
    abs: item.abs,
    file: item.rel,
    lines: countFileLines(item.abs),
  }));
}

module.exports = {
  buildHotspotCodeRows,
  listHotspotCodeFiles,
};
