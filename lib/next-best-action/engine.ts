import {
  resolveMatchedCategoryIdsByLabels,
} from "@/lib/ai-capabilities/personalization";
import {
  buildUserCapabilitySignals,
  hasRecentConsultationSignal,
  hasRecentOrderSignal,
} from "@/lib/ai-capabilities/user-signals";
import type { UserContextSummary } from "@/lib/chat/context";

export type NextBestActionSurface = "my-data" | "explore" | "checkout";
export type NextBestActionIntensity = "soft" | "medium" | "strong";

export type NextBestActionCategory = {
  id: number;
  name: string;
};

export type CheckoutNextBestActionState = {
  isUserLoggedIn: boolean;
  hasRoadAddress: boolean;
  phoneStatusLoading: boolean;
  needsPhoneVerification: boolean;
  hasPassword: boolean;
  hasPaymentMethod: boolean;
};

export type NextBestAction = {
  id: string;
  surface: NextBestActionSurface;
  intensity: NextBestActionIntensity;
  title: string;
  description: string;
  helper: string;
  ctaLabel: string;
  href?: string;
  actionKey?:
    | "open_address"
    | "open_phone_verification"
    | "focus_order_password"
    | "submit_payment";
  reasonLines: string[];
  score: number;
};

type ResolveNextBestActionInput = {
  surface: NextBestActionSurface;
  summary: UserContextSummary;
  categories?: NextBestActionCategory[];
  checkoutState?: CheckoutNextBestActionState | null;
};

function buildExploreHref(categoryIds: number[]) {
  return categoryIds.length > 0
    ? `/explore?categories=${categoryIds.join(",")}#home-products`
    : "/explore#home-products";
}

function createAction(
  input: Omit<NextBestAction, "surface"> & { surface: NextBestActionSurface }
) {
  return input;
}

export function resolveNextBestAction(
  input: ResolveNextBestActionInput
): NextBestAction | null {
  const { summary, surface, categories, checkoutState } = input;
  const actions: NextBestAction[] = [];
  const signals = buildUserCapabilitySignals(summary);
  const hasAssess = signals.hasAssess;
  const hasQuick = signals.hasQuick;
  const hasOrders = signals.hasOrders;
  const hasHealthLink = signals.hasHealthLink;
  const hasRecommended = signals.hasRecommended;
  const hasMedicationContext = signals.hasMedicationContext;
  const hasConditionContext = signals.hasConditionContext;
  const hasCautionSignals = summary.notableResponses.some(
    (item) => item.signal === "주의"
  );
  const isRisky = signals.isSafetySensitive || hasCautionSignals;
  const hasRecentChat = hasRecentConsultationSignal(signals, 30);
  const matchedCategoryIds = resolveMatchedCategoryIdsByLabels(
    summary.recommendedNutrients,
    categories
  );
  const personalizedExploreHref = buildExploreHref(matchedCategoryIds);
  const dataAsset = summary.dataAsset;
  const repeatedThemes = dataAsset.repeatedThemes;
  const adoptedThemes = dataAsset.adoptedThemes;
  const opportunityThemes = dataAsset.opportunityThemes;
  const dataAssetCategoryIds = resolveMatchedCategoryIdsByLabels(
    opportunityThemes.length > 0 ? opportunityThemes : repeatedThemes,
    categories
  );
  const dataAssetExploreHref = buildExploreHref(dataAssetCategoryIds);

  if (surface === "checkout" && checkoutState) {
    if (!checkoutState.isUserLoggedIn) {
      actions.push(
        createAction({
          id: "checkout-login",
          surface,
          intensity: "strong",
          score: 100,
          title: "결제 전에 로그인부터 연결하면 다음 단계가 바로 풀려요",
          description:
            "지금 이 단계에서는 주문 저장과 주문 조회 연결을 위해 계정 로그인이 먼저 필요해요.",
          helper: "로그인을 마치면 주소·전화번호 인증 상태를 이어서 확인할 수 있어요.",
          ctaLabel: "아래 로그인으로 이어가기",
          reasonLines: [
            "주문 상태 확인과 재구매 흐름이 계정 기준으로 이어집니다.",
            "비로그인 상태에서는 결제 직전 이탈이 다시 발생하기 쉬워요.",
          ],
        })
      );
    } else if (!checkoutState.hasRoadAddress) {
      actions.push(
        createAction({
          id: "checkout-address",
          surface,
          intensity: "strong",
          score: 98,
          title: "결제 전에 배송지부터 끝내면 됩니다",
          description:
            "지금 주문에서 가장 먼저 막히는 단계는 배송지 입력이에요.",
          helper: "주소만 입력되면 나머지 확인 항목은 바로 이어서 마무리할 수 있어요.",
          ctaLabel: "주소 입력하기",
          actionKey: "open_address",
          reasonLines: [
            "현재 결제 흐름에서 주소 누락이 가장 큰 즉시 이탈 요인입니다.",
            hasRecommended
              ? `최근 결과 기준 추천 방향은 ${summary.recommendedNutrients
                  .slice(0, 2)
                  .join(", ")} 쪽이에요.`
              : "추천 흐름을 이어가려면 주문 기본 정보부터 먼저 안정화하는 편이 좋아요.",
          ],
        })
      );
    } else if (checkoutState.phoneStatusLoading) {
      actions.push(
        createAction({
          id: "checkout-phone-loading",
          surface,
          intensity: "soft",
          score: 97,
          title: "전화번호 상태를 확인하는 동안 다른 입력은 잠시만 기다려주세요",
          description:
            "지금은 인증 상태를 불러오는 중이라 결제 가능 여부가 곧 더 정확하게 정리돼요.",
          helper: "확인이 끝나면 바로 다음 행동만 남도록 안내가 갱신돼요.",
          ctaLabel: "확인 중",
          reasonLines: [
            "전화번호 인증 여부는 결제와 주문 조회 흐름에 직접 연결됩니다.",
            "확인 중에는 중복 입력보다 잠시 기다리는 편이 더 빠릅니다.",
          ],
        })
      );
    } else if (
      !checkoutState.phoneStatusLoading &&
      checkoutState.needsPhoneVerification
    ) {
      actions.push(
        createAction({
          id: "checkout-phone",
          surface,
          intensity: "strong",
          score: 97,
          title: "지금은 전화번호 인증을 끝내는 것이 가장 중요해요",
          description:
            "결제와 주문 조회를 안전하게 이어가려면 인증된 전화번호가 먼저 필요해요.",
          helper: "인증만 끝나면 결제 직전 확인 단계를 훨씬 짧게 마칠 수 있어요.",
          ctaLabel: "전화번호 인증하기",
          actionKey: "open_phone_verification",
          reasonLines: [
            "결제 완료 후 주문 상태를 다시 확인할 때 같은 번호를 사용합니다.",
            "인증 누락은 결제 직전 실패로 가장 자주 이어지는 항목입니다.",
          ],
        })
      );
    } else if (!checkoutState.hasPassword) {
      actions.push(
        createAction({
          id: "checkout-password",
          surface,
          intensity: "strong",
          score: 96,
          title: "주문 조회 비밀번호만 입력하면 결제 준비가 거의 끝나요",
          description:
            "지금은 주문 상태를 다시 확인할 비밀번호를 먼저 정해두는 단계예요.",
          helper: "4자리 이상 입력해두면 주문 완료 후 다시 찾기가 쉬워져요.",
          ctaLabel: "비밀번호 입력하기",
          actionKey: "focus_order_password",
          reasonLines: [
            "주문 완료 후 비로그인 조회 흐름까지 같이 대비할 수 있어요.",
            "짧은 마무리 단계라 지금 끝내는 편이 이탈을 줄입니다.",
          ],
        })
      );
    } else if (checkoutState.hasPaymentMethod) {
      actions.push(
        createAction({
          id: "checkout-submit",
          surface,
          intensity: isRisky && !hasRecentChat ? "medium" : "strong",
          score: isRisky && !hasRecentChat ? 82 : 94,
          title:
            isRisky && !hasRecentChat
              ? "결제는 가능하지만, 복용 맥락 점검이 한 번 더 붙으면 더 안전해요"
              : "지금은 결제를 마무리하는 흐름이 가장 자연스러워요",
          description:
            isRisky && !hasRecentChat
              ? "복용약이나 주의 신호가 보여서 약사 상담 가치가 있지만, 주문 자체는 이어갈 수 있어요."
              : "주문 기본 정보가 거의 갖춰져 있어서 지금 바로 결제를 이어가는 편이 가장 짧아요.",
          helper:
            isRisky && !hasRecentChat
              ? "급하지 않다면 결제 전 상담으로 조합만 짧게 확인해도 좋아요."
              : "입력 항목이 모두 준비돼 있어 결제 버튼으로 바로 이어가면 됩니다.",
          ctaLabel: "결제 이어가기",
          actionKey: "submit_payment",
          reasonLines: isRisky && !hasRecentChat
            ? [
                "건강링크/복약/주의 신호가 있어 조합 점검 가치가 큽니다.",
                "다만 현재 주문 진행 자체를 막아야 하는 단계는 아닙니다.",
              ]
            : [
                "주소, 인증, 비밀번호가 모두 채워져 즉시 완료 가능 상태입니다.",
                hasOrders
                  ? "최근 주문 흐름과 비슷한 패턴이라 마무리 장벽이 낮아요."
                  : "첫 주문은 지금 타이밍에 바로 끝내는 편이 전환에 가장 유리해요.",
              ],
        })
      );
    }
  }

  if (surface === "explore") {
    if (
      !hasOrders &&
      (dataAsset.stage === "compounding" || dataAsset.stage === "forming") &&
      (opportunityThemes.length > 0 || repeatedThemes.length > 0)
    ) {
      actions.push(
        createAction({
          id: "explore-data-asset",
          surface,
          intensity: "strong",
          score: 99,
          title: "지금은 많이 보기보다, 여러 기록이 같이 가리킨 축부터 좁혀보는 편이 좋아요",
          description:
            opportunityThemes.length > 0
              ? `${opportunityThemes.slice(0, 2).join(", ")} 축은 검사·상담에서 반복돼 지금 가장 근거가 두꺼운 방향이에요.`
              : `${repeatedThemes.slice(0, 2).join(", ")} 축은 최근 데이터가 같은 쪽으로 모이고 있어요.`,
          helper: dataAsset.recommendedActionHint,
          ctaLabel: "반복된 축만 먼저 보기",
          href: dataAssetExploreHref,
          reasonLines: [
            dataAsset.reasonLines[0] || "",
            dataAsset.reasonLines[1] || "",
          ].filter(Boolean),
        })
      );
    }

    if (isRisky && !hasRecentChat) {
      actions.push(
        createAction({
          id: "explore-chat-review",
          surface,
          intensity: "strong",
          score: 97,
          title: "지금은 상품 추가보다 약사 상담을 먼저 붙이는 편이 안전해요",
          description:
            "복용약, 주의 신호, 건강링크 위험도가 보여서 성분 조합을 한 번 더 점검하는 편이 좋아요.",
          helper: "상담에서는 현재 드시고 있는 약과 최근 검사 방향을 함께 반영해 볼 수 있어요.",
          ctaLabel: "상담으로 확인하기",
          href: "/chat?from=/explore",
          reasonLines: [
            summary.explainability.pharmacistReviewPoints[0] ||
              "복약/주의 신호가 있어 약사 검토 가치가 큽니다.",
            hasRecommended
              ? `현재 추천 방향은 ${summary.recommendedNutrients
                  .slice(0, 2)
                  .join(", ")} 쪽이지만, 조합 확인이 먼저예요.`
              : "제품 선택보다 현재 상황 확인이 먼저 필요한 신호가 있습니다.",
          ],
        })
      );
    }

    if (hasRecommended) {
      actions.push(
        createAction({
          id: "explore-personalized",
          surface,
          intensity: "strong",
          score: hasOrders ? 84 : 95,
          title: "지금은 맞춤 성분부터 바로 좁혀보는 흐름이 가장 빨라요",
          description: `최근 결과 기준으로 ${summary.recommendedNutrients
            .slice(0, 3)
            .join(", ")} 방향이 먼저 보여요.`,
          helper:
            matchedCategoryIds.length > 0
              ? "필터를 바로 적용해서 불필요한 탐색을 줄여드릴게요."
              : "맞춤 성분 중심으로 먼저 비교하면 첫 구매 판단이 쉬워져요.",
          ctaLabel: "맞춤 성분 먼저 보기",
          href: personalizedExploreHref,
          reasonLines: [
            hasAssess
              ? "정밀검사 결과가 있어 탐색 우선순위를 바로 줄일 수 있어요."
              : hasQuick
              ? "빠른검사 결과가 있어 무작정 둘러보는 것보다 효율적이에요."
              : "이미 확보된 힌트를 먼저 상품 탐색으로 연결하는 단계예요.",
            hasOrders
              ? "최근 주문 이력이 있어 기존 흐름과 겹치지 않는지 비교하기도 쉬워요."
              : "첫 구매 전에는 선택지를 줄여주는 것이 가장 큰 전환 레버입니다.",
          ],
        })
      );
    }

    if (!hasAssess && !hasQuick) {
      actions.push(
        createAction({
          id: "explore-quick-check",
          surface,
          intensity: "strong",
          score: 92,
          title: "먼저 빠른검사로 기준점을 만들면 탐색 시간이 크게 줄어요",
          description:
            "지금은 제품을 고르기 전에 최소한의 개인화 기준을 먼저 잡는 편이 효율적이에요.",
          helper: "몇 문항만 답해도 바로 탐색 필터에 연결할 수 있어요.",
          ctaLabel: "빠른검사 시작하기",
          href: "/check-ai",
          reasonLines: [
            "결과 기준이 없으면 첫 구매에서 비교 피로가 커집니다.",
            "빠른검사는 탐색 진입 장벽이 가장 낮은 개인화 시작점입니다.",
          ],
        })
      );
    } else if (hasQuick && !hasAssess) {
      actions.push(
        createAction({
          id: "explore-assess",
          surface,
          intensity: "medium",
          score: 82,
          title: "빠른검사 다음에는 정밀검사로 우선순위를 더 또렷하게 잡을 수 있어요",
          description:
            "이미 방향은 잡혀 있으니, 이제는 더 깊은 질문으로 맞춤 우선순위를 좁히는 단계예요.",
          helper: "정밀검사를 마치면 성분 설명과 상담 품질이 더 좋아져요.",
          ctaLabel: "정밀검사 이어가기",
          href: "/assess",
          reasonLines: [
            "빠른검사는 방향 확인, 정밀검사는 선택 압축에 더 강합니다.",
            "여러 카테고리가 동시에 고민될 때 특히 효과가 큽니다.",
          ],
        })
      );
    }
  }

  if (surface === "my-data") {
    if (
      hasOrders &&
      dataAsset.stage === "follow_through" &&
      adoptedThemes.length > 0
    ) {
      actions.push(
        createAction({
          id: "my-data-data-asset",
          surface,
          intensity: "strong",
          score: 95,
          title: "이미 결과와 주문이 이어진 축이 있어, 새 추천보다 지금은 조정 판단이 더 가치 있어요",
          description: `${adoptedThemes.slice(0, 2).join(", ")} 쪽은 행동까지 이어진 기록이 있어 다음 재구매와 리필 판단에 더 직접적으로 쓸 수 있어요.`,
          helper: dataAsset.recommendedActionHint,
          ctaLabel: "지금 구성 점검하기",
          href: "/chat?from=/my-data",
          reasonLines: [
            dataAsset.reasonLines[0] || "",
            dataAsset.reasonLines[1] || "",
          ].filter(Boolean),
        })
      );
    }

    if (isRisky && !hasRecentChat) {
      actions.push(
        createAction({
          id: "my-data-chat-review",
          surface,
          intensity: "strong",
          score: 96,
          title: "지금 데이터라면 다음 행동은 약사 상담으로 맥락을 묶는 쪽이에요",
          description:
            "검사, 복약, 건강링크 신호가 함께 보여서 단일 결과보다 조합 확인 가치가 커요.",
          helper: "상담에서는 최근 결과와 복용 이력을 함께 반영해 왜 그런지 설명받을 수 있어요.",
          ctaLabel: "상담 이어가기",
          href: "/chat?from=/my-data",
          reasonLines: [
            summary.explainability.pharmacistReviewPoints[0] ||
              "복약/주의 신호가 있어 약사 검토 가치가 큽니다.",
            summary.explainability.fitReasons[0] ||
              "여러 데이터 출처가 함께 있어 단일 검사보다 입체적으로 볼 수 있습니다.",
          ],
        })
      );
    }

    if (!hasHealthLink && summary.actorContext?.loggedIn) {
      actions.push(
        createAction({
          id: "my-data-health-link",
          surface,
          intensity: "medium",
          score: 92,
          title: "건강링크를 연결하면 다음 추천과 상담이 한 단계 더 정확해져요",
          description:
            "지금은 검사와 주문 정보 중심으로 보고 있어요. 건강링크가 붙으면 복약 이력과 주의 신호까지 함께 볼 수 있어요.",
          helper: "특히 복용약이나 질환 맥락이 있으면 약사 검토 품질이 더 좋아져요.",
          ctaLabel: "건강링크 연결하기",
          href: "/health-link",
          reasonLines: [
            hasMedicationContext || hasConditionContext
              ? "복용약·질환 맥락이 있어 건강 데이터 결합 효과가 더 큽니다."
              : "실사용 맥락을 붙일수록 개인화 설명과 추천 신뢰도가 올라갑니다.",
            "마이데이터는 연결 여부를 점검하고 다음 품질 레버를 올리기 가장 좋은 지점입니다.",
          ],
        })
      );
    }

    if (hasRecommended && !hasOrders) {
      actions.push(
        createAction({
          id: "my-data-explore",
          surface,
          intensity: "medium",
          score: 90,
          title: "지금은 결과를 상품 탐색으로 연결하는 단계가 가장 자연스러워요",
          description: `최근 데이터 기준으로 ${summary.recommendedNutrients
            .slice(0, 3)
            .join(", ")} 방향이 먼저 보여요.`,
          helper: "추천 성분을 바로 탐색으로 넘기면 첫 구매 결정을 훨씬 짧게 만들 수 있어요.",
          ctaLabel: "추천 상품 보러 가기",
          href: "/explore#home-products",
          reasonLines: [
            hasAssess || hasQuick
              ? "이미 검사 결과가 있어 탐색을 무작정 시작할 이유가 줄어듭니다."
              : "지금 확보된 힌트를 바로 구매 흐름으로 연결하는 단계예요.",
            "아직 최근 주문이 없어 첫 구매 전환 여지가 큽니다.",
          ],
        })
      );
    }

    if (!hasAssess && !hasQuick) {
      actions.push(
        createAction({
          id: "my-data-start-check",
          surface,
          intensity: "medium",
          score: 88,
          title: "다음 행동은 검사부터 시작해 개인화 기준을 만드는 쪽이에요",
          description:
            "아직 결과 데이터가 없어 추천과 상담이 보수적으로만 움직일 수 있어요.",
          helper: "먼저 빠른검사로 기준을 만들고, 필요하면 정밀검사로 이어가면 돼요.",
          ctaLabel: "빠른검사 시작하기",
          href: "/check-ai",
          reasonLines: [
            "마이데이터에 검사 결과가 붙기 시작하면 이후 재진입 흐름이 훨씬 강해집니다.",
            "검사 완료는 추천·상담·탐색의 공통 품질 레버입니다.",
          ],
        })
      );
    }

    if (signals.latestResultAgeDays > 90 && hasRecentOrderSignal(signals, 120)) {
      actions.push(
        createAction({
          id: "my-data-refresh",
          surface,
          intensity: "soft",
          score: 76,
          title: "최근 주문 이후 시간이 꽤 지나서 검사를 한 번 새로 보는 편이 좋아요",
          description:
            "기존 결과가 오래되면 현재 상태와 추천 방향이 달라졌을 수 있어요.",
          helper: "빠른검사로 가볍게 다시 점검한 뒤 필요하면 정밀검사로 이어갈 수 있어요.",
          ctaLabel: "다시 점검하기",
          href: "/check-ai",
          reasonLines: [
            "생활 패턴과 복용 반응은 시간이 지나면 달라질 수 있습니다.",
            "재구매 전 점검은 불필요한 반복 구매를 줄이는 데 도움이 됩니다.",
          ],
        })
      );
    }
  }

  if (actions.length === 0) return null;
  return actions.sort((left, right) => right.score - left.score)[0];
}
