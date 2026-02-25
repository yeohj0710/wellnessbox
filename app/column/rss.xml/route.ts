import { SITE_URL } from "@/lib/constants";
import { getAllColumnSummaries } from "../_lib/columns";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const columns = await getAllColumnSummaries();
  const latest = columns[0];
  const items = columns
    .map((column) => {
      const url = `${SITE_URL}/column/${column.slug}`;
      return [
        "<item>",
        `<title>${escapeXml(column.title)}</title>`,
        `<link>${url}</link>`,
        `<guid>${url}</guid>`,
        `<description>${escapeXml(column.description)}</description>`,
        `<pubDate>${new Date(column.publishedAt).toUTCString()}</pubDate>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>웰니스박스 칼럼</title>
    <link>${SITE_URL}/column</link>
    <description>웰니스박스 건강 칼럼 RSS 피드</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date(
      latest?.updatedAt ?? Date.now()
    ).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
