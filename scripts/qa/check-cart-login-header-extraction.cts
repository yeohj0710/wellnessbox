import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_PATH = path.resolve(process.cwd(), "components/order/cart.tsx");
const LOGIN_HOOK_PATH = path.resolve(
  process.cwd(),
  "components/order/hooks/useCartLoginStatus.ts"
);
const HEADER_PATH = path.resolve(
  process.cwd(),
  "components/order/CartTopHeader.tsx"
);

function run() {
  const checks: string[] = [];
  const cartSource = fs.readFileSync(CART_PATH, "utf8");
  const loginHookSource = fs.readFileSync(LOGIN_HOOK_PATH, "utf8");
  const headerSource = fs.readFileSync(HEADER_PATH, "utf8");

  assert.match(
    cartSource,
    /import \{ useCartLoginStatus \} from "\.\/hooks\/useCartLoginStatus";/,
    "Cart must import useCartLoginStatus hook."
  );
  assert.match(
    cartSource,
    /import CartTopHeader from "\.\/CartTopHeader";/,
    "Cart must import CartTopHeader."
  );
  checks.push("cart_imports_login_hook_and_top_header");

  for (const token of [
    "const { loginStatus, safeLoginStatus } = useCartLoginStatus();",
    "<CartTopHeader onBack={onBack} />",
  ]) {
    assert.ok(
      cartSource.includes(token),
      `[qa:cart:login-header-extraction] missing cart usage token: ${token}`
    );
  }
  checks.push("cart_uses_extracted_login_hook_and_header");

  for (const legacyToken of [
    "void getLoginStatus(controller.signal)",
    "subscribeAuthSyncEvent(",
    "className=\"z-10 fixed top-14 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center px-4 mb-6 border-b border-gray-200\"",
  ]) {
    assert.ok(
      !cartSource.includes(legacyToken),
      `Cart should not keep legacy inline implementation token: ${legacyToken}`
    );
  }
  checks.push("cart_has_no_legacy_inline_login_sync_or_header_markup");

  assert.match(
    loginHookSource,
    /export function useCartLoginStatus\(\)/,
    "useCartLoginStatus hook should export properly."
  );
  assert.ok(
    loginHookSource.includes("getLoginStatus(") &&
      loginHookSource.includes("subscribeAuthSyncEvent("),
    "useCartLoginStatus must own login polling + auth sync subscription."
  );
  checks.push("login_hook_owns_login_sync_logic");

  assert.match(
    headerSource,
    /export default function CartTopHeader/,
    "CartTopHeader should export properly."
  );
  assert.ok(
    headerSource.includes("CART_COPY.backButtonLabel") &&
      headerSource.includes("CART_COPY.pageTitle"),
    "CartTopHeader must use centralized cart copy tokens."
  );
  checks.push("top_header_uses_cart_copy_tokens");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
