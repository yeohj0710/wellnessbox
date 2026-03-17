export type B2bReportPackagedProduct = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  description: string | null;
  ingredientSummary: string | null;
  intakeSummary: string | null;
  caution: string | null;
};

export type B2bReportCustomization = {
  displayPeriodKey?: string | null;
  consultationSummary?: string | null;
  packagedProducts?: B2bReportPackagedProduct[];
};

export function createEmptyReportPackagedProduct(
  id = `packaged-product-${Date.now()}-${Math.round(Math.random() * 1000)}`
): B2bReportPackagedProduct {
  return {
    id,
    name: "",
    brand: null,
    imageUrl: null,
    description: null,
    ingredientSummary: null,
    intakeSummary: null,
    caution: null,
  };
}
