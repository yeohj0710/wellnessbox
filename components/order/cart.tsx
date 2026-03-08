"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useRouter } from "next/navigation";
import CartItemsSection from "./cartItemsSection";
import AddressSection from "./addressSection";
import PharmacyInfoSection from "./pharmacyInfoSection";
import PaymentSection from "./paymentSection";
import CartTopHeader from "./CartTopHeader";
import { useCartHydration } from "./hooks/useCartHydration";
import { useAddressFields } from "./hooks/useAddressFields";
import { useCartInteractionController } from "./hooks/useCartInteractionController";
import { useCartPayment } from "./hooks/useCartPayment";
import { useCartLoginStatus } from "./hooks/useCartLoginStatus";
import { useCartOverlayCloseBehavior } from "./hooks/useCartOverlayCloseBehavior";
import { useCartClientPersistence } from "./hooks/useCartClientPersistence";
import { usePhoneStatus } from "./hooks/usePhoneStatus";
import type { CartProps } from "./cart.types";

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("inicis");
  const [customTestAmount, setCustomTestAmount] = useState<number>(
    Number(process.env.NEXT_PUBLIC_TEST_PAYMENT_AMOUNT) || 1
  );
  const hydrated = useCartHydration(cartItems, onUpdateCart);
  const [password, setPassword] = useState("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
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

  useCartClientPersistence({
    password,
    setPassword,
    setSdkLoaded,
    allProducts,
    selectedPharmacy,
  });

  const {
    showPharmacyDetail,
    showCheckoutConfirm,
    isAddressModalOpen,
    detailProduct,
    phoneModalOpen,
    setAddressModalOpen,
    openAddressModal,
    closeAddressModal,
    openPharmacyDetail,
    closePharmacyDetail,
    openCheckoutConfirm,
    closeCheckoutConfirm,
    openPhoneModal,
    closePhoneModal,
    handleAddressSave,
    handleProductClick,
    closeDetailProduct,
    handleAddToCart,
    handleUnlinkPhone,
    handleBulkChange,
    handlePhoneLinked,
  } = useCartInteractionController({
    allProducts,
    cartItems,
    selectedPharmacy,
    containerRef,
    onUpdateCart,
    setRoadAddress,
    setSelectedPharmacy,
    setDetailAddress,
    unlinkPhone,
    setUnlinkError,
    fetchPhoneStatus,
    setPhone,
    setLinkedAt,
  });

  useCartOverlayCloseBehavior({
    onBack,
    isDetailProductOpen: Boolean(detailProduct),
  });

  const deliveryFee = 3000;
  const totalPriceWithDelivery = totalPrice + deliveryFee;

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
    onOpenConfirmModal: openCheckoutConfirm,
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
        onOpenAddressModal={openAddressModal}
      />

      <AddressSection
        roadAddress={roadAddress}
        setIsAddressModalOpen={setAddressModalOpen}
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
        onShowDetail={openPharmacyDetail}
      />

      {showPharmacyDetail && (
        <PharmacyDetailModal
          selectedPharmacy={selectedPharmacy}
          onClose={closePharmacyDetail}
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
          closePhoneModal();
        }}
        initialPhone={phone}
        initialLinkedAt={linkedAt}
        allowUnlink={isPhoneLinked}
        unlinkLoading={unlinkLoading}
        unlinkError={unlinkError}
        onUnlink={handleUnlinkPhone}
        onLinked={handlePhoneLinked}
      />

      {isAddressModalOpen && (
        <AddressModal onClose={closeAddressModal} onSave={handleAddressSave} />
      )}
      <CheckoutConfirmModal
        visible={showCheckoutConfirm}
        roadAddress={roadAddress}
        detailAddress={detailAddress}
        userContact={userContact}
        onCancel={closeCheckoutConfirm}
        onConfirm={() => {
          closeCheckoutConfirm();
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
