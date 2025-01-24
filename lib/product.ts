"use server";

import db from "@/lib/db";

export async function getProducts() {
  const products = await db.product_.findMany({
    where: {
      pharmacyProducts: {
        some: {
          stock: {
            gt: 0,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      images: true,
      description: true,
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
    orderBy: {
      id: "asc",
    },
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
  const newProduct = await db.product_.create({
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
  const updatedProduct = await db.product_.update({
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
  const relatedPharmacyProducts = await db.pharmacyProduct_.findMany({
    where: {
      productId,
    },
  });
  if (relatedPharmacyProducts.length > 0) return null;
  const deletedProduct = await db.product_.delete({
    where: { id: productId },
  });
  return deletedProduct;
}

export async function getPharmacies() {
  return await db.pharmacy_.findMany({
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getProductsByPharmacy(pharmacyId: number) {
  return await db.product_.findMany({
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
