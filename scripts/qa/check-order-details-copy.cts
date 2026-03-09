import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_PATH = path.resolve(ROOT_DIR, "components/order/orderDetails.tsx");

function run() {
  const source = fs.readFileSync(TARGET_PATH, "utf8");
  const checks: string[] = [];

  for (const token of [
    ': "주문 정보를 불러오지 못했습니다.";',
    "주문을 불러오지 못했어요.",
    "뒤로 가기",
    'aria-label="주문 페이지네이션"',
    'aria-label="첫 페이지"',
    'aria-label="이전 페이지"',
    'aria-label="다음 페이지"',
    'aria-label="마지막 페이지"',
    "페이지 {currentPage} / {totalPages}",
  ]) {
    assert.ok(
      source.includes(token),
      `[qa:order:details-copy] missing localized token: ${token}`
    );
  }
  checks.push("order_details_uses_korean_copy_for_error_and_pagination");

  for (const token of [
    "二쇰Ц",
    "?섏씠吏",
    "?댁쟾 ?섏씠吏",
    "?ㅼ쓬 ?섏씠吏",
    "留덉?留??섏씠吏",
    "?ㅻ줈 媛湲?",
  ]) {
    assert.ok(
      !source.includes(token),
      `[qa:order:details-copy] stale mojibake token should be removed: ${token}`
    );
  }
  checks.push("order_details_removes_stale_mojibake_tokens");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
