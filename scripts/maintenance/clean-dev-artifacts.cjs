"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

const artifactMatchers = [
  {
    dir: repoRoot,
    patterns: [
      /^\.codex-.*\.(log|pid)$/i,
      /^\.next-dev.*\.log$/i,
      /^\.tmp-.*\.log$/i,
    ],
  },
  {
    dir: path.join(repoRoot, ".tmp"),
    patterns: [/^.*\.log$/i],
  },
  {
    dir: path.join(repoRoot, "tmp"),
    patterns: [/^.*\.log$/i],
  },
];

function collectMatches(dir, patterns) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && patterns.some((pattern) => pattern.test(entry.name)))
    .map((entry) => path.join(dir, entry.name));
}

function main() {
  const matches = artifactMatchers.flatMap(({ dir, patterns }) => collectMatches(dir, patterns));

  if (matches.length === 0) {
    console.log("[clean-dev-artifacts] no matching files found");
    return;
  }

  for (const targetPath of matches) {
    fs.rmSync(targetPath, { force: true });
    console.log(`[clean-dev-artifacts] deleted ${path.relative(repoRoot, targetPath)}`);
  }

  console.log(`[clean-dev-artifacts] removed ${matches.length} file(s)`);
}

main();
