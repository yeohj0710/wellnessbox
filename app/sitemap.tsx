import { MetadataRoute } from "next";
import { getAllColumnSummaries, getAllColumnTags } from "@/app/column/_lib/columns";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/check-ai`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/check-ai`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/assess`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/health-link`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/employee-report`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/about/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/about/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/about/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const [columnSummaries, columnTags] = await Promise.all([
    getAllColumnSummaries(),
    getAllColumnTags(),
  ]);
  const detailEntries: MetadataRoute.Sitemap = columnSummaries.map((column) => ({
    url: `${baseUrl}/column/${column.slug}`,
    lastModified: new Date(column.updatedAt || column.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const tagEntries: MetadataRoute.Sitemap = columnTags.map((tag) => ({
    url: `${baseUrl}/column/tag/${tag.slug}`,
    lastModified: detailEntries[0]?.lastModified ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.5,
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
    {
      url: `${baseUrl}/column/rss.xml`,
      lastModified: latestColumnDate,
      changeFrequency: "weekly",
      priority: 0.2,
    },
    ...detailEntries,
    ...tagEntries,
  ];
}
