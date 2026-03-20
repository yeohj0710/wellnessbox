import { MetadataRoute } from "next";
import { getAllColumnSummaries } from "@/app/column/_lib/columns";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/check-ai`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/check-ai`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/assess`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${baseUrl}/about/contact`,
      changeFrequency: "monthly",
      priority: 0.55,
    },
  ];

  const columnSummaries = await getAllColumnSummaries().catch((error) => {
    console.error("[sitemap] failed to load column summaries", error);
    return [];
  });
  const detailEntries: MetadataRoute.Sitemap = columnSummaries.map((column) => ({
    url: `${baseUrl}/column/${column.slug}`,
    lastModified: new Date(column.updatedAt || column.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const latestColumnDate = detailEntries[0]?.lastModified ?? new Date();

  return [
    ...baseEntries,
    {
      url: `${baseUrl}/column`,
      lastModified: latestColumnDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...detailEntries,
  ];
}
