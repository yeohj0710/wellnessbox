import { useCallback, useRef, useState, type RefObject } from "react";
import axios from "axios";
import { mergeClientCartItems } from "@/lib/client/cart-storage";
import {
  updateCartAndPersist,
} from "../cartItemsSection.actions";
import { CART_COPY, buildUnavailableBulkChangeAlert } from "../cart.copy";
import {
  buildBulkChangedCartItems,
  filterRegisteredPharmacies,
} from "../cart.helpers";
import type {
  CartDetailProduct,
  CartLineItem,
  CartPharmacy,
  CartProduct,
} from "../cart.types";

type UseCartInteractionControllerInput = {
  allProducts: CartProduct[];
  cartItems: CartLineItem[];
  selectedPharmacy: CartPharmacy | null;
  containerRef: RefObject<HTMLDivElement | null>;
  onUpdateCart: (items: CartLineItem[]) => void;
  setRoadAddress: (value: string) => void;
  setSelectedPharmacy: (pharmacy: CartPharmacy | null) => void;
  setDetailAddress: (value: string) => void;
  unlinkPhone: () => Promise<boolean>;
  setUnlinkError: (value: string | null) => void;
  fetchPhoneStatus: () => Promise<void>;
  setPhone: (value: string) => void;
  setLinkedAt: (value: string | undefined) => void;
  markPhoneVerified: (value: string) => void;
};

export function useCartInteractionController({
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
  markPhoneVerified,
}: UseCartInteractionControllerInput) {
  const [showPharmacyDetail, setShowPharmacyDetail] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<CartDetailProduct | null>(
    null
  );
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const cartScrollRef = useRef(0);

  const persistCartItems = useCallback(
    (nextItems: CartLineItem[]) => {
      updateCartAndPersist(nextItems, onUpdateCart);
    },
    [onUpdateCart]
  );

  const setAddressModalOpen = useCallback((next: boolean) => {
    setIsAddressModalOpen(next);
  }, []);

  const openAddressModal = useCallback(() => {
    setIsAddressModalOpen(true);
  }, []);

  const closeAddressModal = useCallback(() => {
    setIsAddressModalOpen(false);
  }, []);

  const openPharmacyDetail = useCallback(() => {
    setShowPharmacyDetail(true);
  }, []);

  const closePharmacyDetail = useCallback(() => {
    setShowPharmacyDetail(false);
  }, []);

  const openCheckoutConfirm = useCallback(() => {
    setShowCheckoutConfirm(true);
  }, []);

  const closeCheckoutConfirm = useCallback(() => {
    setShowCheckoutConfirm(false);
  }, []);

  const openPhoneModal = useCallback(() => {
    setUnlinkError(null);
    setPhoneModalOpen(true);
  }, [setUnlinkError]);

  const closePhoneModal = useCallback(() => {
    setPhoneModalOpen(false);
  }, []);

  const handleAddressSave = useCallback(
    async (newRoadAddress: string, detail: string) => {
      setRoadAddress(newRoadAddress);
      setDetailAddress(detail);
      localStorage.setItem("roadAddress", newRoadAddress);
      localStorage.setItem("detailAddress", detail);
      closeAddressModal();

      if (cartItems.length === 0) return;

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
    },
    [
      cartItems,
      closeAddressModal,
      setDetailAddress,
      setRoadAddress,
      setSelectedPharmacy,
    ]
  );

  const handleProductClick = useCallback(
    (product: CartProduct, optionType: string) => {
      if (containerRef.current) {
        cartScrollRef.current = containerRef.current.scrollTop;
      }
      setDetailProduct({ product, optionType });
    },
    [containerRef]
  );

  const closeDetailProduct = useCallback(() => {
    setDetailProduct(null);
    if (containerRef.current) {
      containerRef.current.scrollTop = cartScrollRef.current;
    }
  }, [containerRef]);

  const handleAddToCart = useCallback(
    (cartItem: CartLineItem) => {
      if (localStorage.getItem("restoreCartFromBackup") === "1") {
        localStorage.removeItem("restoreCartFromBackup");
      }

      const updatedItems = mergeClientCartItems(cartItems, [cartItem]);
      persistCartItems(updatedItems);
    },
    [cartItems, persistCartItems]
  );

  const handleUnlinkPhone = useCallback(async () => {
    const unlinked = await unlinkPhone();
    if (unlinked) {
      closePhoneModal();
    }
  }, [closePhoneModal, unlinkPhone]);

  const handleBulkChange = useCallback(
    (target: string) => {
      const { updatedItems, unavailableProductNames: unavailable } =
        buildBulkChangedCartItems({
          cartItems,
          allProducts,
          selectedPharmacyId: selectedPharmacy?.id,
          targetOptionType: target,
        });
      persistCartItems(updatedItems);
      if (unavailable.length > 0) {
        alert(buildUnavailableBulkChangeAlert(unavailable, target));
      }
    },
    [allProducts, cartItems, persistCartItems, selectedPharmacy?.id]
  );

  const handlePhoneLinked = useCallback(
    (nextPhone: string, nextLinkedAt: string | undefined) => {
      if (nextLinkedAt) {
        setPhone(nextPhone);
        setLinkedAt(nextLinkedAt);
        void fetchPhoneStatus();
      } else {
        markPhoneVerified(nextPhone);
      }
      closePhoneModal();
      setUnlinkError(null);
    },
    [
      closePhoneModal,
      fetchPhoneStatus,
      markPhoneVerified,
      setLinkedAt,
      setPhone,
      setUnlinkError,
    ]
  );

  return {
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
  };
}
