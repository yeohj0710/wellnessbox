import type { B2bReportPayload } from "@/lib/b2b/report-payload-types";
import type {
  B2bReportCustomization,
  B2bReportPackagedProduct,
} from "@/lib/b2b/report-customization-types";
import { B2B_PERIOD_KEY_REGEX } from "@/lib/b2b/period";

type B2bReportCustomizationInput = {
  displayPeriodKey?: unknown;
  consultationSummary?: unknown;
  packagedProducts?:
    | Array<Partial<B2bReportPackagedProduct> | null | undefined>
    | unknown;
};

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: unknown) {
  const trimmed = trimText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function toDisplayPeriodKey(value: unknown) {
  const trimmed = trimText(value);
  return B2B_PERIOD_KEY_REGEX.test(trimmed) ? trimmed : null;
}

function normalizePackagedProduct(
  value: Partial<B2bReportPackagedProduct> | null | undefined,
  index: number
): B2bReportPackagedProduct | null {
  if (!value || typeof value !== "object") return null;

  const name = trimText(value.name);
  const brand = toNullableText(value.brand);
  const imageUrl = toNullableText(value.imageUrl);
  const description = toNullableText(value.description);
  const ingredientSummary = toNullableText(value.ingredientSummary);
  const intakeSummary = toNullableText(value.intakeSummary);
  const caution = toNullableText(value.caution);

  const hasAnyContent = [
    name,
    brand,
    imageUrl,
    description,
    ingredientSummary,
    intakeSummary,
    caution,
  ].some(Boolean);

  if (!hasAnyContent) return null;

  return {
    id: trimText(value.id) || `packaged-product-${index + 1}`,
    name: name || "구성 상품",
    brand,
    imageUrl,
    description,
    ingredientSummary,
    intakeSummary,
    caution,
  };
}

export function normalizeReportCustomization(
  input: B2bReportCustomizationInput | null | undefined
): B2bReportCustomization {
  if (!input || typeof input !== "object") {
    return {
      displayPeriodKey: null,
      consultationSummary: null,
      packagedProducts: [],
    };
  }

  return {
    displayPeriodKey: toDisplayPeriodKey(input.displayPeriodKey),
    consultationSummary: toNullableText(input.consultationSummary),
    packagedProducts: Array.isArray(input.packagedProducts)
      ? input.packagedProducts
          .map((item, index) => normalizePackagedProduct(item, index))
          .filter((item): item is B2bReportPackagedProduct => Boolean(item))
      : [],
  };
}

export function extractReportCustomization(rawPayload: unknown): B2bReportCustomization {
  if (!rawPayload || typeof rawPayload !== "object") {
    return normalizeReportCustomization(null);
  }

  const payload = rawPayload as {
    meta?: { periodKey?: unknown };
    reportAddendum?: B2bReportCustomization | null;
  };

  return normalizeReportCustomization({
    displayPeriodKey: payload.meta?.periodKey as string | null | undefined,
    consultationSummary: payload.reportAddendum?.consultationSummary,
    packagedProducts: payload.reportAddendum?.packagedProducts,
  });
}

export function hasReportCustomizationContent(
  customization: B2bReportCustomization | null | undefined
) {
  const normalized = normalizeReportCustomization(customization);
  return Boolean(
    normalized.consultationSummary || (normalized.packagedProducts?.length ?? 0) > 0
  );
}

export function applyReportCustomizationToPayload(
  payload: B2bReportPayload,
  customization: B2bReportCustomization | null | undefined
): B2bReportPayload {
  const normalized = normalizeReportCustomization(customization);

  return {
    ...payload,
    meta: {
      ...payload.meta,
      periodKey: normalized.displayPeriodKey || payload.meta.periodKey,
    },
    reportAddendum: {
      consultationSummary: normalized.consultationSummary ?? null,
      packagedProducts: normalized.packagedProducts ?? [],
    },
  };
}
