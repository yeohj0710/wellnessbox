import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "app/(orders)/order-complete/page.tsx"
);
const BOOTSTRAP_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(orders)/order-complete/useOrderCompleteBootstrap.ts"
);
const NOTIFICATIONS_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/(orders)/order-complete/useOrderCompleteNotifications.ts"
);
const FLOW_PATH = path.resolve(
  process.cwd(),
  "app/(orders)/order-complete/orderCompleteFlow.ts"
);
const COPY_PATH = path.resolve(
  process.cwd(),
  "app/(orders)/order-complete/orderComplete.copy.ts"
);

function run() {
  const pageSource = fs.readFileSync(PAGE_PATH, "utf8");
  const bootstrapHookSource = fs.readFileSync(BOOTSTRAP_HOOK_PATH, "utf8");
  const notificationsHookSource = fs.readFileSync(
    NOTIFICATIONS_HOOK_PATH,
    "utf8"
  );
  const flowSource = fs.readFileSync(FLOW_PATH, "utf8");
  const copySource = fs.readFileSync(COPY_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    pageSource,
    /import \{ ORDER_COMPLETE_PAGE_COPY \} from "\.\/orderComplete\.copy";/,
    "order-complete page must import centralized page copy."
  );
  assert.match(
    pageSource,
    /import \{ useOrderCompleteBootstrap \} from "\.\/useOrderCompleteBootstrap";/,
    "order-complete page must import the bootstrap hook."
  );
  assert.match(
    pageSource,
    /import \{ useOrderCompleteNotifications \} from "\.\/useOrderCompleteNotifications";/,
    "order-complete page must import the notifications hook."
  );
  checks.push("page_imports_copy_and_extracted_hooks");

  for (const legacyToken of [
    "const createOrderFromPaymentOutcome = async",
    "const subscribePush = async",
    "const handleAllowNotification = async",
    "const handleUnsubscribe = async",
  ]) {
    assert.ok(
      !pageSource.includes(legacyToken),
      `order-complete page should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("page_no_longer_keeps_inline_checkout_and_notification_logic");

  for (const token of [
    "export function useOrderCompleteBootstrap(",
    "validatePreparedOrderDraft(draft)",
    "await createOrder({",
    "await getOrderByPaymentId(input.paymentId)",
    "openNotifyModal();",
    "clearOrderCompleteCartStorage();",
  ]) {
    assert.ok(
      bootstrapHookSource.includes(token),
      `[qa:order-complete:hooks] missing bootstrap-hook token: ${token}`
    );
  }
  checks.push("bootstrap_hook_owns_payment_verification_and_order_create_flow");

  for (const token of [
    "export function useOrderCompleteNotifications(",
    "ensureCustomerPushSubscription",
    'await fetch("/api/push/subscribe"',
    'await fetch("/api/push/send"',
    'await fetch("/api/push/unsubscribe"',
  ]) {
    assert.ok(
      notificationsHookSource.includes(token),
      `[qa:order-complete:hooks] missing notifications-hook token: ${token}`
    );
  }
  checks.push("notifications_hook_owns_push_subscription_actions");

  for (const token of [
    "export function isOrderCompleteCancelled(",
    "export function validatePreparedOrderDraft(",
    '"missing_order_items"',
  ]) {
    assert.ok(
      flowSource.includes(token),
      `[qa:order-complete:hooks] missing flow token: ${token}`
    );
  }
  checks.push("flow_module_owns_cancel_and_draft_validation_helpers");

  for (const token of [
    "ORDER_COMPLETE_ALERT_COPY",
    "ORDER_COMPLETE_PAGE_COPY",
    "missingPaymentInfo",
    "viewMyOrders",
  ]) {
    assert.ok(
      copySource.includes(token),
      `[qa:order-complete:hooks] missing copy token: ${token}`
    );
  }
  checks.push("copy_module_owns_alert_and_page_copy");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
