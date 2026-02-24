import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

export type SearchParamReader = {
  get: (key: string) => string | null;
};

export type HomeDataReason = "initial" | "recovery";

export type FetchHomeData = (reason?: HomeDataReason) => Promise<void>;

export type SetAnyArray = Dispatch<SetStateAction<any[]>>;

export type SetBoolean = Dispatch<SetStateAction<boolean>>;

export type SetString = Dispatch<SetStateAction<string>>;

export type SetNullableAny = Dispatch<SetStateAction<any>>;

export type NumberRef = MutableRefObject<number>;

export type SetNumber = Dispatch<SetStateAction<number>>;

export type SetNumberArray = Dispatch<SetStateAction<number[]>>;
