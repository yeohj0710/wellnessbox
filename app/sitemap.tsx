import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://wellnessbox.me";
  return [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    { url: `${baseUrl}/about/terms`, lastModified: new Date() },
    { url: `${baseUrl}/about/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/about/contact`, lastModified: new Date() },
    { url: `${baseUrl}/my-orders`, lastModified: new Date() },
  ];
}
