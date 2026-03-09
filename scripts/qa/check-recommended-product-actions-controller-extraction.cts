import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/RecommendedProductActions.tsx"
);
const CONTROLLER_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/useRecommendedProductActionsController.ts"
);
const SUPPORT_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/recommendedProductActions.controller-support.ts"
);
const LIST_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/RecommendedProductActionList.tsx"
);
const GUIDE_MODAL_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/RecommendedProductAddressGuideModal.tsx"
);
const CONFIRM_MODAL_PATH = path.resolve(
  process.cwd(),
  "app/chat/components/RecommendedProductConfirmDialog.tsx"
);

function run() {
  const rootSource = fs.readFileSync(ROOT_PATH, "utf8");
  const controllerSource = fs.readFileSync(CONTROLLER_PATH, "utf8");
  const supportSource = fs.readFileSync(SUPPORT_PATH, "utf8");
  const listSource = fs.readFileSync(LIST_PATH, "utf8");
  const guideModalSource = fs.readFileSync(GUIDE_MODAL_PATH, "utf8");
  const confirmModalSource = fs.readFileSync(CONFIRM_MODAL_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    rootSource,
    /import \{ useRecommendedProductActionsController \} from "\.\/useRecommendedProductActionsController";/,
    "RecommendedProductActions must import the controller hook."
  );
  for (const token of [
    "RecommendedProductActionList",
    "RecommendedProductAddressGuideModal",
    "RecommendedProductConfirmDialog",
    "} = useRecommendedProductActionsController({ content });",
    "if (!shouldRender) return null;",
  ]) {
    assert.ok(
      rootSource.includes(token),
      `[qa:chat:recommended-product-actions] missing root token: ${token}`
    );
  }
  checks.push("root_uses_controller_and_leaf_components");

  for (const legacyToken of [
    "const [items, setItems] = useState<ActionableRecommendation[]>([]);",
    "useDraggableModal(",
    "runCartActionWithAddressGuard(",
    "applyPendingCartActionAfterAddressSave(",
    "localStorage.setItem(",
    "resolveRecommendations(parsed)",
  ]) {
    assert.ok(
      !rootSource.includes(legacyToken),
      `RecommendedProductActions should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("root_no_longer_keeps_inline_state_effects_and_flows");

  assert.match(
    controllerSource,
    /export function useRecommendedProductActionsController/,
    "Controller hook must export properly."
  );
  for (const token of [
    "parseRecommendationLines(content || \"\")",
    "resolveRecommendations(parsed)",
    "useDraggableModal(showAddressGuideModal, {",
    "runCartActionWithAddressGuard({",
    "applyPendingCartActionAfterAddressSave({",
    "persistRecommendedProductAddress(roadAddress, detailAddress);",
    "buildSingleRecommendationConfirmDialog(item)",
    "buildBulkRecommendationConfirmDialog(items)",
    "resolvePendingCartActionFeedback(pending)",
  ]) {
    assert.ok(
      controllerSource.includes(token),
      `[qa:chat:recommended-product-actions] missing controller token: ${token}`
    );
  }
  checks.push("controller_owns_state_effects_and_cart_flow");

  for (const token of [
    "export type RecommendedProductActionConfirmDialog = {",
    "export function buildSingleRecommendationConfirmDialog(",
    "export function buildBulkRecommendationConfirmDialog(",
    "export function persistRecommendedProductAddress(",
    "export function resolvePendingCartActionFeedback(",
  ]) {
    assert.ok(
      supportSource.includes(token),
      `[qa:chat:recommended-product-actions] missing support token: ${token}`
    );
  }
  checks.push("support_module_owns_confirm_copy_and_address_feedback_rules");

  for (const token of [
    "추천 상품 빠른 실행",
    "전체 바로 구매",
    "확인 후 담기",
    "toKrw(item.sevenDayPrice)",
  ]) {
    assert.ok(
      listSource.includes(token),
      `[qa:chat:recommended-product-actions] missing list token: ${token}`
    );
  }
  checks.push("list_component_owns_preview_and_item_rows");

  assert.ok(
    guideModalSource.includes("주소를 입력해 주세요"),
    "Address guide modal should own the address guidance copy."
  );
  assert.ok(
    confirmModalSource.includes("취소"),
    "Confirm dialog should own the confirm/cancel modal UI."
  );
  checks.push("modal_components_exist");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
