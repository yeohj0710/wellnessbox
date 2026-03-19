import { PrismaClient } from "@prisma/client";
import { PRODUCT_DETAIL_FACTS_CATALOG } from "../../lib/product/product-detail-facts-catalog";

const db = new PrismaClient();

async function main() {
  let updatedCount = 0;

  for (const entry of PRODUCT_DETAIL_FACTS_CATALOG) {
    const existing = await db.product.findUnique({
      where: { id: entry.id },
      select: { id: true, name: true },
    });

    if (!existing) {
      console.warn(`[skip] product ${entry.id} not found`);
      continue;
    }

    await db.product.update({
      where: { id: entry.id },
      data: {
        detailFacts: entry.facts,
      },
    });

    updatedCount += 1;
    console.log(`[updated] ${entry.id} ${existing.name || entry.name}`);
  }

  console.log(`[done] updated ${updatedCount} products`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
