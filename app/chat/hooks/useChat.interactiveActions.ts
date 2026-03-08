import type { InChatAssessmentMode } from "./useChat.assessment";
import {
  buildNoopInteractiveActionResult,
  runExternalLinkInteractiveAction,
  runNavigationInteractiveAction,
  runPageFocusInteractiveAction,
} from "./useChat.interactiveActions.routes";
import type {
  InteractiveActionResult,
  RunSingleInteractiveActionParams,
} from "./useChat.interactiveActions.types";

export type {
  InteractiveActionResult,
  RunSingleInteractiveActionParams,
} from "./useChat.interactiveActions.types";

export async function runSingleInteractiveAction(
  params: RunSingleInteractiveActionParams
): Promise<InteractiveActionResult> {
  const {
    action,
    sessionMessages,
    executeCartCommandText,
    openCart,
    clearCart,
    openProfileSettings,
    resetInChatAssessment,
    startInChatAssessment,
    navigateTo,
    openExternalLink,
  } = params;

  if (action === "add_recommended_all" || action === "buy_recommended_all") {
    const result = await executeCartCommandText({
      commandText:
        action === "buy_recommended_all"
          ? "추천 상품 전체 바로 구매"
          : "추천 상품 전체 담아줘",
      sessionMessages,
    });
    return {
      executed: result.executed,
      message: result.executed
        ? result.hasAddress
          ? action === "buy_recommended_all"
            ? "추천 상품 전체로 바로 구매할 수 있게 열어둘게요."
            : "추천 상품 전체를 장바구니에 담아둘게요."
          : "주소 입력이 먼저 필요해서 주소 입력부터 열어둘게요."
        : "",
      summary: result.summary,
      hasAddress: result.hasAddress,
    };
  }

  if (action === "open_cart") {
    openCart();
    return { executed: true, message: "장바구니를 열어둘게요.", summary: "" };
  }

  if (action === "clear_cart") {
    clearCart();
    return { executed: true, message: "장바구니를 비워둘게요.", summary: "" };
  }

  if (action === "open_profile") {
    openProfileSettings();
    return { executed: true, message: "프로필 설정 창을 열어둘게요.", summary: "" };
  }

  const pageFocusResult = runPageFocusInteractiveAction({
    action,
    navigateTo,
  });
  if (pageFocusResult) {
    return pageFocusResult;
  }

  const externalLinkResult = runExternalLinkInteractiveAction({
    action,
    resetInChatAssessment,
    openExternalLink,
  });
  if (externalLinkResult) {
    return externalLinkResult;
  }

  if (action === "start_chat_quick_check" || action === "start_chat_assess") {
    const mode: InChatAssessmentMode =
      action === "start_chat_quick_check" ? "quick" : "deep";
    const initializedText = startInChatAssessment(mode);
    if (!initializedText) return buildNoopInteractiveActionResult();
    return { executed: true, message: initializedText, summary: "" };
  }

  const navigationResult = runNavigationInteractiveAction({
    action,
    resetInChatAssessment,
    navigateTo,
  });
  if (navigationResult) {
    return navigationResult;
  }

  return buildNoopInteractiveActionResult();
}
