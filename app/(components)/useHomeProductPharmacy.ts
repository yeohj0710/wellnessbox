"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import axios from "axios";
import { filterRegisteredPharmacies } from "@/components/order/cart.helpers";
import { writeClientCartItems } from "@/lib/client/cart-storage";
import { HOME_PRODUCT_COPY } from "./homeProductSection.copy";
import type {
  HomeCartItem,
  HomePharmacy,
} from "./homeProductSection.types";

type UseHomeProductPharmacyOptions = {
  cartItems: HomeCartItem[];
  roadAddress: string;
  selectedPharmacy: HomePharmacy | null;
  setSelectedPharmacy: (pharmacy: HomePharmacy | null) => void;
  setCartItems: Dispatch<SetStateAction<HomeCartItem[]>>;
};

type UseHomeProductPharmacyResult = {
  pharmacies: HomePharmacy[];
  pharmacyError: string | null;
  isPharmacyLoading: boolean;
  retryPharmacyResolve: () => void;
  resetPharmacyState: () => void;
};

export function useHomeProductPharmacy({
  cartItems,
  roadAddress,
  selectedPharmacy,
  setSelectedPharmacy,
  setCartItems,
}: UseHomeProductPharmacyOptions): UseHomeProductPharmacyResult {
  const [pharmacies, setPharmacies] = useState<HomePharmacy[]>([]);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [isPharmacyLoading, setIsPharmacyLoading] = useState(false);
  const [pharmacyResolveToken, setPharmacyResolveToken] = useState(0);

  const retryPharmacyResolve = useCallback(() => {
    setPharmacyResolveToken((prev) => prev + 1);
  }, []);

  const resetPharmacyState = useCallback(() => {
    setPharmacies([]);
    setSelectedPharmacy(null);
    setPharmacyError(null);
    setIsPharmacyLoading(false);
  }, [setSelectedPharmacy]);

  useEffect(() => {
    if (cartItems.length === 0) {
      resetPharmacyState();
      return;
    }
    if (!roadAddress) {
      setPharmacies([]);
      setSelectedPharmacy(null);
      setPharmacyError(HOME_PRODUCT_COPY.pharmacyAddressRequired);
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
        const filteredPharmacies = filterRegisteredPharmacies(
          response.data?.pharmacies
        );
        if (!alive) return;

        if (!filteredPharmacies.length) {
          alert(HOME_PRODUCT_COPY.noNearbyStockAlert);
          setPharmacyError(HOME_PRODUCT_COPY.noNearbyStockError);
          setCartItems((prev) => {
            const updated = writeClientCartItems(prev.slice(1));
            window.dispatchEvent(new Event("cartUpdated"));
            return updated;
          });
          return;
        }

        setPharmacies(filteredPharmacies);
        if (
          !selectedPharmacy ||
          !filteredPharmacies.some(
            (pharmacy) => pharmacy.id === selectedPharmacy.id
          )
        ) {
          setSelectedPharmacy(filteredPharmacies[0]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "CanceledError") return;
        if (alive) {
          setPharmacyError(HOME_PRODUCT_COPY.pharmacyLoadFailed);
        }
        console.error("약국 정보를 불러오지 못했습니다:", error);
      } finally {
        if (alive) {
          setIsPharmacyLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [
    cartItems,
    pharmacyResolveToken,
    resetPharmacyState,
    roadAddress,
    selectedPharmacy,
    setCartItems,
    setSelectedPharmacy,
  ]);

  return {
    pharmacies,
    pharmacyError,
    isPharmacyLoading,
    retryPharmacyResolve,
    resetPharmacyState,
  };
}
