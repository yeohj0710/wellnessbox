import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const HOME_SECTION_PATH = path.resolve(
  process.cwd(),
  "app/(components)/homeProductSection.tsx"
);
const HOME_SECTION_DATA_PATH = path.resolve(
  process.cwd(),
  "app/(components)/useHomeProductSectionData.ts"
);
const HOME_SECTION_CONTENT_PATH = path.resolve(
  process.cwd(),
  "app/(components)/homeProductSection.content.tsx"
);

function run() {
  const homeSectionSource = fs.readFileSync(HOME_SECTION_PATH, "utf8");
  const dataSource = fs.readFileSync(HOME_SECTION_DATA_PATH, "utf8");
  const contentSource = fs.readFileSync(HOME_SECTION_CONTENT_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    homeSectionSource,
    /import \{ useHomeProductSectionData \} from "\.\/useHomeProductSectionData";/,
    "homeProductSection.tsx must import the extracted data hook."
  );
  checks.push("home_section_imports_data_hook");

  assert.match(
    homeSectionSource,
    /import \{ HomeProductSectionContent \} from "\.\/homeProductSection\.content";/,
    "homeProductSection.tsx must import the extracted content shell."
  );
  checks.push("home_section_imports_content_shell");

  for (const legacyToken of [
    'const applyHomeData = useCallback(',
    'const fetchData = useCallback(',
    '<AddressSection',
    '<ProductDetail',
    '<Cart',
  ]) {
    assert.ok(
      !homeSectionSource.includes(legacyToken),
      `homeProductSection.tsx should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("home_section_no_longer_keeps_inline_fetch_and_render_shell");

  for (const token of [
    "export function useHomeProductSectionData(",
    "const applyHomeData = useCallback(",
    "const fetchData = useCallback(",
    "readCachedHomeData(HOME_CACHE_TTL_MS)",
    "readCachedHomeData(HOME_STALE_CACHE_TTL_MS)",
  ]) {
    assert.ok(
      dataSource.includes(token),
      `[qa:home:data-content] missing data-hook token: ${token}`
    );
  }
  checks.push("data_hook_owns_cache_and_fetch_lifecycle");

  for (const token of [
    "export function HomeProductSectionContent(",
    "<AddressSection",
    "<ProductGrid",
    "<ProductDetail",
    "<Cart",
  ]) {
    assert.ok(
      contentSource.includes(token),
      `[qa:home:data-content] missing content-shell token: ${token}`
    );
  }
  checks.push("content_shell_owns_view_composition_and_overlays");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
