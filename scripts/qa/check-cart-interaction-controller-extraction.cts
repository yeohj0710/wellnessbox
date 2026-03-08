import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_PATH = path.resolve(process.cwd(), "components/order/cart.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useCartInteractionController.ts"
);
const ACTIONS_PATH = path.resolve(
  process.cwd(),
  "components/order/cartItemsSection.actions.ts"
);

function run() {
  const checks: string[] = [];
  const cartSource = fs.readFileSync(CART_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");
  const actionsSource = fs.readFileSync(ACTIONS_PATH, "utf8");

  assert.match(
    cartSource,
    /import \{ useCartInteractionController \} from "\.\/hooks\/useCartInteractionController";/,
    "Cart must import useCartInteractionController."
  );
  for (const token of [
    "} = useCartInteractionController({",
    "onOpenConfirmModal: openCheckoutConfirm,",
    "onOpenPhoneModal={openPhoneModal}",
    "onLinked={handlePhoneLinked}",
    "onUnlink={handleUnlinkPhone}",
  ]) {
    assert.ok(
      cartSource.includes(token),
      `[qa:cart:interaction-controller-extraction] missing cart token: ${token}`
    );
  }
  checks.push("cart_imports_and_uses_interaction_controller");

  for (const legacyToken of [
    "const persistCartItems = useCallback(",
    "const handleAddressSave = async (",
    "const handleProductClick = (",
    "const closeDetailProduct = () => {",
    "const handleAddToCart = (",
    "const handleUnlinkPhone = useCallback(",
    "const handleBulkChange = (",
    "writeClientCartItems",
    'window.dispatchEvent(new Event("cartUpdated"))',
    'axios.post("/api/get-sorted-pharmacies"',
  ]) {
    assert.ok(
      !cartSource.includes(legacyToken),
      `Cart should not keep legacy interaction token: ${legacyToken}`
    );
  }
  checks.push("cart_has_no_legacy_inline_interaction_handlers");

  assert.match(
    hookSource,
    /export function useCartInteractionController/,
    "useCartInteractionController should export properly."
  );
  for (const token of [
    "updateCartAndPersist(",
    'axios.post("/api/get-sorted-pharmacies"',
    "mergeClientCartItems(",
    "buildBulkChangedCartItems(",
    "setPhoneModalOpen(true);",
    "setShowCheckoutConfirm(true);",
    "setDetailProduct({ product, optionType });",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `[qa:cart:interaction-controller-extraction] missing hook token: ${token}`
    );
  }
  checks.push("interaction_controller_owns_modal_and_cart_handlers");

  assert.match(
    actionsSource,
    /export function updateCartAndPersist/,
    "cartItemsSection.actions.ts should export updateCartAndPersist."
  );
  checks.push("cart_actions_surface_exports_persist_helper");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
