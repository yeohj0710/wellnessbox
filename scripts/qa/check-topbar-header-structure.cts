import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const HEADER_PATH = path.resolve(process.cwd(), "components/common/topBar.header.tsx");
const COPY_PATH = path.resolve(process.cwd(), "components/common/topBar.copy.ts");
const DRAWER_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/common/useTopBarDrawerMode.ts"
);

function run() {
  const checks: string[] = [];
  const headerSource = fs.readFileSync(HEADER_PATH, "utf8");
  const copySource = fs.readFileSync(COPY_PATH, "utf8");
  const drawerHookSource = fs.readFileSync(DRAWER_HOOK_PATH, "utf8");

  assert.match(
    headerSource,
    /import \{ TOPBAR_COPY \} from "\.\/topBar\.copy";/,
    "TopBarHeader must import TOPBAR_COPY."
  );
  assert.match(
    headerSource,
    /import \{ useTopBarDrawerMode \} from "\.\/useTopBarDrawerMode";/,
    "TopBarHeader must import useTopBarDrawerMode."
  );
  assert.ok(
    !headerSource.includes("resolveTopBarDrawerMode"),
    "TopBarHeader should not call resolveTopBarDrawerMode directly after hook extraction."
  );
  checks.push("header_uses_copy_and_drawer_hook");

  for (const token of [
    "TOPBAR_COPY.brandAriaLabel",
    "TOPBAR_COPY.brandAlt",
    "TOPBAR_COPY.brandText",
    "TOPBAR_COPY.cartAriaLabel",
    "TOPBAR_COPY.commandButtonLabel",
    "TOPBAR_COPY.sevenDayPurchaseText",
    "TOPBAR_COPY.startText",
    "TOPBAR_COPY.drawerButtonAriaLabel",
  ]) {
    assert.ok(
      headerSource.includes(token),
      `[qa:topbar:header-structure] missing copy usage token: ${token}`
    );
  }
  checks.push("header_uses_korean_copy_tokens");

  assert.match(
    drawerHookSource,
    /export function useTopBarDrawerMode/,
    "useTopBarDrawerMode hook should export properly."
  );
  assert.ok(
    drawerHookSource.includes("resolveTopBarDrawerMode"),
    "useTopBarDrawerMode must own resolveTopBarDrawerMode integration."
  );
  checks.push("drawer_hook_owns_layout_resolution");

  const mojibakePattern = /\?[가-힣ㄱ-ㅎㅏ-ㅣ]/;
  assert.ok(
    !mojibakePattern.test(headerSource),
    "TopBarHeader contains potential mojibake pattern."
  );
  assert.ok(
    !mojibakePattern.test(copySource),
    "topBar.copy contains potential mojibake pattern."
  );
  checks.push("topbar_copy_and_header_have_no_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
