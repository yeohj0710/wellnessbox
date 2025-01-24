"use server";

import db from "@/lib/db";

export async function getCategories() {
  const categories = await db.category_.findMany({
    select: {
      id: true,
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
  categoryid: number,
  data: { name: string; image?: string }
) {
  const updatedCategory = await db.category_.update({
    where: { id: categoryid },
    data: {
      name: data.name,
      image: data.image || null,
    },
  });
  return updatedCategory;
}

export async function deleteCategory(categoryid: number) {
  const relatedProducts = await db.product_.findMany({
    where: {
      categories: {
        some: { id: categoryid },
      },
    },
  });
  if (relatedProducts.length > 0) return null;
  const deletedCategory = await db.category_.delete({
    where: { id: categoryid },
  });
  return deletedCategory;
}
