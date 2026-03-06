import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const HOST_PATH = path.resolve(process.cwd(), "components/order/globalCartHost.tsx");
const VISIBILITY_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useGlobalCartVisibility.ts"
);
const CART_ITEMS_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useSyncedClientCartItems.ts"
);
const ADDRESS_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useRoadAddressState.ts"
);
const CONSTANTS_PATH = path.resolve(
  process.cwd(),
  "components/order/globalCartHost.constants.ts"
);

function run() {
  const checks: string[] = [];
  const hostSource = fs.readFileSync(HOST_PATH, "utf8");
  const visibilityHookSource = fs.readFileSync(VISIBILITY_HOOK_PATH, "utf8");
  const cartItemsHookSource = fs.readFileSync(CART_ITEMS_HOOK_PATH, "utf8");
  const addressHookSource = fs.readFileSync(ADDRESS_HOOK_PATH, "utf8");
  const constantsSource = fs.readFileSync(CONSTANTS_PATH, "utf8");

  for (const token of [
    'import { MISSING_ADDRESS_ERROR } from "@/components/order/globalCartHost.constants";',
    'import { useGlobalCartVisibility } from "@/components/order/hooks/useGlobalCartVisibility";',
    'import { useRoadAddressState } from "@/components/order/hooks/useRoadAddressState";',
    'import { useSyncedClientCartItems } from "@/components/order/hooks/useSyncedClientCartItems";',
    "const { cartItems, setCartItemsIfChanged } = useSyncedClientCartItems();",
    "const { roadAddress, setRoadAddress } = useRoadAddressState();",
    "const { isVisible, closeGlobalCart } = useGlobalCartVisibility({",
  ]) {
    assert.ok(
      hostSource.includes(token),
      `[qa:cart:global-cart-host-hooks-extraction] missing host token: ${token}`
    );
  }
  checks.push("host_uses_extracted_hooks_and_constants");

  for (const legacyToken of [
    "const [isVisible, setIsVisible] = useState(false);",
    "const [cartItems, setCartItems] = useState<CartLineItem[]>(",
    "const [roadAddress, setRoadAddressState] = useState(",
    "function readRoadAddress()",
    "function notifyGlobalCartVisibility(",
    "const GLOBAL_CART_OPEN_KEY = ",
    'window.addEventListener("openCart", handleOpen);',
  ]) {
    assert.ok(
      !hostSource.includes(legacyToken),
      `globalCartHost should not keep legacy inline implementation token: ${legacyToken}`
    );
  }
  checks.push("host_removed_legacy_inline_state_and_visibility_effects");

  assert.match(
    visibilityHookSource,
    /export function useGlobalCartVisibility/,
    "useGlobalCartVisibility hook should export properly."
  );
  for (const token of [
    "window.addEventListener(\"openCart\", handleOpen);",
    "sessionStorage.getItem(GLOBAL_CART_OPEN_KEY)",
    "document.documentElement.style.overflow = \"hidden\";",
    "notifyGlobalCartVisibility(true);",
    "notifyGlobalCartVisibility(false);",
  ]) {
    assert.ok(
      visibilityHookSource.includes(token),
      `[qa:cart:global-cart-host-hooks-extraction] missing visibility hook token: ${token}`
    );
  }
  checks.push("visibility_hook_owns_open_close_scroll_and_overflow_logic");

  assert.match(
    cartItemsHookSource,
    /export function useSyncedClientCartItems/,
    "useSyncedClientCartItems hook should export properly."
  );
  assert.ok(
    cartItemsHookSource.includes("buildClientCartSignature(") &&
      cartItemsHookSource.includes("window.addEventListener(\"cartUpdated\", syncCart);"),
    "useSyncedClientCartItems must own cart signature dedupe and cartUpdated sync."
  );
  checks.push("cart_items_hook_owns_signature_dedupe_and_sync_subscription");

  assert.match(
    addressHookSource,
    /export function useRoadAddressState/,
    "useRoadAddressState hook should export properly."
  );
  assert.ok(
    addressHookSource.includes("window.addEventListener(\"addressUpdated\", syncAddress);") &&
      addressHookSource.includes("window.addEventListener(\"addressCleared\", syncAddress);"),
    "useRoadAddressState must own road address sync listeners."
  );
  checks.push("address_hook_owns_local_storage_sync_listeners");

  assert.ok(
    constantsSource.includes("MISSING_ADDRESS_ERROR") &&
      constantsSource.includes("GLOBAL_CART_OPEN_KEY") &&
      constantsSource.includes("GLOBAL_CART_VISIBILITY_EVENT"),
    "globalCartHost constants file must centralize host constants."
  );
  checks.push("constants_file_centralizes_host_tokens");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
