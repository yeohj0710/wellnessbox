import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_ITEMS_SECTION_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.tsx"
);
const CART_ITEM_ROW_PATH = path.resolve(
  process.cwd(),
  "components/order/CartItemRow.tsx"
);
const STATUS_CONTENT_PATH = path.resolve(
  process.cwd(),
  "components/order/CartItemsSectionStatusContent.tsx"
);
const COPY_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.copy.ts"
);

function run() {
  const checks: string[] = [];
  const sectionSource = fs.readFileSync(CART_ITEMS_SECTION_PATH, "utf8");
  const rowSource = fs.readFileSync(CART_ITEM_ROW_PATH, "utf8");
  const statusSource = fs.readFileSync(STATUS_CONTENT_PATH, "utf8");
  const copySource = fs.readFileSync(COPY_PATH, "utf8");

  assert.ok(
    !sectionSource.includes("<CartItemRow"),
    "CartItemsSection should delegate row rendering through status content component."
  );
  assert.match(
    statusSource,
    /import CartItemRow from "\.\/CartItemRow";/,
    "CartItemsSectionStatusContent must import CartItemRow."
  );
  assert.ok(
    statusSource.includes("<CartItemRow"),
    "CartItemsSectionStatusContent must render CartItemRow."
  );
  checks.push("row_component_used_via_status_content_component");

  for (const legacyToken of [
    "product.images && product.images.length > 0",
    "<TrashIcon className=\"w-5 h-5 text-red-500\" />",
    "buildDecrementedCartItems(",
    "buildIncrementedCartItems(",
    "buildRemovedCartItems(",
  ]) {
    assert.ok(
      !sectionSource.includes(legacyToken),
      `CartItemsSection should not keep inline row logic token: ${legacyToken}`
    );
  }
  checks.push("section_has_no_inline_row_logic");

  for (const token of [
    "buildDecrementedCartItems(",
    "buildIncrementedCartItems(",
    "buildRemovedCartItems(",
    "CART_ITEMS_SECTION_COPY.noImageLabel",
    "CART_ITEMS_SECTION_COPY.noCategoryLabel",
    "CART_ITEMS_SECTION_COPY.currencyUnit",
  ]) {
    assert.ok(
      rowSource.includes(token),
      `[qa:cart:item-row-extraction] missing CartItemRow token: ${token}`
    );
  }
  checks.push("row_component_owns_item_ui_and_actions");

  for (const copyToken of [
    "sectionTitle",
    "retryButtonLabel",
    "missingPharmacyFallback",
    "addressSettingsLabel",
    "checkAgainLabel",
    "unresolvedItemsMessage",
    "noImageLabel",
    "noCategoryLabel",
    "emptyMessage",
    "currencyUnit",
  ]) {
    assert.ok(
      copySource.includes(copyToken),
      `[qa:cart:item-row-extraction] missing copy token: ${copyToken}`
    );
  }
  checks.push("copy_module_contains_expected_tokens");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
