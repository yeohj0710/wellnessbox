import { revalidatePath } from "next/cache";

export function revalidateColumnPublicPaths() {
  revalidatePath("/column");
  revalidatePath("/column/rss.xml");
  revalidatePath("/sitemap.xml");
}
