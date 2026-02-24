"use server";

import db from "@/lib/db";

function mapRelationIds(relation: Array<{ id: number }> = []) {
  return relation.map((item) => ({ id: item.id }));
}

export async function getProductsForAdmin() {
  return db.product.findMany({
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
}

export async function createProduct(data: {
  name: string;
  images: string[];
  description: string;
  categories: { id: number; name?: string }[];
}) {
  return db.product.create({
    data: {
      name: data.name || null,
      images: data.images || [],
      description: data.description || null,
      categories: {
        connect: mapRelationIds(data.categories),
      },
    },
  });
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
  return db.product.update({
    where: { id: productid },
    data: {
      name: data.name ?? undefined,
      images: data.images ?? undefined,
      description: data.description ?? undefined,
      categories: data.categories
        ? {
            set: [],
            connect: mapRelationIds(data.categories),
          }
        : undefined,
    },
  });
}

export async function deleteProduct(productId: number) {
  const relatedPharmacyProducts = await db.pharmacyProduct.findMany({
    where: {
      productId,
    },
  });
  if (relatedPharmacyProducts.length > 0) return null;

  return db.product.delete({
    where: { id: productId },
  });
}

export async function getProductsByPharmacy(pharmacyId: number) {
  return db.product.findMany({
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
