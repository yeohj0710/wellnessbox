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
const VIEW_MODEL_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.view-model.ts"
);

function run() {
  const checks: string[] = [];
  const sectionSource = fs.readFileSync(CART_ITEMS_SECTION_PATH, "utf8");
  const rowSource = fs.readFileSync(CART_ITEM_ROW_PATH, "utf8");
  const viewModelSource = fs.readFileSync(VIEW_MODEL_PATH, "utf8");

  assert.match(
    sectionSource,
    /from "\.\/cartItemsSection\.view-model"/,
    "CartItemsSection must import cartItemsSection.view-model."
  );
  checks.push("section_imports_view_model");

  for (const usageToken of [
    "buildResolvedCartItemRows(",
    "buildCartItemsSectionViewState(",
  ]) {
    assert.ok(
      sectionSource.includes(usageToken),
      `[qa:cart:items-section-view-model-extraction] missing usage token: ${usageToken}`
    );
  }
  checks.push("section_uses_core_view_model_helpers");

  assert.match(
    rowSource,
    /from "\.\/cartItemsSection\.view-model"/,
    "CartItemRow must import cartItemsSection.view-model."
  );
  assert.ok(
    rowSource.includes("buildStockLimitAlertMessage("),
    "CartItemRow must use buildStockLimitAlertMessage helper."
  );
  checks.push("row_uses_stock_alert_view_model_helper");

  assert.ok(
    !sectionSource.includes("products.find((p) => p.id === item.productId)"),
    "Resolved row derivation should be delegated to view-model helper."
  );
  assert.ok(
    !sectionSource.includes("hasCartItems && isResolvingProducts"),
    "Section state derivation should be delegated to view-model helper."
  );
  checks.push("section_has_no_inlined_resolved_row_or_state_derivation");

  for (const exportToken of [
    "export function buildResolvedCartItemRows(",
    "export function buildCartItemsSectionViewState(",
    "export function buildStockLimitAlertMessage(",
  ]) {
    assert.ok(
      viewModelSource.includes(exportToken),
      `[qa:cart:items-section-view-model-extraction] missing export token: ${exportToken}`
    );
  }
  checks.push("view_model_exports_core_helpers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
