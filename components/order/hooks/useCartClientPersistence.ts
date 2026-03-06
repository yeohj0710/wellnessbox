"use client";

import { useEffect } from "react";
import type { CartPharmacy, CartProduct } from "@/components/order/cart.types";

type UseCartClientPersistenceParams = {
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  setSdkLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  allProducts: CartProduct[];
  selectedPharmacy: CartPharmacy | null;
};

export function useCartClientPersistence({
  password,
  setPassword,
  setSdkLoaded,
  allProducts,
  selectedPharmacy,
}: UseCartClientPersistenceParams) {
  useEffect(() => {
    const savedPassword = localStorage.getItem("password");
    if (savedPassword) {
      setPassword(savedPassword);
    }
    if ((window as { IMP?: unknown }).IMP) {
      setSdkLoaded(true);
    }
  }, [setPassword, setSdkLoaded]);

  useEffect(() => {
    localStorage.setItem("password", password);
  }, [password]);

  useEffect(() => {
    if (Array.isArray(allProducts) && allProducts.length > 0) {
      localStorage.setItem("products", JSON.stringify(allProducts));
    }
  }, [allProducts]);

  useEffect(() => {
    if (selectedPharmacy?.id) {
      localStorage.setItem("selectedPharmacyId", String(selectedPharmacy.id));
      return;
    }
    localStorage.removeItem("selectedPharmacyId");
  }, [selectedPharmacy]);
}
