"use server";

import db from "@/lib/db";

export async function getCategories() {
  const categories = await db.category_.findMany({
    select: {
      idx: true,
      name: true,
      image: true,
    },
  });
  return categories;
}

export async function createCategory(data: { name: string; image?: string }) {
  const newCategory = await db.category_.create({
    data: {
      name: data.name,
      image: data.image || null,
    },
  });
  return newCategory;
}

export async function updateCategory(
  categoryIdx: number,
  data: { name: string; image?: string }
) {
  const updatedCategory = await db.category_.update({
    where: { idx: categoryIdx },
    data: {
      name: data.name,
      image: data.image || null,
    },
  });
  return updatedCategory;
}

export async function deleteCategory(categoryIdx: number) {
  const relatedProducts = await db.product_.findMany({
    where: {
      categories: {
        some: { idx: categoryIdx },
      },
    },
  });
  if (relatedProducts.length > 0) {
    throw new Error("해당 카테고리에 포함된 상품을 먼저 삭제해야 합니다.");
  }
  const deletedCategory = await db.category_.delete({
    where: { idx: categoryIdx },
  });
  return deletedCategory;
}

export async function getProducts() {
  const products = await db.product_.findMany({
    select: {
      idx: true,
      name: true,
      images: true,
      description: true,
      price: true,
      categories: {
        select: {
          idx: true,
          name: true,
        },
      },
      pharmacies: {
        select: {
          idx: true,
          name: true,
        },
      },
    },
    orderBy: {
      idx: "asc",
    },
  });
  const sortedProducts = products.sort((a, b) => {
    const getPriority = (description: string | null | undefined) => {
      if (description?.includes("7일")) return 1;
      if (description?.includes("30일")) return 2;
      return 3;
    };
    const priorityA = getPriority(a.description);
    const priorityB = getPriority(b.description);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.idx - b.idx;
  });
  return sortedProducts;
}

export async function createProduct(data: {
  name: string;
  images: string[];
  description: string;
  price: number;
  categories: { idx: number; name?: string }[];
  pharmacies: { idx: number; name?: string }[];
}) {
  const formatRelation = (relation: any[]) =>
    relation.map((item) => ({ idx: item.idx }));
  const newProduct = await db.product_.create({
    data: {
      name: data.name,
      images: data.images || [],
      description: data.description || "",
      price: data.price || 0,
      categories: {
        connect: formatRelation(data.categories),
      },
      pharmacies: {
        connect: formatRelation(data.pharmacies),
      },
    },
  });
  return newProduct;
}

export async function updateProduct(
  productIdx: number,
  data: {
    name: string;
    images: string[];
    description: string;
    price: number;
    categories: { idx: number; name: string }[];
    pharmacies: { idx: number; name: string }[];
  }
) {
  const updatedProduct = await db.product_.update({
    where: { idx: productIdx },
    data: {
      name: data.name,
      images: data.images || [],
      description: data.description || "",
      price: data.price || 0,
      categories: {
        set: [],
        connect: data.categories.map((category) => ({ idx: category.idx })),
      },
      pharmacies: {
        set: [],
        connect: data.pharmacies.map((pharmacy) => ({ idx: pharmacy.idx })),
      },
    },
  });
  return updatedProduct;
}

export async function deleteProduct(productIdx: number) {
  const deletedProduct = await db.product_.delete({
    where: { idx: productIdx },
  });
  return deletedProduct;
}

export async function getPharmacies() {
  return await db.pharmacy_.findMany({
    select: {
      idx: true,
      name: true,
    },
  });
}
