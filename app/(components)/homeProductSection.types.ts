import type { Dispatch, SetStateAction } from "react";
import type { CartLineItem, CartPharmacy } from "@/components/order/cart.types";

export type HomeCategory = {
  id: number;
  name: string;
  [key: string]: unknown;
};

export type HomePharmacy = CartPharmacy;

export type HomePharmacyProduct = {
  id: number;
  optionType: string;
  price: number;
  stock: number;
  pharmacyId?: number | null;
  pharmacy?: HomePharmacy | null;
  [key: string]: unknown;
};

export type HomeProduct = {
  id: number;
  name: string;
  images?: string[];
  categories: HomeCategory[];
  pharmacyProducts: HomePharmacyProduct[];
  [key: string]: unknown;
};

export type HomeCartItem = CartLineItem;

export type HomeDataResponse = {
  categories?: HomeCategory[];
  products?: HomeProduct[];
};

export type SetState<T> = Dispatch<SetStateAction<T>>;
