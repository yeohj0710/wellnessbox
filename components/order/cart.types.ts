import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ClientCartItem } from "@/lib/client/cart-storage";

export type CartLineItem = ClientCartItem & {
  price?: number;
  [key: string]: unknown;
};

export type CartPharmacy = {
  id: number;
  name?: string;
  address?: string;
  phone?: string;
  registrationNumber?: string | null;
  representativeName?: string;
  distance?: number;
  [key: string]: unknown;
};

export type CartProductCategory = {
  id?: number;
  name: string;
  [key: string]: unknown;
};

export type CartPharmacyProduct = {
  id: number;
  optionType: string;
  price: number;
  stock: number;
  pharmacyId?: number | null;
  pharmacy?: CartPharmacy | null;
  [key: string]: unknown;
};

export type CartProduct = {
  id: number;
  name: string;
  images?: string[];
  categories?: CartProductCategory[];
  pharmacyProducts?: CartPharmacyProduct[];
  [key: string]: unknown;
};

export type CartDetailProduct = {
  product: CartProduct;
  optionType: string;
};

export type CartProps = {
  cartItems: CartLineItem[];
  totalPrice: number;
  selectedPharmacy: CartPharmacy | null;
  allProducts: CartProduct[];
  isPharmacyLoading: boolean;
  pharmacyError: string | null;
  onRetryPharmacyResolve: () => void;
  roadAddress: string;
  setRoadAddress: Dispatch<SetStateAction<string>>;
  setSelectedPharmacy: (pharmacy: CartPharmacy | null) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onUpdateCart: (items: CartLineItem[]) => void;
};
