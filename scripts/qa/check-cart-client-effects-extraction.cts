import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_PATH = path.resolve(process.cwd(), "components/order/cart.tsx");
const PERSISTENCE_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useCartClientPersistence.ts"
);
const CLOSE_BEHAVIOR_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useCartOverlayCloseBehavior.ts"
);

function run() {
  const checks: string[] = [];
  const cartSource = fs.readFileSync(CART_PATH, "utf8");
  const persistenceHookSource = fs.readFileSync(PERSISTENCE_HOOK_PATH, "utf8");
  const closeBehaviorHookSource = fs.readFileSync(
    CLOSE_BEHAVIOR_HOOK_PATH,
    "utf8"
  );

  for (const token of [
    'import { useCartOverlayCloseBehavior } from "./hooks/useCartOverlayCloseBehavior";',
    'import { useCartClientPersistence } from "./hooks/useCartClientPersistence";',
    "useCartClientPersistence({",
    "useCartOverlayCloseBehavior({",
  ]) {
    assert.ok(
      cartSource.includes(token),
      `[qa:cart:client-effects-extraction] missing cart token: ${token}`
    );
  }
  checks.push("cart_imports_and_uses_client_effect_hooks");

  for (const legacyToken of [
    "window.addEventListener(\"closeCart\", onClose);",
    "const savedPassword = localStorage.getItem(\"password\");",
    "localStorage.setItem(\"password\", password);",
    "localStorage.setItem(\"products\", JSON.stringify(allProducts));",
    "localStorage.setItem(\"selectedPharmacyId\", String(selectedPharmacy.id));",
    "document.addEventListener(\"keydown\", handleKeyDown);",
    "window.addEventListener(\"popstate\", handlePopState);",
  ]) {
    assert.ok(
      !cartSource.includes(legacyToken),
      `Cart should not keep legacy inline side-effect token: ${legacyToken}`
    );
  }
  checks.push("cart_has_no_legacy_inline_side_effect_tokens");

  assert.match(
    persistenceHookSource,
    /export function useCartClientPersistence/,
    "useCartClientPersistence hook should export properly."
  );
  for (const token of [
    "const savedPassword = localStorage.getItem(\"password\");",
    "localStorage.setItem(\"password\", password);",
    "localStorage.setItem(\"products\", JSON.stringify(allProducts));",
    "localStorage.setItem(\"selectedPharmacyId\", String(selectedPharmacy.id));",
  ]) {
    assert.ok(
      persistenceHookSource.includes(token),
      `[qa:cart:client-effects-extraction] missing persistence hook token: ${token}`
    );
  }
  checks.push("persistence_hook_owns_password_sdk_and_storage_sync");

  assert.match(
    closeBehaviorHookSource,
    /export function useCartOverlayCloseBehavior/,
    "useCartOverlayCloseBehavior hook should export properly."
  );
  for (const token of [
    "window.addEventListener(\"closeCart\", onClose);",
    "document.addEventListener(\"keydown\", handleKeyDown);",
    "window.addEventListener(\"popstate\", handlePopState);",
  ]) {
    assert.ok(
      closeBehaviorHookSource.includes(token),
      `[qa:cart:client-effects-extraction] missing close behavior hook token: ${token}`
    );
  }
  checks.push("close_behavior_hook_owns_close_escape_and_popstate");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
