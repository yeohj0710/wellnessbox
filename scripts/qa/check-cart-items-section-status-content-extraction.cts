import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SECTION_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.tsx"
);
const STATUS_CONTENT_PATH = path.resolve(
  process.cwd(),
  "components/order/CartItemsSectionStatusContent.tsx"
);

function run() {
  const checks: string[] = [];
  const sectionSource = fs.readFileSync(SECTION_PATH, "utf8");
  const statusSource = fs.readFileSync(STATUS_CONTENT_PATH, "utf8");

  assert.match(
    sectionSource,
    /import CartItemsSectionStatusContent from "\.\/CartItemsSectionStatusContent";/,
    "CartItemsSection must import CartItemsSectionStatusContent."
  );
  assert.ok(
    sectionSource.includes("<CartItemsSectionStatusContent"),
    "CartItemsSection must render CartItemsSectionStatusContent."
  );
  checks.push("section_uses_status_content_component");

  for (const legacyToken of [
    "cartProductsError ? (",
    "missingPharmacy ? (",
    "unresolvedItems ? (",
    "Array.from({ length: 3 })",
  ]) {
    assert.ok(
      !sectionSource.includes(legacyToken),
      `CartItemsSection should not keep inline status branch token: ${legacyToken}`
    );
  }
  checks.push("section_has_no_inline_status_branches");

  for (const statusToken of [
    "if (resolving)",
    "if (cartProductsError)",
    "if (missingPharmacy)",
    "if (unresolvedItems)",
    "if (items.length > 0)",
    "Array.from({ length: 3 })",
    "CartItemRow",
  ]) {
    assert.ok(
      statusSource.includes(statusToken),
      `[qa:cart:items-section-status-content-extraction] missing status token: ${statusToken}`
    );
  }
  checks.push("status_content_component_owns_status_and_list_rendering");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
