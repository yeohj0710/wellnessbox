export type LookupMode = "phone-password" | "phone-only";

export type LookupConfig = {
  phone: string;
  password?: string;
  mode: LookupMode;
};
