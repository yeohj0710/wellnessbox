import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CART_PATH = path.resolve(process.cwd(), "components/order/cart.tsx");
const COPY_PATH = path.resolve(process.cwd(), "components/order/cart.copy.ts");
const HEADER_PATH = path.resolve(
  process.cwd(),
  "components/order/CartTopHeader.tsx"
);

function run() {
  const checks: string[] = [];
  const cartSource = fs.readFileSync(CART_PATH, "utf8");
  const copySource = fs.readFileSync(COPY_PATH, "utf8");
  const headerSource = fs.readFileSync(HEADER_PATH, "utf8");

  assert.match(
    cartSource,
    /import \{ CART_COPY, buildUnavailableBulkChangeAlert \} from "\.\/cart\.copy";/,
    "Cart must import CART_COPY and buildUnavailableBulkChangeAlert from cart.copy."
  );
  checks.push("cart_imports_copy_module");

  for (const token of [
    "CART_COPY.fetchPharmacyErrorPrefix",
    "buildUnavailableBulkChangeAlert(unavailable, target)",
  ]) {
    assert.ok(
      cartSource.includes(token),
      `[qa:cart:copy-extraction] missing cart copy usage token: ${token}`
    );
  }
  for (const headerToken of [
    "CART_COPY.backButtonLabel",
    "CART_COPY.pageTitle",
  ]) {
    assert.ok(
      headerSource.includes(headerToken),
      `[qa:cart:copy-extraction] missing cart header copy usage token: ${headerToken}`
    );
  }
  checks.push("cart_and_header_use_copy_tokens");

  for (const copyToken of [
    "fetchPharmacyErrorPrefix",
    "backButtonLabel",
    "pageTitle",
  ]) {
    assert.ok(
      copySource.includes(copyToken),
      `[qa:cart:copy-extraction] missing copy token in cart.copy: ${copyToken}`
    );
  }
  checks.push("copy_contains_required_tokens");

  const mojibakeMarkers = ["?쎄뎅", "?λ컮援щ땲", "?곹뭹", "\uFFFD"];
  for (const marker of mojibakeMarkers) {
    assert.ok(
      !cartSource.includes(marker),
      `cart.tsx contains potential mojibake marker: ${marker}`
    );
    assert.ok(
      !headerSource.includes(marker),
      `CartTopHeader.tsx contains potential mojibake marker: ${marker}`
    );
    assert.ok(
      !copySource.includes(marker),
      `cart.copy.ts contains potential mojibake marker: ${marker}`
    );
  }
  checks.push("cart_and_copy_have_no_mojibake_markers");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
