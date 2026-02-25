import { MetadataRoute } from "next";
import { getAllColumnSummaries, getAllColumnTags } from "@/app/column/_lib/columns";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://wellnessbox.me";
  const baseEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/explore`, lastModified: new Date() },
    { url: `${baseUrl}/check-ai`, lastModified: new Date() },
    { url: `${baseUrl}/assess`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/about/terms`, lastModified: new Date() },
    { url: `${baseUrl}/about/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/about/contact`, lastModified: new Date() },
  ];

  const [columnSummaries, columnTags] = await Promise.all([
    getAllColumnSummaries(),
    getAllColumnTags(),
  ]);
  const detailEntries: MetadataRoute.Sitemap = columnSummaries.map((column) => ({
    url: `${baseUrl}/column/${column.slug}`,
    lastModified: new Date(column.updatedAt || column.publishedAt),
  }));
  const tagEntries: MetadataRoute.Sitemap = columnTags.map((tag) => ({
    url: `${baseUrl}/column/tag/${tag.slug}`,
    lastModified: new Date(),
  }));

  const latestColumnDate = detailEntries[0]?.lastModified ?? new Date();

  return [
    ...baseEntries,
    { url: `${baseUrl}/column`, lastModified: latestColumnDate },
    { url: `${baseUrl}/column/rss.xml`, lastModified: latestColumnDate },
    ...detailEntries,
    ...tagEntries,
  ];
}
