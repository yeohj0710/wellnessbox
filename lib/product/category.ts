"use server";

import db from "@/lib/db";

export async function getCategories() {
  const categories = await db.category.findMany({
    select: {
      id: true,
      name: true,
      image: true,
    },
    orderBy: { id: "asc" },
  });
  return categories;
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
  const relatedProducts = await db.product.findMany({
    where: {
      categories: {
        some: { id: categoryId },
      },
    },
  });
  if (relatedProducts.length > 0) return null;
  const deletedCategory = await db.category.delete({
    where: { id: categoryId },
  });
  return deletedCategory;
}
