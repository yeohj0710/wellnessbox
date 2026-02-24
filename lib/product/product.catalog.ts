"use server";

import db from "@/lib/db";
import {
  DEFAULT_PRODUCT_ORDER,
  IN_STOCK_PRODUCT_WHERE,
  PRODUCT_CARD_SELECT,
  withRatingDefaults,
} from "./product.shared";

async function findProductsForCards() {
  return db.product.findMany({
    where: IN_STOCK_PRODUCT_WHERE,
    select: PRODUCT_CARD_SELECT,
    orderBy: DEFAULT_PRODUCT_ORDER,
  });
}

export async function getProducts() {
  return withRatingDefaults(await findProductsForCards());
}

export async function getProductsByUpdatedAt() {
  return withRatingDefaults(await findProductsForCards());
}

export async function getProductsIdName() {
  return db.product.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProductSummaries(limit = 30) {
  const products = await db.product.findMany({
    where: IN_STOCK_PRODUCT_WHERE,
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
    orderBy: DEFAULT_PRODUCT_ORDER,
    take: limit,
  });

  return products.map((product) => ({
    name: product.name ?? "",
    categories: product.categories
      .map((category) => category.name ?? "")
      .filter(Boolean),
    capacity: product.pharmacyProducts[0]?.capacity ?? null,
    optionType: product.pharmacyProducts[0]?.optionType ?? null,
    price: product.pharmacyProducts[0]?.price ?? null,
  }));
}
