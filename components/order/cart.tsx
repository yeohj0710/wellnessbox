"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { getLoginStatus, type LoginStatus } from "@/lib/useLoginStatus";
import CartItemsSection from "./cartItemsSection";
import AddressSection from "./addressSection";
import PharmacyInfoSection from "./pharmacyInfoSection";
import PaymentSection from "./paymentSection";
import axios from "axios";
import { useCartHydration } from "./hooks/useCartHydration";
import { useAddressFields } from "./hooks/useAddressFields";
import { useCartPayment } from "./hooks/useCartPayment";
import { usePhoneStatus } from "./hooks/usePhoneStatus";
import { buildBulkChangedCartItems, filterRegisteredPharmacies } from "./cart.helpers";
import type {
  CartDetailProduct,
  CartLineItem,
  CartProduct,
  CartProps,
} from "./cart.types";
import {
  mergeClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";

const CheckoutConfirmModal = dynamic(() => import("./checkoutConfirmModal"), {
  ssr: false,
});
const AddressModal = dynamic(() => import("@/components/modal/addressModal"), {
  ssr: false,
});
const ProductDetail = dynamic(() => import("../product/productDetail"), {
  ssr: false,
});
const PharmacyDetailModal = dynamic(() => import("./pharmacyDetailModal"), {
  ssr: false,
});
const PhoneVerifyModal = dynamic(() => import("@/app/me/phoneVerifyModal"), {
  ssr: false,
});

export default function Cart({
  cartItems,
  totalPrice,
  selectedPharmacy,
  allProducts,
  isPharmacyLoading,
  pharmacyError,
  onRetryPharmacyResolve,
  roadAddress,
  setRoadAddress,
  setSelectedPharmacy,
  containerRef,
  onBack,
  onUpdateCart,
}: CartProps) {
  const router = useRouter();
  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);
  const [showPharmacyDetail, setShowPharmacyDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("inicis");
  const [customTestAmount, setCustomTestAmount] = useState<number>(
    Number(process.env.NEXT_PUBLIC_TEST_PAYMENT_AMOUNT) || 1
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<CartDetailProduct | null>(
    null
  );
  const cartScrollRef = useRef(0);

  const hydrated = useCartHydration(cartItems, onUpdateCart);
  const [password, setPassword] = useState("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
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
  const {
    phone,
    setPhone,
    linkedAt,
    setLinkedAt,
    phoneDisplay,
    isPhoneLinked,
    phoneStatusLoading,
    phoneStatusError,
    unlinkLoading,
    unlinkError,
    setUnlinkError,
    fetchPhoneStatus,
    unlinkPhone,
  } = usePhoneStatus(loginStatus);
  const userContact = useMemo(
    () => phoneDisplay || phone,
    [phone, phoneDisplay]
  );
  const safeLoginStatus = useMemo<LoginStatus>(
    () =>
      loginStatus ?? {
        isUserLoggedIn: false,
        isPharmLoggedIn: false,
        isRiderLoggedIn: false,
        isAdminLoggedIn: false,
        isTestLoggedIn: false,
      },
    [loginStatus]
  );

  const persistCartItems = useCallback(
    (nextItems: CartLineItem[]) => {
      onUpdateCart(nextItems);
      writeClientCartItems(nextItems);
      window.dispatchEvent(new Event("cartUpdated"));
    },
    [onUpdateCart]
  );

  const openPhoneModal = useCallback(() => {
    setUnlinkError(null);
    setPhoneModalOpen(true);
  }, [setUnlinkError]);

  useEffect(() => {
    const onClose = () => onBack();
    window.addEventListener("closeCart", onClose);
    return () => window.removeEventListener("closeCart", onClose);
  }, [onBack]);

  useEffect(() => {
    const savedPassword = localStorage.getItem("password");
    if (savedPassword) {
      setPassword(savedPassword);
    }
    if ((window as any).IMP) {
      setSdkLoaded(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("password", password);
  }, [password]);

  useEffect(() => {
    if (Array.isArray(allProducts) && allProducts.length > 0) {
      localStorage.setItem("products", JSON.stringify(allProducts));
    }
  }, [allProducts]);

  useEffect(() => {
    const fetchLoginStatus = async () => {
      const fetchedLoginStatus = await getLoginStatus();
      setLoginStatus(fetchedLoginStatus);
    };
    fetchLoginStatus();
  }, []);

  useEffect(() => {
    if (selectedPharmacy?.id) {
      localStorage.setItem("selectedPharmacyId", String(selectedPharmacy.id));
      return;
    }
    localStorage.removeItem("selectedPharmacyId");
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
        const sorted = filterRegisteredPharmacies(response.data?.pharmacies);
        if (sorted.length > 0) {
          setSelectedPharmacy(sorted[0]);
        }
      } catch (error) {
        console.error("약국 정보를 가져오는 데 실패했습니다:", error);
      }
    }
  };

  const handleProductClick = (product: CartProduct, optionType: string) => {
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

  const handleAddToCart = (cartItem: CartLineItem) => {
    if (localStorage.getItem("restoreCartFromBackup") === "1") {
      localStorage.removeItem("restoreCartFromBackup");
    }

    const updatedItems = mergeClientCartItems(cartItems, [cartItem]);
    persistCartItems(updatedItems);
  };

  const handleUnlinkPhone = useCallback(async () => {
    const unlinked = await unlinkPhone();
    if (unlinked) {
      setPhoneModalOpen(false);
    }
  }, [unlinkPhone]);

  const handleBulkChange = (target: string) => {
    const { updatedItems, unavailableProductNames: unavailable } =
      buildBulkChangedCartItems({
        cartItems,
        allProducts,
        selectedPharmacyId: selectedPharmacy?.id,
        targetOptionType: target,
      });
    persistCartItems(updatedItems);
    if (unavailable.length) {
      alert(
        `${unavailable.join(
          ", "
        )} 상품은 재고가 없어 변경하지 않고, 나머지 상품만 ${target}로 바꿨어요.`
      );
    }
  };

  const { handleRequestPayment, handlePayment } = useCartPayment({
    router,
    selectedPaymentMethod,
    customTestAmount,
    totalPriceWithDelivery,
    safeLoginStatus,
    sdkLoaded,
    phoneStatusLoading,
    phone,
    isPhoneLinked,
    password,
    userContact,
    roadAddress,
    detailAddress,
    cartItems,
    onOpenPhoneModal: openPhoneModal,
    onOpenConfirmModal: () => {
      setShowModal(true);
    },
  });

  return (
    <div className="w-full pt-12 sm:pt-14 mb-8 max-w-[640px] mx-auto bg-white min-h-[100vh]">
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
        isPharmacyLoading={isPharmacyLoading}
        pharmacyError={pharmacyError}
        onRetryResolve={onRetryPharmacyResolve}
        isAddressMissing={!roadAddress?.trim()}
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
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
        phoneDisplay={phoneDisplay}
        linkedAt={linkedAt}
        onOpenPhoneModal={openPhoneModal}
        phoneStatusLoading={phoneStatusLoading}
        phoneStatusError={phoneStatusError}
        isUserLoggedIn={safeLoginStatus.isUserLoggedIn}
        password={password}
        setPassword={setPassword}
        unlinkError={unlinkError}
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
        loginStatus={safeLoginStatus}
        totalPrice={totalPrice}
        deliveryFee={deliveryFee}
        totalPriceWithDelivery={totalPriceWithDelivery}
        customTestAmount={customTestAmount}
        setCustomTestAmount={setCustomTestAmount}
        onRequestPayment={handleRequestPayment}
      />

      <PhoneVerifyModal
        open={phoneModalOpen}
        onClose={() => {
          if (unlinkLoading) return;
          setPhoneModalOpen(false);
        }}
        initialPhone={phone}
        initialLinkedAt={linkedAt}
        allowUnlink={isPhoneLinked}
        unlinkLoading={unlinkLoading}
        unlinkError={unlinkError}
        onUnlink={handleUnlinkPhone}
        onLinked={(nextPhone, nextLinkedAt) => {
          setPhone(nextPhone);
          setLinkedAt(nextLinkedAt);
          setPhoneModalOpen(false);
          setUnlinkError(null);
          fetchPhoneStatus();
        }}
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
