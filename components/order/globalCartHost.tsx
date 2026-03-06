"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import Cart from "@/components/order/cart";
import { filterRegisteredPharmacies } from "@/components/order/cart.helpers";
import type {
  CartLineItem,
  CartPharmacy,
  CartProduct,
} from "@/components/order/cart.types";
import { isCartHostPath } from "@/lib/client/cart-navigation";
import { writeClientCartItems } from "@/lib/client/cart-storage";
import { MISSING_ADDRESS_ERROR } from "@/components/order/globalCartHost.constants";
import { useGlobalCartVisibility } from "@/components/order/hooks/useGlobalCartVisibility";
import { useRoadAddressState } from "@/components/order/hooks/useRoadAddressState";
import { useSyncedClientCartItems } from "@/components/order/hooks/useSyncedClientCartItems";

export default function GlobalCartHost() {
  const pathname = usePathname();
  const canRenderGlobalCart = !isCartHostPath(pathname);

  const { cartItems, setCartItemsIfChanged } = useSyncedClientCartItems();
  const { roadAddress, setRoadAddress } = useRoadAddressState();
  const { isVisible, closeGlobalCart } = useGlobalCartVisibility({
    canRenderGlobalCart,
    pathname,
  });

  const [allProducts, setAllProducts] = useState<CartProduct[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedPharmacy, setSelectedPharmacyState] =
    useState<CartPharmacy | null>(null);
  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [pharmacyResolveToken, setPharmacyResolveToken] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const setSelectedPharmacy = useCallback((pharmacy: CartPharmacy | null) => {
    setSelectedPharmacyState(pharmacy);
    if (typeof window === "undefined") return;
    if (pharmacy?.id) {
      localStorage.setItem("selectedPharmacyId", String(pharmacy.id));
    } else {
      localStorage.removeItem("selectedPharmacyId");
    }
  }, []);

  const cartProductIds = useMemo(() => {
    return Array.from(
      new Set(
        cartItems
          .map((item) => Number(item?.productId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );
  }, [cartItems]);
  const cartProductIdsKey = useMemo(
    () => cartProductIds.join(","),
    [cartProductIds]
  );

  useEffect(() => {
    if (!isVisible) return;
    if (cartProductIds.length === 0) {
      setAllProducts([]);
      return;
    }

    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        const response = await fetch("/api/cart-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: cartProductIds }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!alive) return;
        if (!response.ok || !Array.isArray(payload?.products)) {
          setAllProducts([]);
          return;
        }
        setAllProducts(payload.products);
      } catch {
        if (!alive) return;
        setAllProducts([]);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [isVisible, cartProductIdsKey, cartProductIds]);

  useEffect(() => {
    if (!isVisible) return;
    if (cartItems.length === 0) {
      setSelectedPharmacy(null);
      setPharmacyError(null);
      setIsPharmacyLoading(false);
      return;
    }
    if (!roadAddress) {
      setSelectedPharmacy(null);
      setPharmacyError(MISSING_ADDRESS_ERROR);
      setIsPharmacyLoading(false);
      return;
    }

    const controller = new AbortController();
    let alive = true;

    setIsPharmacyLoading(true);
    setPharmacyError(null);

    (async () => {
      try {
        const response = await axios.post(
          "/api/get-sorted-pharmacies",
          { cartItem: cartItems[0], roadAddress },
          { signal: controller.signal, timeout: 9000 }
        );
        const availablePharmacies = filterRegisteredPharmacies(
          response.data?.pharmacies
        );
        if (!alive) return;

        if (!availablePharmacies.length) {
          setSelectedPharmacy(null);
          setPharmacyError("No nearby pharmacy has stock for this item.");
          return;
        }

        const storedPharmacyIdRaw = localStorage.getItem("selectedPharmacyId");
        const storedPharmacyId = Number(storedPharmacyIdRaw);
        setSelectedPharmacyState((previous) => {
          const preferredId = previous?.id ?? storedPharmacyId;
          const matched = availablePharmacies.find(
            (pharmacy) => pharmacy.id === preferredId
          );
          const nextPharmacy = matched || availablePharmacies[0];
          if (nextPharmacy?.id) {
            localStorage.setItem("selectedPharmacyId", String(nextPharmacy.id));
          }
          return nextPharmacy;
        });
      } catch (error) {
        if (error instanceof Error && error.name === "CanceledError") return;
        if (!alive) return;
        setSelectedPharmacy(null);
        setPharmacyError("Failed to load nearby pharmacies. Retry.");
      } finally {
        if (alive) setIsPharmacyLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [isVisible, cartItems, roadAddress, pharmacyResolveToken, setSelectedPharmacy]);

  useEffect(() => {
    if (!isVisible) return;
    if (!selectedPharmacy || allProducts.length === 0) {
      setTotalPrice(0);
      return;
    }

    const total = cartItems.reduce((acc, item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      const pharmacyProduct = product?.pharmacyProducts?.find(
        (pp) =>
          (pp.pharmacyId ?? pp.pharmacy?.id) === selectedPharmacy.id &&
          pp.optionType === item.optionType
      );
      if (!pharmacyProduct) return acc;
      return acc + (Number(pharmacyProduct.price) || 0) * item.quantity;
    }, 0);

    setTotalPrice(total);
  }, [isVisible, allProducts, cartItems, selectedPharmacy]);

  useEffect(() => {
    if (!isVisible) return;
    if (!selectedPharmacy || allProducts.length === 0) return;

    const filteredCartItems = cartItems.filter((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) return false;
      return product.pharmacyProducts?.some(
        (pp) =>
          (pp.pharmacyId ?? pp.pharmacy?.id) === selectedPharmacy.id &&
          pp.optionType === item.optionType
      );
    });

    if (filteredCartItems.length === cartItems.length) return;

    const normalized = writeClientCartItems(filteredCartItems);
    if (setCartItemsIfChanged(normalized)) {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [isVisible, selectedPharmacy, allProducts, cartItems, setCartItemsIfChanged]);

  const handleUpdateCart = useCallback(
    (updatedItems: CartLineItem[]) => {
      const normalized = writeClientCartItems(updatedItems);
      if (setCartItemsIfChanged(normalized)) {
        window.dispatchEvent(new Event("cartUpdated"));
      }
    },
    [setCartItemsIfChanged]
  );

  const retryPharmacyResolve = useCallback(() => {
    setPharmacyResolveToken((prev) => prev + 1);
  }, []);

  if (!isVisible || !canRenderGlobalCart) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[90] flex">
      <div className="h-full w-full overflow-y-auto bg-white" ref={containerRef}>
        <Cart
          cartItems={cartItems}
          totalPrice={totalPrice}
          selectedPharmacy={selectedPharmacy}
          allProducts={allProducts}
          isPharmacyLoading={isPharmacyLoading}
          pharmacyError={pharmacyError}
          onRetryPharmacyResolve={retryPharmacyResolve}
          roadAddress={roadAddress}
          setRoadAddress={setRoadAddress}
          setSelectedPharmacy={setSelectedPharmacy}
          containerRef={containerRef}
          onBack={closeGlobalCart}
          onUpdateCart={handleUpdateCart}
        />
      </div>
    </div>
  );
}
