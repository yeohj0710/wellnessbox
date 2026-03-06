import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const COPY_PATH = path.resolve(process.cwd(), "app/survey/_lib/survey-page-copy.ts");

function run() {
  const checks: string[] = [];
  const source = fs.readFileSync(COPY_PATH, "utf8");

  assert.ok(!/\\u[0-9A-Fa-f]{4}/.test(source), "survey-page-copy should use readable Korean text, not unicode escape sequences.");
  checks.push("copy_has_no_unicode_escape_sequences");

  assert.match(source, /introTitle: "웰니스박스 온라인 건강 설문"/, "introTitle should remain a readable Korean string literal.");
  assert.match(source, /submittedTitle: "설문이 제출되었습니다\."/, "submittedTitle should remain a readable Korean string literal.");
  checks.push("copy_contains_expected_korean_literals");

  assert.match(source, /const TEXT = \{[\s\S]*\} as const;/, "TEXT should be declared with 'as const' for stable key/value typing.");
  assert.match(
    source,
    /const CALCULATING_MESSAGES = \[[\s\S]*\] as const;/,
    "CALCULATING_MESSAGES should be declared with 'as const' for stable readonly typing."
  );
  checks.push("copy_uses_const_assertions");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
