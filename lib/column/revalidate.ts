import { revalidatePath, revalidateTag } from "next/cache";

export const COLUMN_PUBLIC_CACHE_TAG = "column-published-columns";

export function revalidateColumnPublicPaths() {
  revalidateTag(COLUMN_PUBLIC_CACHE_TAG);
  revalidatePath("/column");
  revalidatePath("/column/rss.xml");
  revalidatePath("/sitemap.xml");
}
