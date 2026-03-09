import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ENTRY_PATH = path.resolve(ROOT_DIR, "lib/b2b/export/pipeline.ts");
const SUPPORT_PATH = path.resolve(ROOT_DIR, "lib/b2b/export/pipeline-support.ts");

function run() {
  const entrySource = fs.readFileSync(ENTRY_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    entrySource,
    /from "@\/lib\/b2b\/export\/pipeline-support"/,
    "pipeline.ts must import shared export pipeline helpers from pipeline-support.ts."
  );
  checks.push("entry_imports_pipeline_support_module");

  for (const token of [
    "function deepClone<",
    "function shortenText(",
    "function shortenPayloadText(",
    "function resolveStylePresetCandidates(",
    "function buildPptxFilename(",
  ]) {
    assert.ok(
      !entrySource.includes(token),
      `[qa:b2b:export-pipeline-support-modules] pipeline.ts should not keep extracted helper: ${token}`
    );
  }
  checks.push("entry_no_longer_keeps_inline_clone_or_filename_helpers");

  for (const token of [
    "export function cloneExportPayload<",
    "function shortenText(",
    "export function shortenExportPayloadText(",
    "export function resolveExportStylePresetCandidates(",
    "export function buildExportPptxFilename(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:b2b:export-pipeline-support-modules] pipeline-support.ts missing token: ${token}`
    );
  }
  checks.push("support_module_owns_clone_text_preset_and_filename_helpers");

  assert.match(
    entrySource,
    /const stylePresetCandidates = resolveExportStylePresetCandidates\(input\.variantIndex\);/,
    "pipeline.ts must use extracted style preset candidate helper."
  );
  assert.match(
    entrySource,
    /const basePayload = cloneExportPayload\(input\.payload\);/,
    "pipeline.ts must clone payload via extracted helper."
  );
  assert.match(
    entrySource,
    /const shortenedPayload = shortenExportPayloadText\(basePayload\);/,
    "pipeline.ts must shorten payload text via extracted helper."
  );
  assert.match(
    entrySource,
    /const filename = buildExportPptxFilename\(\{/,
    "pipeline.ts must build export filenames via extracted helper."
  );
  checks.push("entry_uses_extracted_support_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
