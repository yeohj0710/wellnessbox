/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const QA_DIR = path.join(process.cwd(), "scripts", "qa");

function collectCjsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCjsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".cjs")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function runNodeCheck(filePath) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "pipe",
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stderr: result.stderr || "",
  };
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function main() {
  if (!fs.existsSync(QA_DIR)) {
    console.error("[qa:syntax] scripts/qa directory not found");
    process.exit(1);
  }

  const cjsFiles = collectCjsFiles(QA_DIR);
  if (cjsFiles.length === 0) {
    console.log("[qa:syntax] no .cjs files found");
    return;
  }

  const failures = [];
  for (const filePath of cjsFiles) {
    const checked = runNodeCheck(filePath);
    if (!checked.ok) {
      failures.push({
        file: relativePath(filePath),
        stderr: checked.stderr.trim(),
      });
    }
  }

  if (failures.length > 0) {
    console.error(`[qa:syntax] failed: ${failures.length} file(s)`);
    for (const failure of failures) {
      console.error(`- ${failure.file}`);
      if (failure.stderr) {
        console.error(failure.stderr);
      }
    }
    process.exit(1);
  }

  console.log(`[qa:syntax] passed: ${cjsFiles.length} file(s)`);
}

main();
