"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useRouter } from "next/navigation";
import CartItemsSection from "./cartItemsSection";
import AddressSection from "./addressSection";
import PharmacyInfoSection from "./pharmacyInfoSection";
import PaymentSection from "./paymentSection";
import CartTopHeader from "./CartTopHeader";
import axios from "axios";
import { useCartHydration } from "./hooks/useCartHydration";
import { useAddressFields } from "./hooks/useAddressFields";
import { useCartPayment } from "./hooks/useCartPayment";
import { useCartLoginStatus } from "./hooks/useCartLoginStatus";
import { useCartOverlayCloseBehavior } from "./hooks/useCartOverlayCloseBehavior";
import { useCartClientPersistence } from "./hooks/useCartClientPersistence";
import { usePhoneStatus } from "./hooks/usePhoneStatus";
import { buildBulkChangedCartItems, filterRegisteredPharmacies } from "./cart.helpers";
import type {
  CartDetailProduct,
  CartLineItem,
  CartProduct,
  CartProps,
} from "./cart.types";
import { CART_COPY, buildUnavailableBulkChangeAlert } from "./cart.copy";
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
  const { loginStatus, safeLoginStatus } = useCartLoginStatus();
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

  useCartClientPersistence({
    password,
    setPassword,
    setSdkLoaded,
    allProducts,
    selectedPharmacy,
  });

  useCartOverlayCloseBehavior({
    onBack,
    isDetailProductOpen: Boolean(detailProduct),
  });

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
        console.error(CART_COPY.fetchPharmacyErrorPrefix, error);
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
      alert(buildUnavailableBulkChangeAlert(unavailable, target));
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
      <CartTopHeader onBack={onBack} />
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
