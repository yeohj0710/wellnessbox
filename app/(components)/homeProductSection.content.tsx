"use client";

import type { RefObject } from "react";
import ProductDetail from "@/components/product/productDetail";
import Cart from "@/components/order/cart";
import CartOverlayPortal from "@/components/order/cartOverlayPortal";
import { getLowestAverageOptionType } from "@/lib/utils";
import AddressSection from "@/app/(components)/addressSection";
import PharmacySelector from "@/app/(components)/pharmacySelector";
import CategoryFilter from "@/app/(components)/categoryFilter";
import PackageFilter from "@/app/(components)/packageFilter";
import ProductGrid from "@/app/(components)/productGrid";
import FooterCartBar from "@/app/(components)/footerCartBar";
import FooterCartBarLoading from "@/app/(components)/footerCartBarLoading";
import SymptomFilter from "@/app/(components)/symptomFilter";
import { HOME_PACKAGE_LABELS } from "./homeProductSection.copy";
import {
  HomeProductsStatusState,
  SelectedPharmacyNotice,
} from "./homeProductSection.view";
import type {
  HomeCartItem,
  HomeCategory,
  HomePharmacy,
  HomeProduct,
  SetState,
} from "./homeProductSection.types";

type HomeProductSectionContentProps = {
  roadAddress: string;
  setRoadAddress: SetState<string>;
  isAddressModalOpen: boolean;
  setIsAddressModalOpen: SetState<boolean>;
  cartItems: HomeCartItem[];
  pharmacies: HomePharmacy[];
  selectedPharmacy: HomePharmacy | null;
  setSelectedPharmacy: SetState<HomePharmacy | null>;
  selectedSymptoms: string[];
  setSelectedSymptoms: SetState<string[]>;
  categories: HomeCategory[];
  isLoading: boolean;
  selectedCategories: number[];
  onToggleCategory: (categoryId: number) => void;
  onResetCategories: () => void;
  selectedPackage: string;
  deferredSelectedPackage: string;
  onSelectPackage: (pkg: string) => void;
  isFilterUpdating: boolean;
  products: HomeProduct[];
  allProducts: HomeProduct[];
  error: string | null;
  isRecovering: boolean;
  isCatalogPaused: boolean;
  onRetryLoad: () => void;
  totalPrice: number;
  isCartBarLoading: boolean;
  onOpenCart: () => void;
  selectedProduct: HomeProduct | null;
  onOpenProductDetail: (product: HomeProduct) => void;
  onCloseProductDetail: () => void;
  onAddToCart: (cartItem: HomeCartItem) => void;
  isCartVisible: boolean;
  cartContainerRef: RefObject<HTMLDivElement>;
  isPharmacyLoading: boolean;
  pharmacyError: string | null;
  onRetryPharmacyResolve: () => void;
  onCloseCart: () => void;
  onCartUpdate: (updatedItems: HomeCartItem[]) => void;
};

export function HomeProductSectionContent({
  roadAddress,
  setRoadAddress,
  isAddressModalOpen,
  setIsAddressModalOpen,
  cartItems,
  pharmacies,
  selectedPharmacy,
  setSelectedPharmacy,
  selectedSymptoms,
  setSelectedSymptoms,
  categories,
  isLoading,
  selectedCategories,
  onToggleCategory,
  onResetCategories,
  selectedPackage,
  deferredSelectedPackage,
  onSelectPackage,
  isFilterUpdating,
  products,
  allProducts,
  error,
  isRecovering,
  isCatalogPaused,
  onRetryLoad,
  totalPrice,
  isCartBarLoading,
  onOpenCart,
  selectedProduct,
  onOpenProductDetail,
  onCloseProductDetail,
  onAddToCart,
  isCartVisible,
  cartContainerRef,
  isPharmacyLoading,
  pharmacyError,
  onRetryPharmacyResolve,
  onCloseCart,
  onCartUpdate,
}: HomeProductSectionContentProps) {
  if (isCatalogPaused) {
    return (
      <div id="home-products" className="mx-auto mt-2 w-full max-w-[640px] bg-white">
        <HomeProductsStatusState
          error={error}
          isLoading={isLoading}
          isRecovering={isRecovering}
          hasProducts={false}
          isCatalogPaused
          onRetry={onRetryLoad}
        />
      </div>
    );
  }

  return (
    <div
      id="home-products"
      data-filter-updating={isFilterUpdating ? "true" : "false"}
      className={`mx-auto mt-2 w-full max-w-[640px] overflow-x-hidden bg-white ${
        totalPrice > 0 && !isCartVisible ? "pb-20" : ""
      }`}
    >
      <AddressSection
        roadAddress={roadAddress}
        setRoadAddress={setRoadAddress}
        isAddressModalOpen={isAddressModalOpen}
        setIsAddressModalOpen={setIsAddressModalOpen}
      />

      {cartItems.length > 0 && pharmacies.length > 0 && (
        <PharmacySelector
          pharmacies={pharmacies}
          selectedPharmacy={selectedPharmacy}
          setSelectedPharmacy={setSelectedPharmacy}
        />
      )}

      <SymptomFilter
        selectedSymptoms={selectedSymptoms}
        setSelectedSymptoms={setSelectedSymptoms}
      />

      <CategoryFilter
        categories={categories}
        isLoading={isLoading}
        selectedCategories={selectedCategories}
        onToggleCategory={onToggleCategory}
        onResetCategories={onResetCategories}
      />

      <PackageFilter
        selectedPackage={selectedPackage}
        setSelectedPackage={onSelectPackage}
      />

      <SelectedPharmacyNotice
        visible={cartItems.length > 0 && !!selectedPharmacy}
        pharmacyName={selectedPharmacy?.name}
        distanceKm={
          typeof selectedPharmacy?.distance === "number"
            ? selectedPharmacy.distance
            : null
        }
      />

      <ProductGrid
        isLoading={isLoading && allProducts.length === 0}
        isUpdating={isFilterUpdating}
        products={products}
        selectedPackage={deferredSelectedPackage}
        selectedPharmacy={selectedPharmacy}
        setSelectedProduct={onOpenProductDetail}
      />

      <HomeProductsStatusState
        error={error}
        isLoading={isLoading}
        isRecovering={isRecovering}
        hasProducts={allProducts.length > 0}
        isCatalogPaused={isCatalogPaused}
        onRetry={onRetryLoad}
      />

      {selectedPharmacy &&
        !selectedProduct &&
        !isCartVisible &&
        (totalPrice > 0 || isCartBarLoading) &&
        (isCartBarLoading ? (
          <FooterCartBarLoading />
        ) : (
          <FooterCartBar totalPrice={totalPrice} setIsCartVisible={onOpenCart} />
        ))}

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          optionType={
            selectedPackage === HOME_PACKAGE_LABELS.all
              ? getLowestAverageOptionType({
                  product: selectedProduct,
                  pharmacy: selectedPharmacy,
                })
              : selectedPackage
          }
          pharmacy={selectedPharmacy}
          onClose={onCloseProductDetail}
          onAddToCart={onAddToCart}
          onAddressSaved={(address: string) => {
            setRoadAddress((address || "").trim());
          }}
        />
      )}

      {isCartVisible && (
        <CartOverlayPortal>
          <div className="fixed inset-x-0 bottom-0 top-14 z-[140] isolate flex overscroll-none bg-white [contain:paint]">
            <div
              className="h-full w-full overflow-y-auto overscroll-contain bg-white"
              ref={cartContainerRef}
            >
              <Cart
                cartItems={cartItems}
                totalPrice={totalPrice}
                selectedPharmacy={selectedPharmacy}
                allProducts={allProducts}
                isPharmacyLoading={isPharmacyLoading}
                pharmacyError={pharmacyError}
                onRetryPharmacyResolve={onRetryPharmacyResolve}
                roadAddress={roadAddress}
                setRoadAddress={setRoadAddress}
                setSelectedPharmacy={setSelectedPharmacy}
                containerRef={cartContainerRef}
                onBack={onCloseCart}
                onUpdateCart={onCartUpdate}
              />
            </div>
          </div>
        </CartOverlayPortal>
      )}
    </div>
  );
}
