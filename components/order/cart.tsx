"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { getLoginStatus } from "@/lib/useLoginStatus";
import CheckoutConfirmModal from "./checkoutConfirmModal";
import AddressModal from "@/components/modal/addressModal";
import CartItemsSection from "./cartItemsSection";
import AddressSection from "./addressSection";
import PharmacyInfoSection from "./pharmacyInfoSection";
import PaymentSection from "./paymentSection";
import ProductDetail from "../product/productDetail";
import axios from "axios";
import { useCartHydration } from "./hooks/useCartHydration";
import { usePhoneAndPassword } from "./hooks/usePhoneAndPassword";
import { useAddressFields } from "./hooks/useAddressFields";
import PharmacyDetailModal from "./pharmacyDetailModal";

export default function Cart({
  cartItems,
  totalPrice,
  selectedPharmacy,
  allProducts,
  roadAddress,
  setRoadAddress,
  setSelectedPharmacy,
  containerRef,
  onBack,
  onUpdateCart,
}: any) {
  const router = useRouter();
  const [loginStatus, setLoginStatus] = useState<any>([]);
  const [showPharmacyDetail, setShowPharmacyDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("inicis");
  const [customTestAmount, setCustomTestAmount] = useState<number>(
    Number(process.env.NEXT_PUBLIC_TEST_PAYMENT_AMOUNT) || 1
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const cartScrollRef = useRef(0);

  const hydrated = useCartHydration(cartItems, onUpdateCart);
  const {
    phonePart1,
    phonePart2,
    phonePart3,
    setPhonePart1Persist,
    setPhonePart2Persist,
    setPhonePart3Persist,
    userContact,
    password,
    setPassword,
    otpCode,
    setOtpCode,
    otpSendLoading,
    otpVerifyLoading,
    otpStatusMessage,
    otpErrorMessage,
    isValidPhone,
    isPhoneVerified,
    handleSendOtp,
    handleVerifyOtp,
    sdkLoaded,
    setSdkLoaded,
  } = usePhoneAndPassword();
  const {
    detailAddress,
    setDetailAddress,
    requestNotes,
    setRequestNotes,
    entrancePassword,
    setEntrancePassword,
    directions,
    setDirections,
  } = useAddressFields();

  useEffect(() => {
    const onClose = () => onBack();
    window.addEventListener("closeCart", onClose);
    return () => window.removeEventListener("closeCart", onClose);
  }, [onBack]);

  useEffect(() => {
    if (Array.isArray(allProducts) && allProducts.length > 0) {
      localStorage.setItem("products", JSON.stringify(allProducts));
    }
  }, [allProducts]);

  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedPharmacyId", selectedPharmacy?.id);
  }, [selectedPharmacy]);

  useEffect(() => {
    if (detailProduct) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const handlePopState = () => {
      onBack();
    };
    if (isMobile) {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (isMobile) {
        window.removeEventListener("popstate", handlePopState);
      }
    };
  }, [onBack, detailProduct]);
  const deliveryFee = 3000;
  const totalPriceWithDelivery = totalPrice + deliveryFee;

  const handleAddressSave = async (newRoadAddress: string, detail: string) => {
    setRoadAddress(newRoadAddress);
    setDetailAddress(detail);
    localStorage.setItem("roadAddress", newRoadAddress);
    localStorage.setItem("detailAddress", detail);
    setIsAddressModalOpen(false);
    if (cartItems.length > 0) {
      try {
        const response = await axios.post("/api/get-sorted-pharmacies", {
          cartItem: cartItems[0],
          roadAddress: newRoadAddress,
        });
        const sorted = response.data.pharmacies.filter(
          (pharmacy: any) => pharmacy.registrationNumber !== null
        );
        if (sorted.length > 0) {
          setSelectedPharmacy(sorted[0]);
        }
      } catch (error) {
        console.error("약국 정보를 가져오는 데 실패했습니다:", error);
      }
    }
  };

  const handleProductClick = (product: any, optionType: string) => {
    if (containerRef.current) {
      cartScrollRef.current = containerRef.current.scrollTop;
    }
    setDetailProduct({ product, optionType });
  };

  const closeDetailProduct = () => {
    setDetailProduct(null);
    if (containerRef.current) {
      containerRef.current.scrollTop = cartScrollRef.current;
    }
  };

  const handleAddToCart = (cartItem: any) => {
    if (localStorage.getItem("restoreCartFromBackup") === "1") {
      localStorage.removeItem("restoreCartFromBackup");
    }

    const updatedItems = [...cartItems];
    const existingIndex = updatedItems.findIndex(
      (i: any) =>
        i.productId === cartItem.productId &&
        i.optionType === cartItem.optionType
    );
    if (existingIndex !== -1) {
      updatedItems[existingIndex].quantity += cartItem.quantity;
    } else {
      updatedItems.push(cartItem);
    }
    onUpdateCart(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleRequestPayment = () => {
    if (
      selectedPaymentMethod === "inicis" &&
      (!sdkLoaded || !(window as any).IMP)
    ) {
      alert(
        "결제 모듈을 불러오는 데 실패하였습니다. 페이지를 새로고침해 주세요."
      );
      return;
    }
    if (!phonePart1 || !phonePart2 || !phonePart3) {
      alert("전화번호를 입력해 주세요.");
      return;
    }
    if (!isValidPhone) {
      alert("전화번호를 올바른 형식으로 입력해 주세요.");
      return;
    }
    if (!isPhoneVerified) {
      alert("전화번호 인증을 완료해 주세요.");
      return;
    }
    if (!password) {
      alert("주문 조회 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 4) {
      alert("비밀번호는 최소한 4자리 이상으로 입력해 주세요.");
      return;
    }
    if (!selectedPaymentMethod) {
      alert("결제 수단을 선택해 주세요.");
      return;
    }
    setShowModal(true);
  };

  const handleBulkChange = (target: string) => {
    const unavailable: string[] = [];
    const updatedItems = cartItems.map((item: any) => {
      const product = allProducts.find((p: any) => p.id === item.productId);
      const newOption = product?.pharmacyProducts.find(
        (pp: any) =>
          pp.pharmacy.id === selectedPharmacy?.id &&
          pp.optionType?.includes(target) &&
          pp.stock >= item.quantity
      );
      if (!newOption) {
        if (product?.name) unavailable.push(product.name);
        return item;
      }
      return {
        ...item,
        optionType: newOption.optionType,
        price: newOption.price,
      };
    });
    onUpdateCart(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event("cartUpdated"));
    if (unavailable.length) {
      alert(
        `${unavailable.join(
          ", "
        )} 상품은 재고가 없어 제외하고 다른 상품들의 재고만 ${target}치로 바꾸었어요.`
      );
    }
  };
  const handleKGInicisPayment = () => {
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
      loginStatus.isTestLoggedIn && selectedPaymentMethod === "inicis"
        ? customTestAmount
        : totalPriceWithDelivery;
    IMP.request_pay(
      {
        pg: "html5_inicis",
        pay_method: "card",
        merchant_uid: paymentId,
        name: "웰니스박스 건강기능식품",
        amount: paymentAmount,
        buyer_email: "buyer@example.com",
        buyer_name: userContact,
        buyer_tel: userContact,
        buyer_addr: `${roadAddress} ${detailAddress}`,
        m_redirect_url: redirect,
      },
      function (rsp: any) {
        if (rsp.success) {
          // imp_uid는 결제 검증에 사용되므로 저장해둔다.
          localStorage.setItem("impUid", rsp.imp_uid);
          router.push(
            `/order-complete?paymentId=${paymentId}&imp_uid=${rsp.imp_uid}&method=inicis`
          );
        } else {
          localStorage.removeItem("paymentId");
          localStorage.removeItem("paymentMethod");
          localStorage.removeItem("impUid");
          router.push("/order-complete?cancelled=true");
        }
      }
    );
  };
  const handleKpnAndKakaoPayment = async (
    payMethod: string,
    channelKey: string
  ) => {
    const PortOne: any = await import("@portone/browser-sdk/v2");
    try {
      const paymentId = `payment${Date.now()}`;
      localStorage.setItem("paymentId", paymentId);
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        paymentId,
        orderName: "웰니스박스 건강기능식품",
        totalAmount: totalPriceWithDelivery,
        currency: "KRW",
        channelKey,
        payMethod,
        customer: {
          customerId: "user",
          fullName: "user",
          email: "user@example.com",
          phoneNumber: userContact,
        },
        redirectUrl: `${window.location.origin}/order-complete?paymentId=${paymentId}&method=${selectedPaymentMethod}`,
      });
      if (!response.code) {
        router.push(
          `/order-complete?paymentId=${paymentId}&method=${selectedPaymentMethod}`
        );
      } else {
        localStorage.removeItem("paymentId");
        localStorage.removeItem("paymentMethod");
        router.push("/order-complete?cancelled=true");
      }
    } catch (error) {
      console.error("결제 요청 중 오류 발생:", error);
      alert(`결제 요청 중 오류가 발생했습니다: ${JSON.stringify(error)}`);
    }
  };
  const handlePayment = async () => {
    localStorage.setItem("cartBackup", JSON.stringify(cartItems));
    localStorage.setItem("checkoutInProgress", "1");

    localStorage.setItem("paymentMethod", selectedPaymentMethod);
    if (selectedPaymentMethod === "inicis") {
      handleKGInicisPayment();
    } else if (selectedPaymentMethod === "kpn") {
      await handleKpnAndKakaoPayment(
        "CARD",
        process.env.NEXT_PUBLIC_PORTONE_CARD_CHANNEL_KEY!
      );
    } else if (selectedPaymentMethod === "kakao") {
      await handleKpnAndKakaoPayment(
        "EASY_PAY",
        process.env.NEXT_PUBLIC_PORTONE_KAKAO_CHANNEL_KEY!
      );
    }
  };
  return (
    <div className="w-full mt-32 mb-8 max-w-[640px] mx-auto bg-white min-h-[100vh]">
      <Script
        src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
        onLoad={() => {
          setSdkLoaded(true);
        }}
        strategy="afterInteractive"
      />
      <div className="z-10 fixed top-14 left-0 right-0 w-full max-w-[640px] mx-auto bg-sky-400 h-12 sm:h-14 flex items-center px-4 mb-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="text-white text-xl mr-4 font-bold hover:scale-110"
        >
          ←
        </button>
        <h1 className="sm:text-lg font-bold text-white">장바구니</h1>
      </div>
      <CartItemsSection
        cartItems={cartItems}
        allProducts={allProducts}
        selectedPharmacy={selectedPharmacy}
        onUpdateCart={onUpdateCart}
        onProductClick={handleProductClick}
        handleBulkChange={handleBulkChange}
        isLoading={!hydrated}
      />

      <AddressSection
        roadAddress={roadAddress}
        setIsAddressModalOpen={setIsAddressModalOpen}
        detailAddress={detailAddress}
        setDetailAddress={setDetailAddress}
        requestNotes={requestNotes}
        setRequestNotes={setRequestNotes}
        entrancePassword={entrancePassword}
        setEntrancePassword={setEntrancePassword}
        directions={directions}
        setDirections={setDirections}
        phonePart1={phonePart1}
        phonePart2={phonePart2}
        phonePart3={phonePart3}
        setPhonePart1={setPhonePart1Persist}
        setPhonePart2={setPhonePart2Persist}
        setPhonePart3={setPhonePart3Persist}
        password={password}
        setPassword={setPassword}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        otpSendLoading={otpSendLoading}
        otpVerifyLoading={otpVerifyLoading}
        isPhoneVerified={isPhoneVerified}
        otpStatusMessage={otpStatusMessage}
        otpErrorMessage={otpErrorMessage}
        canRequestOtp={isValidPhone}
      />

      <PharmacyInfoSection
        selectedPharmacy={selectedPharmacy}
        onShowDetail={() => setShowPharmacyDetail(true)}
      />

      {showPharmacyDetail && (
        <PharmacyDetailModal
          selectedPharmacy={selectedPharmacy}
          onClose={() => setShowPharmacyDetail(false)}
        />
      )}

      <PaymentSection
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        loginStatus={loginStatus}
        totalPrice={totalPrice}
        deliveryFee={deliveryFee}
        totalPriceWithDelivery={totalPriceWithDelivery}
        customTestAmount={customTestAmount}
        setCustomTestAmount={setCustomTestAmount}
        onRequestPayment={handleRequestPayment}
      />

      {isAddressModalOpen && (
        <AddressModal
          onClose={() => setIsAddressModalOpen(false)}
          onSave={handleAddressSave}
        />
      )}
      <CheckoutConfirmModal
        visible={showModal}
        roadAddress={roadAddress}
        detailAddress={detailAddress}
        userContact={userContact}
        onCancel={() => setShowModal(false)}
        onConfirm={() => {
          setShowModal(false);
          handlePayment();
        }}
      />
      {detailProduct && (
        <ProductDetail
          product={detailProduct.product}
          optionType={detailProduct.optionType}
          onClose={closeDetailProduct}
          onAddToCart={handleAddToCart}
          pharmacy={selectedPharmacy}
        />
      )}
    </div>
  );
}
