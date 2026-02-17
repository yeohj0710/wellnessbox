"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import Cart from "@/components/order/cart";
import {
  clearCartReturnState,
  isCartHostPath,
} from "@/lib/client/cart-navigation";
import {
  readClientCartItems,
  writeClientCartItems,
} from "@/lib/client/cart-storage";

const MISSING_ADDRESS_ERROR =
  "주소를 설정해 주세요. 해당 상품을 주문할 수 있는 약국을 보여드릴게요.";
const GLOBAL_CART_OPEN_KEY = "wbGlobalCartOpen";

function toCartSignature(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      const productId = Number(item?.productId);
      const optionType =
        typeof item?.optionType === "string" ? item.optionType.trim() : "";
      const quantity = Number(item?.quantity);
      return `${Number.isFinite(productId) ? productId : 0}:${optionType}:${
        Number.isFinite(quantity) ? quantity : 0
      }`;
    })
    .sort()
    .join("|");
}

function readRoadAddress() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("roadAddress") || "").trim();
}

export default function GlobalCartHost() {
  const pathname = usePathname();
  const canRenderGlobalCart = !isCartHostPath(pathname);

  const [isVisible, setIsVisible] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>(() =>
    typeof window !== "undefined" ? readClientCartItems() : []
  );
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [roadAddress, setRoadAddressState] = useState("");
  const [selectedPharmacy, setSelectedPharmacyState] = useState<any>(null);
  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [pharmacyResolveToken, setPharmacyResolveToken] = useState(0);

  const cartSignatureRef = useRef(
    typeof window !== "undefined" ? toCartSignature(readClientCartItems()) : ""
  );
  const openScrollYRef = useRef(0);
  const openedPathRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setCartItemsIfChanged = useCallback((nextItems: any[]) => {
    const nextSignature = toCartSignature(nextItems);
    if (nextSignature === cartSignatureRef.current) {
      return false;
    }
    cartSignatureRef.current = nextSignature;
    setCartItems(nextItems);
    return true;
  }, []);

  const setSelectedPharmacy = useCallback((pharmacy: any) => {
    setSelectedPharmacyState(pharmacy);
    if (typeof window === "undefined") return;
    if (pharmacy?.id) {
      localStorage.setItem("selectedPharmacyId", String(pharmacy.id));
    } else {
      localStorage.removeItem("selectedPharmacyId");
    }
  }, []);

  const openGlobalCart = useCallback(() => {
    if (!canRenderGlobalCart || typeof window === "undefined") return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    window.dispatchEvent(new Event("wb:chat-close-dock"));
    clearCartReturnState();
    openScrollYRef.current = window.scrollY;
    openedPathRef.current = pathname || window.location.pathname;
    sessionStorage.setItem("scrollPos", String(window.scrollY));
    sessionStorage.setItem(GLOBAL_CART_OPEN_KEY, "1");
    localStorage.setItem("openCart", "true");
    setIsVisible(true);
  }, [canRenderGlobalCart, pathname]);

  const closeGlobalCart = useCallback(() => {
    openedPathRef.current = null;
    setIsVisible(false);
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
    localStorage.removeItem("openCart");
    const y = openScrollYRef.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncCart = () => {
      setCartItemsIfChanged(readClientCartItems());
    };
    syncCart();
    window.addEventListener("cartUpdated", syncCart);
    return () => window.removeEventListener("cartUpdated", syncCart);
  }, [setCartItemsIfChanged]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAddress = () => setRoadAddressState(readRoadAddress());
    syncAddress();
    window.addEventListener("addressUpdated", syncAddress);
    window.addEventListener("addressCleared", syncAddress);
    return () => {
      window.removeEventListener("addressUpdated", syncAddress);
      window.removeEventListener("addressCleared", syncAddress);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpen = () => {
      if (isCartHostPath(window.location.pathname)) return;
      openGlobalCart();
    };
    window.addEventListener("openCart", handleOpen);
    return () => window.removeEventListener("openCart", handleOpen);
  }, [openGlobalCart]);

  useEffect(() => {
    if (!canRenderGlobalCart) {
      openedPathRef.current = null;
      setIsVisible(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(GLOBAL_CART_OPEN_KEY) !== "1") return;
    openGlobalCart();
  }, [canRenderGlobalCart, openGlobalCart]);

  useEffect(() => {
    if (!isVisible) return;
    const openedPath = openedPathRef.current;
    if (!openedPath || openedPath === pathname) return;
    openedPathRef.current = null;
    setIsVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(GLOBAL_CART_OPEN_KEY);
      localStorage.removeItem("openCart");
    }
  }, [isVisible, pathname]);

  useEffect(() => {
    if (!isVisible) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [isVisible]);

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
        const sortedPharmacies = response.data?.pharmacies || [];
        const availablePharmacies = sortedPharmacies.filter(
          (pharmacy: any) => pharmacy.registrationNumber !== null
        );
        if (!alive) return;

        if (!availablePharmacies.length) {
          setSelectedPharmacy(null);
          setPharmacyError("No nearby pharmacy has stock for this item.");
          return;
        }

        const storedPharmacyIdRaw = localStorage.getItem("selectedPharmacyId");
        const storedPharmacyId = Number(storedPharmacyIdRaw);
        setSelectedPharmacyState((previous: any) => {
          const preferredId = previous?.id ?? storedPharmacyId;
          const matched = availablePharmacies.find(
            (pharmacy: any) => pharmacy.id === preferredId
          );
          const nextPharmacy = matched || availablePharmacies[0];
          if (nextPharmacy?.id) {
            localStorage.setItem("selectedPharmacyId", String(nextPharmacy.id));
          }
          return nextPharmacy;
        });
      } catch (error: any) {
        if (error?.name === "CanceledError") return;
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
      const product = allProducts.find((p: any) => p.id === item.productId);
      const pharmacyProduct = product?.pharmacyProducts?.find(
        (pp: any) =>
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
      const product = allProducts.find((p: any) => p.id === item.productId);
      if (!product) return false;
      return product.pharmacyProducts?.some(
        (pp: any) =>
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

  const handleUpdateCart = useCallback((updatedItems: any[]) => {
    const normalized = writeClientCartItems(updatedItems);
    if (setCartItemsIfChanged(normalized)) {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [setCartItemsIfChanged]);

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
          setRoadAddress={setRoadAddressState}
          setSelectedPharmacy={setSelectedPharmacy}
          containerRef={containerRef}
          onBack={closeGlobalCart}
          onUpdateCart={handleUpdateCart}
        />
      </div>
    </div>
  );
}
