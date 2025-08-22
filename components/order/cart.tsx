"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [detailAddress, setDetailAddress] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [entrancePassword, setEntrancePassword] = useState("");
  const [directions, setDirections] = useState("");
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");

  const persistPhone = useCallback((p1: string, p2: string, p3: string) => {
    localStorage.setItem("phonePart1", p1);
    localStorage.setItem("phonePart2", p2);
    localStorage.setItem("phonePart3", p3);
    localStorage.setItem("phoneParts", JSON.stringify({ p1, p2, p3 }));
  }, []);

  const setPhonePart1Persist = useCallback(
    (v: string) => {
      setPhonePart1(v);
      persistPhone(v, phonePart2, phonePart3);
    },
    [persistPhone, phonePart2, phonePart3]
  );

  const setPhonePart2Persist = useCallback(
    (v: string) => {
      setPhonePart2(v);
      persistPhone(phonePart1, v, phonePart3);
    },
    [persistPhone, phonePart1, phonePart3]
  );

  const setPhonePart3Persist = useCallback(
    (v: string) => {
      setPhonePart3(v);
      persistPhone(phonePart1, phonePart2, v);
    },
    [persistPhone, phonePart1, phonePart2]
  );

  const [userContact, setUserContact] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("inicis");
  const [customTestAmount, setCustomTestAmount] = useState<number>(
    Number(process.env.NEXT_PUBLIC_TEST_PAYMENT_AMOUNT) || 1
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const cartScrollRef = useRef(0);
  const phoneHydrated = useRef(false);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const needRestore = localStorage.getItem("restoreCartFromBackup") === "1";
    const backup = localStorage.getItem("cartBackup");

    if (needRestore && backup && backup !== "[]") {
      try {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdateCart(parsed);
          localStorage.setItem("cartItems", backup);
          window.dispatchEvent(new Event("cartUpdated"));
          localStorage.removeItem("restoreCartFromBackup");
          localStorage.removeItem("checkoutInProgress");
          setHydrated(true);
          return;
        }
      } catch {}
    }

    try {
      const saved = localStorage.getItem("cartItems");
      if (saved && saved !== "[]") {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdateCart(parsed);
        }
      }
    } catch {}

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    if (restoring && cartItems.length === 0) return;
    if (cartItems.length === 0) return;

    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    window.dispatchEvent(new Event("cartUpdated"));
  }, [hydrated, cartItems]);

  useEffect(() => {
    if (!hydrated) return;

    const restoring = localStorage.getItem("restoreCartFromBackup") === "1";
    if (!restoring) return;
    if (cartItems.length > 0) return;

    const backup = localStorage.getItem("cartBackup");
    if (!backup || backup === "[]") return;

    try {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onUpdateCart(parsed);
        localStorage.setItem("cartItems", backup);
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch {}
  }, [hydrated, cartItems.length, onUpdateCart]);

  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(allProducts));
  }, [allProducts]);

  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(allProducts));
  }, [allProducts]);
  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchgedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchgedLoginStatus);
    };
    fetchLoginStatus();
  }, []);
  useEffect(() => {
    const storedDetailAddress = localStorage.getItem("detailAddress");
    const storedRequestNotes = localStorage.getItem("requestNotes");
    const storedEntrancePassword = localStorage.getItem("entrancePassword");
    const storedDirections = localStorage.getItem("directions");
    const savedParts = localStorage.getItem("phoneParts");
    const storedPhonePart1 = localStorage.getItem("phonePart1");
    const storedPhonePart2 = localStorage.getItem("phonePart2");
    const storedPhonePart3 = localStorage.getItem("phonePart3");
    const savedPassword = localStorage.getItem("password");
    if (storedDetailAddress) setDetailAddress(storedDetailAddress);
    if (storedRequestNotes) setRequestNotes(storedRequestNotes);
    if (storedEntrancePassword) setEntrancePassword(storedEntrancePassword);
    if (storedDirections) setDirections(storedDirections);
    if (savedParts) {
      try {
        const { p1, p2, p3 } = JSON.parse(savedParts);
        if (p1 !== undefined) setPhonePart1(p1 || "");
        if (p2 !== undefined) setPhonePart2(p2 || "");
        if (p3 !== undefined) setPhonePart3(p3 || "");
      } catch {}
    } else {
      if (storedPhonePart1) setPhonePart1(storedPhonePart1);
      if (storedPhonePart2) setPhonePart2(storedPhonePart2);
      if (storedPhonePart3) setPhonePart3(storedPhonePart3);
    }
    if (savedPassword) setPassword(savedPassword);
    if ((window as any).IMP) {
      setSdkLoaded(true);
    }
    phoneHydrated.current = true;
  }, []);

  useEffect(() => {
    localStorage.setItem("detailAddress", detailAddress);
  }, [detailAddress]);
  useEffect(() => {
    localStorage.setItem("requestNotes", requestNotes);
  }, [requestNotes]);
  useEffect(() => {
    localStorage.setItem("entrancePassword", entrancePassword);
  }, [entrancePassword]);
  useEffect(() => {
    localStorage.setItem("directions", directions);
  }, [directions]);
  useEffect(() => {
    setUserContact(`${phonePart1}-${phonePart2}-${phonePart3}`);
  }, [phonePart1, phonePart2, phonePart3]);
  useEffect(() => {
    if (!phoneHydrated.current) return;
    const has = [phonePart1, phonePart2, phonePart3].some(Boolean);
    if (!has) return;
  }, [phonePart1, phonePart2, phonePart3]);
  useEffect(() => {
    localStorage.setItem("password", password);
  }, [password]);
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
    const isValidPhone = /^[0-9]{3}-[0-9]{4}-[0-9]{4}$/.test(userContact);
    if (!phonePart1 || !phonePart2 || !phonePart3) {
      alert("전화번호를 입력해 주세요.");
      return;
    }
    if (!isValidPhone) {
      alert("전화번호를 올바른 형식으로 입력해 주세요.");
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
      />

      <PharmacyInfoSection
        selectedPharmacy={selectedPharmacy}
        onShowDetail={() => setShowPharmacyDetail(true)}
      />

      {showPharmacyDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowPharmacyDetail(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl mx-3 max-h-[90vh] overflow-y-auto rounded-2xl transition-all duration-200 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-[1px] rounded-2xl bg-[conic-gradient(at_50%_50%,#6C4DFF_0deg,#3B5BFF_140deg,#56CCF2_260deg,#6C4DFF_360deg)] shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
              <div className="relative rounded-2xl bg-white">
                <button
                  className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition"
                  onClick={() => setShowPharmacyDetail(false)}
                  aria-label="닫기"
                >
                  ✕
                </button>
                <div className="px-4 pt-7 pb-4">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#4568F5] to-[#6C4DFF] text-white text-lg shadow-[0_6px_16px_rgba(67,103,230,0.28)]">
                    🏢
                  </div>
                  <h3 className="text-center text-lg sm:text-xl font-extrabold text-[#0F1222]">
                    사업자 정보
                  </h3>
                  <div className="mt-4 rounded-lg ring-1 ring-black/5 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {selectedPharmacy.representativeName && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                          <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                            대표자명
                          </div>
                          <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 leading-5">
                            {selectedPharmacy.representativeName}
                          </div>
                        </div>
                      )}
                      {selectedPharmacy.name && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                          <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                            상호명
                          </div>
                          <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 leading-5">
                            {selectedPharmacy.name}
                          </div>
                        </div>
                      )}
                      {selectedPharmacy.address && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                          <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                            사업자주소
                          </div>
                          <div className="sm:col-span-8 text-sm sm:text-base text-gray-800 whitespace-pre-line leading-5">
                            {selectedPharmacy.address}
                          </div>
                        </div>
                      )}
                      {selectedPharmacy.registrationNumber && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-5 py-2">
                          <div className="sm:col-span-4 text-[13px] sm:text-sm font-medium text-gray-600">
                            사업자등록번호
                          </div>
                          <div className="sm:col-span-8 text-sm sm:text-base font-semibold text-gray-800 tracking-wide tabular-nums leading-5">
                            {selectedPharmacy.registrationNumber}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-center">
                    <button
                      onClick={() => setShowPharmacyDetail(false)}
                      className="inline-flex h-10 items-center justify-center rounded-full px-5 text-white text-sm font-medium bg-gradient-to-r from-[#4568F5] to-[#6C4DFF] shadow-md hover:from-[#5A78FF] hover:to-[#7A5BFF] active:scale-[0.99] transition"
                    >
                      확인
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
