import type { Prisma } from "@prisma/client";

export const IN_STOCK_PRODUCT_WHERE = {
  pharmacyProducts: {
    some: {
      stock: { gt: 0 },
    },
  },
} satisfies Prisma.ProductWhereInput;

export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  images: true,
  description: true,
  importance: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
  pharmacyProducts: {
    select: {
      id: true,
      price: true,
      optionType: true,
      capacity: true,
      stock: true,
      pharmacyId: true,
      pharmacy: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

export const DEFAULT_PRODUCT_ORDER = [
  { importance: "desc" },
  { updatedAt: "desc" },
] satisfies Prisma.ProductOrderByWithRelationInput[];

export function withRatingDefaults<
  T extends {
    id: number;
    name: string | null;
  }
>(products: T[]) {
  return products.map((product) => ({
    ...product,
    rating: 0,
    reviewCount: 0,
  }));
}
