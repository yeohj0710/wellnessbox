import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_PATH = path.resolve(
  ROOT_DIR,
  "components/order/customerOrderAccordionItem.tsx"
);

function run() {
  const source = fs.readFileSync(TARGET_PATH, "utf8");
  const checks: string[] = [];

  for (const token of [
    'alert("메시지 전송에 실패했습니다.");',
    'window.confirm("정말로 메시지를 삭제할까요?")',
    'alert("메시지 삭제에 실패했습니다.");',
  ]) {
    assert.ok(
      source.includes(token),
      `[qa:order:accordion-copy] missing localized token: ${token}`
    );
  }
  checks.push("customer_order_accordion_uses_korean_message_actions_copy");

  for (const token of [
    "硫붿떆吏",
    "?뺣쭚濡?硫붿떆吏瑜???젣?좉퉴??",
    "??젣???ㅽ뙣",
  ]) {
    assert.ok(
      !source.includes(token),
      `[qa:order:accordion-copy] stale mojibake token should be removed: ${token}`
    );
  }
  checks.push("customer_order_accordion_removes_stale_mojibake_tokens");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
