import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_ITEMS_SECTION_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.tsx"
);
const BULK_CONTROLS_PATH = path.resolve(
  process.cwd(),
  "components/order/CartBulkChangeControls.tsx"
);

function run() {
  const checks: string[] = [];
  const sectionSource = fs.readFileSync(CART_ITEMS_SECTION_PATH, "utf8");
  const controlsSource = fs.readFileSync(BULK_CONTROLS_PATH, "utf8");

  assert.match(
    sectionSource,
    /import CartBulkChangeControls from "\.\/CartBulkChangeControls";/,
    "CartItemsSection must import CartBulkChangeControls."
  );
  assert.ok(
    sectionSource.includes("<CartBulkChangeControls"),
    "CartItemsSection must render CartBulkChangeControls."
  );
  checks.push("section_uses_bulk_controls_component");

  for (const legacyToken of [
    "confirmType",
    "setConfirmType",
    "confirmModalDrag",
    "useDraggableModal",
  ]) {
    assert.ok(
      !sectionSource.includes(legacyToken),
      `CartItemsSection should not keep legacy bulk modal token: ${legacyToken}`
    );
  }
  checks.push("section_has_no_legacy_bulk_modal_state");

  assert.match(
    controlsSource,
    /import \{ useDraggableModal \} from "@\/components\/common\/useDraggableModal";/,
    "CartBulkChangeControls should own draggable modal logic."
  );
  assert.ok(
    controlsSource.includes("BULK_CHANGE_ACTIONS"),
    "CartBulkChangeControls should define BULK_CHANGE_ACTIONS."
  );
  assert.ok(
    controlsSource.includes("onBulkChange(confirmType)"),
    "CartBulkChangeControls should dispatch onBulkChange(confirmType)."
  );
  checks.push("bulk_controls_component_owns_modal_and_actions");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
