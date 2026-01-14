import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const appUsers = await prisma.appUser.findMany({
    where: { clientId: { not: null } },
    select: { id: true, clientId: true, createdAt: true, updatedAt: true },
  });

  const byClientId = new Map<string, typeof appUsers>();
  for (const user of appUsers) {
    if (!user.clientId) continue;
    const list = byClientId.get(user.clientId) ?? [];
    list.push(user);
    byClientId.set(user.clientId, list);
  }

  let assessUpdated = 0;
  let checkAiUpdated = 0;
  let conflictCount = 0;
  let skippedCount = 0;

  for (const [clientId, users] of byClientId.entries()) {
    if (users.length > 1) {
      conflictCount += 1;
      skippedCount += users.length;
      console.warn(
        `[conflict] clientId ${clientId} has ${users.length} app users; skipping backfill`
      );
      continue;
    }
    const user = users[0];
    if (dryRun) {
      console.log(`[dry-run] would backfill clientId ${clientId} -> appUserId ${user.id}`);
      continue;
    }
    const [assess, checkAi] = await Promise.all([
      prisma.assessmentResult.updateMany({
        where: { clientId, appUserId: null },
        data: { appUserId: user.id },
      }),
      prisma.checkAiResult.updateMany({
        where: { clientId, appUserId: null },
        data: { appUserId: user.id },
      }),
    ]);
    assessUpdated += assess.count;
    checkAiUpdated += checkAi.count;
  }

  console.log(
    [
      "Backfill complete.",
      `Dry run: ${dryRun ? "yes" : "no"}`,
      `App users scanned: ${appUsers.length}`,
      `Unique clientIds scanned: ${byClientId.size}`,
      `Conflict clientIds skipped: ${conflictCount}`,
      `App users skipped due to conflicts: ${skippedCount}`,
      `Assessment results updated: ${assessUpdated}`,
      `Check-AI results updated: ${checkAiUpdated}`,
    ].join("\n")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
