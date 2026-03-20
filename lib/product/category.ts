"use server";

import db from "@/lib/db";

const CATEGORY_SELECT = {
  id: true,
  name: true,
  image: true,
  importance: true,
  updatedAt: true,
  _count: {
    select: {
      products: true,
    },
  },
};

const CATEGORY_ORDER_BY = [{ importance: "desc" as const }, { updatedAt: "desc" as const }];

async function readCategories() {
  return db.category.findMany({
    select: CATEGORY_SELECT,
    orderBy: CATEGORY_ORDER_BY,
  });
}

export async function getCategories() {
  return readCategories();
}

export async function getCategoriesByUpdatedAt() {
  return readCategories();
}

export async function createCategory(data: { name: string; image?: string }) {
  const newCategory = await db.category.create({
    data: {
      name: data.name,
      image: data.image || null,
    },
  });
  return newCategory;
}

export async function updateCategory(
  categoryid: number,
  data: { name: string; image?: string }
) {
  const updatedCategory = await db.category.update({
    where: { id: categoryid },
    data: {
      name: data.name,
      image: data.image || null,
    },
  });
  return updatedCategory;
}

export async function deleteCategory(categoryId: number) {
  const relatedProduct = await db.product.findFirst({
    where: {
      categories: {
        some: { id: categoryId },
      },
    },
    select: { id: true },
  });
  if (relatedProduct) return null;
  const deletedCategory = await db.category.delete({
    where: { id: categoryId },
  });
  return deletedCategory;
}
