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
