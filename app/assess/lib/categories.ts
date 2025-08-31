"use client";

import { CATEGORY_LABELS, CategoryKey, CATEGORY_DESCRIPTIONS } from "../data/categories";

export const KEY_TO_CODE: Record<CategoryKey, string> = {
  vitaminC: "vitc",
  omega3: "omega3",
  calcium: "ca",
  lutein: "lutein",
  vitaminD: "vitd",
  milkThistle: "milkthistle",
  probiotics: "probiotics",
  vitaminB: "vitb",
  magnesium: "mg",
  garcinia: "garcinia",
  multivitamin: "multivitamin",
  zinc: "zn",
  psyllium: "psyllium",
  minerals: "minerals",
  vitaminA: "vita",
  iron: "fe",
  phosphatidylserine: "ps",
  folicAcid: "folate",
  arginine: "arginine",
  chondroitin: "chondroitin",
  coenzymeQ10: "coq10",
  collagen: "collagen",
};

export const CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).map(([k, code]) => [
    code,
    CATEGORY_LABELS[k as CategoryKey],
  ])
) as Record<string, string>;

export const CODE_TO_DESC: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_CODE).map(([k, code]) => [
    code,
    CATEGORY_DESCRIPTIONS[k as CategoryKey],
  ])
) as Record<string, string>;

export const labelOf = (code: string) =>
  CODE_TO_LABEL[code as keyof typeof CODE_TO_LABEL] ?? code;
export const descOf = (code: string) =>
  CODE_TO_DESC[code as keyof typeof CODE_TO_DESC] ?? "";
