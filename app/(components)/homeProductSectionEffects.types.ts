import type { MutableRefObject } from "react";
import type {
  HomeCartItem,
  HomeCategory,
  HomePharmacy,
  HomeProduct,
  SetState,
} from "./homeProductSection.types";

export type SearchParamReader = {
  get: (key: string) => string | null;
};

export type HomeDataReason = "initial" | "recovery";

export type FetchHomeData = (reason?: HomeDataReason) => Promise<void>;

export type SetBoolean = SetState<boolean>;

export type SetString = SetState<string>;

export type NumberRef = MutableRefObject<number>;

export type SetNumber = SetState<number>;

export type SetNumberArray = SetState<number[]>;

export type SetHomeCategoryArray = SetState<HomeCategory[]>;

export type SetHomeProductArray = SetState<HomeProduct[]>;

export type SetHomeCartItemArray = SetState<HomeCartItem[]>;

export type SetNullableHomeProduct = SetState<HomeProduct | null>;

export type SetNullableHomePharmacy = SetState<HomePharmacy | null>;
