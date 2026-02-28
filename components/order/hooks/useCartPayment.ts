import { useCallback } from "react";
import type { LoginStatus } from "@/lib/useLoginStatus";
import type { CartLineItem } from "../cart.types";

type RouterLike = {
  push: (href: string) => void;
};

type UseCartPaymentParams = {
  router: RouterLike;
  selectedPaymentMethod: string;
  customTestAmount: number;
  totalPriceWithDelivery: number;
  safeLoginStatus: LoginStatus;
  sdkLoaded: boolean;
  phoneStatusLoading: boolean;
  phone: string;
  isPhoneLinked: boolean;
  password: string;
  userContact: string;
  roadAddress: string;
  detailAddress: string;
  cartItems: CartLineItem[];
  onOpenPhoneModal: () => void;
  onOpenConfirmModal: () => void;
};

export function useCartPayment(params: UseCartPaymentParams) {
  const handleKGInicisPayment = useCallback(() => {
    const IMP = (window as any).IMP;
    if (!IMP) {
      alert("결제 모듈을 불러오는 데 실패하였습니다.");
      return;
    }
    const paymentId = `payment${Date.now()}`;
    localStorage.setItem("paymentId", paymentId);
    const redirect = `${window.location.origin}/order-complete?method=inicis`;
    IMP.init(process.env.NEXT_PUBLIC_MERCHANT_ID);
    const paymentAmount =
      params.safeLoginStatus.isTestLoggedIn &&
      params.selectedPaymentMethod === "inicis"
        ? params.customTestAmount
        : params.totalPriceWithDelivery;
    IMP.request_pay(
      {
        pg: "html5_inicis",
        pay_method: "card",
        merchant_uid: paymentId,
        name: "웰니스박스 건강기능식품",
        amount: paymentAmount,
        buyer_email: "buyer@example.com",
        buyer_name: params.userContact,
        buyer_tel: params.userContact,
        buyer_addr: `${params.roadAddress} ${params.detailAddress}`,
        m_redirect_url: redirect,
      },
      function (rsp: any) {
        if (rsp.success) {
          localStorage.setItem("impUid", rsp.imp_uid);
          params.router.push(
            `/order-complete?paymentId=${paymentId}&imp_uid=${rsp.imp_uid}&method=inicis`
          );
        } else {
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
          params.router.push("/order-complete?cancelled=true");
        }
      }
    );
  }, [params]);

  const handleKpnAndKakaoPayment = useCallback(
    async (payMethod: string, channelKey: string) => {
      const PortOne: any = await import("@portone/browser-sdk/v2");
      try {
        const paymentId = `payment${Date.now()}`;
        localStorage.setItem("paymentId", paymentId);
        const response = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          paymentId,
          orderName: "웰니스박스 건강기능식품",
          totalAmount: params.totalPriceWithDelivery,
          currency: "KRW",
          channelKey,
          payMethod,
          customer: {
            customerId: "user",
            fullName: "user",
            email: "user@example.com",
            phoneNumber: params.userContact,
          },
          redirectUrl: `${window.location.origin}/order-complete?paymentId=${paymentId}&method=${params.selectedPaymentMethod}`,
        });
        if (!response.code) {
          params.router.push(
            `/order-complete?paymentId=${paymentId}&method=${params.selectedPaymentMethod}`
          );
        } else {
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          params.router.push("/order-complete?cancelled=true");
        }
      } catch (error) {
        console.error("결제 요청 중 오류 발생:", error);
        alert(`결제 요청 중 오류가 발생했습니다: ${JSON.stringify(error)}`);
      }
    },
    [params]
  );

  const handleRequestPayment = useCallback(() => {
    if (
      params.selectedPaymentMethod === "inicis" &&
      (!params.sdkLoaded || !(window as any).IMP)
    ) {
      alert(
        "결제 모듈을 불러오는 데 실패하였습니다. 페이지를 새로고침해 주세요."
      );
      return;
    }
    if (!params.safeLoginStatus.isUserLoggedIn) {
      alert("카카오 로그인이 필요해요. 로그인 후 다시 시도해 주세요.");
      return;
    }
    if (params.phoneStatusLoading) {
      alert("전화번호 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (!params.phone) {
      alert("전화번호 인증을 진행해 주세요.");
      params.onOpenPhoneModal();
      return;
    }
    if (!params.isPhoneLinked) {
      alert("전화번호 인증을 완료해 주세요.");
      params.onOpenPhoneModal();
      return;
    }
    if (!params.password) {
      alert("주문 조회 비밀번호를 입력해 주세요.");
      return;
    }
    if (params.password.length < 4) {
      alert("비밀번호는 최소한 4자리 이상으로 입력해 주세요.");
      return;
    }
    if (!params.selectedPaymentMethod) {
      alert("결제 수단을 선택해 주세요.");
      return;
    }
    params.onOpenConfirmModal();
  }, [params]);

  const handlePayment = useCallback(async () => {
    localStorage.setItem("cartBackup", JSON.stringify(params.cartItems));
    localStorage.setItem("checkoutInProgress", "1");
    localStorage.setItem("paymentMethod", params.selectedPaymentMethod);

    if (params.selectedPaymentMethod === "inicis") {
      handleKGInicisPayment();
    } else if (params.selectedPaymentMethod === "kpn") {
      await handleKpnAndKakaoPayment(
        "CARD",
        process.env.NEXT_PUBLIC_PORTONE_CARD_CHANNEL_KEY!
      );
    } else if (params.selectedPaymentMethod === "kakao") {
      await handleKpnAndKakaoPayment(
        "EASY_PAY",
        process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY!
      );
    }
  }, [
    handleKGInicisPayment,
    handleKpnAndKakaoPayment,
    params.cartItems,
    params.selectedPaymentMethod,
  ]);

  return {
    handleRequestPayment,
    handlePayment,
  };
}
