"use server";

import db from "@/lib/db";

export async function getPharmacyProducts() {
  return await db.pharmacyProduct_.findMany({
    select: {
      id: true,
      optionType: true,
      price: true,
      stock: true,
      createdAt: true,
      updatedAt: true,
      pharmacy: {
        select: {
          id: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getPharmacyProduct(
  productId: number,
  optionType: string
) {
  return await db.pharmacyProduct_.findFirst({
    where: {
      productId,
      optionType,
    },
    select: {
      id: true,
      optionType: true,
      price: true,
      stock: true,
      createdAt: true,
      updatedAt: true,
      pharmacy: {
        select: {
          id: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
  });
}

export async function createPharmacyProduct(data: {
  optionType?: string;
  price?: number;
  stock?: number;
  pharmacyId: number;
  productId: number;
}) {
  return await db.pharmacyProduct_.create({
    data: {
      optionType: data.optionType || null,
      price: data.price || null,
      stock: data.stock || null,
      pharmacy: {
        connect: {
          id: data.pharmacyId,
        },
      },
      product: {
        connect: {
          id: data.productId,
        },
      },
    },
  });
}

export async function updatePharmacyProduct(
  id: number,
  data: {
    optionType?: string;
    price?: number;
    stock?: number;
    pharmacyId?: number;
    productId?: number;
  }
) {
  return await db.pharmacyProduct_.update({
    where: { id },
    data: {
      optionType: data.optionType ?? undefined,
      price: data.price ?? undefined,
      stock: data.stock ?? undefined,
      pharmacy: data.pharmacyId
        ? {
            connect: { id: data.pharmacyId },
          }
        : undefined,
      product: data.productId
        ? {
            connect: { id: data.productId },
          }
        : undefined,
    },
  });
}

export async function deletePharmacyProduct(id: number) {
  return await db.pharmacyProduct_.delete({
    where: { id },
  });
}
