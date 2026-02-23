export type RecommendationLine = {
  category: string;
  productName: string;
  sourcePrice: number | null;
};

export type ProductNameItem = {
  id: number;
  name: string;
  categories: string[];
};

export type CartProductItem = {
  id: number;
  name: string;
  images: string[];
  pharmacyProducts: Array<{
    price: number | null;
    optionType: string | null;
    capacity: string | null;
    stock: number | null;
  }>;
};

export type ActionableRecommendation = {
  category: string;
  sourceCategory: string;
  sourceProductName: string;
  productId: number;
  productName: string;
  optionType: string;
  capacity: string | null;
  packagePrice: number;
  sevenDayPrice: number;
  sourcePrice: number | null;
};

export type ProductIdScore = {
  id: number;
  score: number;
  source: "name" | "category";
};
