"use server";

import db from "@/lib/db";

export async function getProducts() {
  const products = await db.product.findMany({
    where: {
      pharmacyProducts: {
        some: {
          stock: { gt: 0 },
        },
      },
    },
    select: {
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
    },
    orderBy: [
      { importance: "desc" },
      { updatedAt: "desc" },
    ],
  });
  return products.map((product) => ({
    ...product,
    rating: 0,
    reviewCount: 0,
  }));
}

export async function getProductsByUpdatedAt() {
  const products = await db.product.findMany({
    where: {
      pharmacyProducts: {
        some: {
          stock: { gt: 0 },
        },
      },
    },
    select: {
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
    },
    orderBy: [
      { importance: "desc" },
      { updatedAt: "desc" },
    ],
  });
  return products.map((product) => ({
    ...product,
    rating: 0,
    reviewCount: 0,
  }));
}

export async function getProductsIdName() {
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return products;
}

export async function getProductSummaries(limit = 30) {
  const products = await db.product.findMany({
    where: {
      pharmacyProducts: {
        some: {
          stock: { gt: 0 },
        },
      },
    },
    select: {
      name: true,
      categories: {
        select: {
          name: true,
        },
      },
      pharmacyProducts: {
        where: {
          stock: { gt: 0 },
        },
        select: {
          price: true,
          optionType: true,
          capacity: true,
        },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: [
      { importance: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit,
  });

  return products.map((p) => ({
    name: p.name ?? "",
    categories: p.categories.map((c) => c.name ?? "").filter(Boolean),
    capacity: p.pharmacyProducts[0]?.capacity ?? null,
    optionType: p.pharmacyProducts[0]?.optionType ?? null,
    price: p.pharmacyProducts[0]?.price ?? null,
  }));
}

type ChatProductOption = {
  price: number;
  optionType: string | null;
  capacity: string | null;
  sevenDayPrice: number;
  priceMode: "exact7d" | "converted";
};

export type ChatProductCatalogItem = {
  category: string;
  products: Array<{
    name: string;
    optionType: string | null;
    capacity: string | null;
    sevenDayPrice: number;
    priceMode: "exact7d" | "converted";
    basePrice: number;
  }>;
};

function extractPositivePrice(value: unknown) {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function extractDayCount(text: string | null | undefined) {
  if (!text) return null;
  const direct = text.match(/(\d+(?:\.\d+)?)\s*일/);
  if (direct) {
    const parsed = Number.parseFloat(direct[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const packageLike = text.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|회|개)/);
  if (packageLike) {
    const parsed = Number.parseFloat(packageLike[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) return parsed;
  }

  return null;
}

function isExact7DayOption(optionType: string | null, capacity: string | null) {
  const option = optionType || "";
  const cap = capacity || "";
  if (/7\s*일/.test(option) || /7\s*일/.test(cap)) return true;
  const optionDays = extractDayCount(option);
  if (optionDays === 7) return true;
  const capacityDays = extractDayCount(cap);
  if (capacityDays === 7) return true;
  return false;
}

function pickChatOption(
  options: Array<{ price: number | null; optionType: string | null; capacity: string | null }>
): ChatProductOption | null {
  const usable = options
    .map((option) => ({
      price: extractPositivePrice(option.price),
      optionType: option.optionType ?? null,
      capacity: option.capacity ?? null,
    }))
    .filter((option): option is { price: number; optionType: string | null; capacity: string | null } => option.price != null);

  if (usable.length === 0) return null;

  const exact = usable
    .filter((option) => isExact7DayOption(option.optionType, option.capacity))
    .sort((left, right) => left.price - right.price)[0];

  if (exact) {
    return {
      price: exact.price,
      optionType: exact.optionType,
      capacity: exact.capacity,
      sevenDayPrice: exact.price,
      priceMode: "exact7d",
    };
  }

  const convertedCandidates: ChatProductOption[] = [];
  for (const option of usable) {
    const days =
      extractDayCount(option.optionType) ??
      extractDayCount(option.capacity) ??
      null;
    if (!days) continue;
    convertedCandidates.push({
      price: option.price,
      optionType: option.optionType,
      capacity: option.capacity,
      sevenDayPrice: Math.max(1, Math.round((option.price / days) * 7)),
      priceMode: "converted",
    });
  }
  const converted =
    convertedCandidates.sort(
      (left, right) => left.sevenDayPrice - right.sevenDayPrice
    )[0] || null;

  if (converted) return converted;

  const fallback = [...usable].sort((left, right) => left.price - right.price)[0];
  return {
    price: fallback.price,
    optionType: fallback.optionType,
    capacity: fallback.capacity,
    sevenDayPrice: fallback.price,
    priceMode: "converted",
  };
}

export async function getChatProductCatalog(): Promise<ChatProductCatalogItem[]> {
  const products = await db.product.findMany({
    where: {
      pharmacyProducts: {
        some: {
          stock: { gt: 0 },
        },
      },
    },
    select: {
      name: true,
      categories: {
        select: {
          name: true,
        },
      },
      pharmacyProducts: {
        where: {
          stock: { gt: 0 },
        },
        select: {
          price: true,
          optionType: true,
          capacity: true,
        },
        orderBy: { price: "asc" },
        take: 12,
      },
    },
    orderBy: [
      { importance: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const byCategory = new Map<
    string,
    Array<{
      name: string;
      optionType: string | null;
      capacity: string | null;
      sevenDayPrice: number;
      priceMode: "exact7d" | "converted";
      basePrice: number;
    }>
  >();

  for (const product of products) {
    const name = (product.name || "").trim();
    if (!name) continue;

    const picked = pickChatOption(product.pharmacyProducts);
    if (!picked) continue;

    const categories = product.categories
      .map((category) => (category?.name || "").trim())
      .filter(Boolean);
    if (categories.length === 0) continue;

    for (const category of categories) {
      const bucket = byCategory.get(category) || [];
      bucket.push({
        name,
        optionType: picked.optionType,
        capacity: picked.capacity,
        sevenDayPrice: picked.sevenDayPrice,
        priceMode: picked.priceMode,
        basePrice: picked.price,
      });
      byCategory.set(category, bucket);
    }
  }

  const result = Array.from(byCategory.entries())
    .map(([category, items]) => {
      const byName = new Map<
        string,
        {
          name: string;
          optionType: string | null;
          capacity: string | null;
          sevenDayPrice: number;
          priceMode: "exact7d" | "converted";
          basePrice: number;
        }
      >();

      for (const item of items.sort((left, right) => left.sevenDayPrice - right.sevenDayPrice)) {
        const exists = byName.get(item.name);
        if (!exists || item.sevenDayPrice < exists.sevenDayPrice) {
          byName.set(item.name, item);
        }
      }

      return {
        category,
        products: Array.from(byName.values()).slice(0, 4),
      };
    })
    .filter((item) => item.products.length > 0)
    .sort((left, right) => left.category.localeCompare(right.category, "ko"));

  return result;
}

export async function getProductsForAdmin() {
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
      importance: true,
      categories: true,
    },
    orderBy: [
      { importance: "desc" },
      { updatedAt: "desc" },
    ],
  });
  return products;
}

export async function createProduct(data: {
  name: string;
  images: string[];
  description: string;
  categories: { id: number; name?: string }[];
}) {
  const formatRelation = (relation: any[] = []) =>
    relation.map((item) => ({ id: item.id }));
  const newProduct = await db.product.create({
    data: {
      name: data.name || null,
      images: data.images || [],
      description: data.description || null,
      categories: {
        connect: formatRelation(data.categories),
      },
    },
  });

  return newProduct;
}

export async function updateProduct(
  productid: number,
  data: {
    name?: string;
    images?: string[];
    description?: string;
    categories?: { id: number; name?: string }[];
  }
) {
  const formatRelation = (relation: any[] = []) =>
    relation.map((item) => ({ id: item.id }));
  const updatedProduct = await db.product.update({
    where: { id: productid },
    data: {
      name: data.name ?? undefined,
      images: data.images ?? undefined,
      description: data.description ?? undefined,
      categories: data.categories
        ? {
            set: [],
            connect: formatRelation(data.categories),
          }
        : undefined,
    },
  });
  return updatedProduct;
}

export async function deleteProduct(productId: number) {
  const relatedPharmacyProducts = await db.pharmacyProduct.findMany({
    where: {
      productId,
    },
  });
  if (relatedPharmacyProducts.length > 0) return null;
  const deletedProduct = await db.product.delete({
    where: { id: productId },
  });
  return deletedProduct;
}

export async function getProductsByPharmacy(pharmacyId: number) {
  return await db.product.findMany({
    where: {
      pharmacyProducts: {
        some: {
          pharmacyId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      images: true,
    },
  });
}
