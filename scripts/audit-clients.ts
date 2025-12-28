import { PrismaClient } from "@prisma/client";
import { CLIENT_COOKIE_NAME } from "../lib/shared/client-id";

const prisma = new PrismaClient();

function formatDateKey(d: Date, granularity: "day" | "hour" = "day") {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  if (granularity === "hour") {
    const h = String(d.getUTCHours()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:00Z`;
  }
  return `${y}-${m}-${day}`;
}

async function main() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [recentClients, allClients] = await Promise.all([
    prisma.client.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true },
    }),
    prisma.client.findMany({
      select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true },
    }),
  ]);

  const dayCounts = new Map<string, number>();
  const hourCounts = new Map<string, number>();
  for (const c of recentClients) {
    const dayKey = formatDateKey(c.createdAt);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
    if (c.createdAt >= dayAgo) {
      const hourKey = formatDateKey(c.createdAt, "hour");
      hourCounts.set(hourKey, (hourCounts.get(hourKey) || 0) + 1);
    }
  }

  const uaTotals = new Map<string, { total: number; recent: number }>();
  for (const c of allClients) {
    const ua = c.userAgent || "<empty>";
    const bucket = uaTotals.get(ua) || { total: 0, recent: 0 };
    bucket.total += 1;
    if (c.createdAt >= weekAgo) bucket.recent += 1;
    uaTotals.set(ua, bucket);
  }
  const topUa = Array.from(uaTotals.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  const lengthBuckets = new Map<number, number>();
  for (const c of allClients) {
    const len = c.id.length;
    lengthBuckets.set(len, (lengthBuckets.get(len) || 0) + 1);
  }

  const shortLived = allClients.filter((c) => {
    if (!c.lastSeenAt) return true;
    return c.lastSeenAt.getTime() - c.createdAt.getTime() < 5 * 60 * 1000;
  }).length;

  const activeWithinWeek = allClients.filter((c) => c.lastSeenAt && c.lastSeenAt >= weekAgo).length;

  const [usersWithClient, userTotal] = await Promise.all([
    prisma.appUser.count({ where: { clientId: { not: null } } }),
    prisma.appUser.count(),
  ]);
  const [profileCount, clientCount] = await Promise.all([
    prisma.userProfile.count(),
    prisma.client.count(),
  ]);

  const summary = [
    "=== Client creation trend (last 7 days by UTC day) ===",
    ...Array.from(dayCounts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${k}: ${v}`),
    "",
    "=== Client creation trend (last 24h by UTC hour) ===",
    ...Array.from(hourCounts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${k}: ${v}`),
    "",
    "=== Top user agents (total | created in last 7d) ===",
    ...topUa.map(([ua, counts]) => `${counts.total} | ${counts.recent} :: ${ua}`),
    "",
    "=== Client ID length distribution ===",
    ...Array.from(lengthBuckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([len, cnt]) => `${len} chars: ${cnt}`),
    "",
    "=== Last seen patterns ===",
    `Total clients: ${allClients.length}`,
    `Short lived (<5m between createdAt and lastSeenAt): ${shortLived}`,
    `Active within last 7d: ${activeWithinWeek}`,
    "",
    "=== Cross-entity linkage ===",
    `AppUser linked to clientId: ${usersWithClient}/${userTotal} (${userTotal ? ((usersWithClient / userTotal) * 100).toFixed(1) : 0}% )`,
    `UserProfile rows vs Client rows: ${profileCount}/${clientCount}`,
    "",
    `Cookie name in use: ${CLIENT_COOKIE_NAME}`,
  ];

  console.log(summary.join("\n"));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
