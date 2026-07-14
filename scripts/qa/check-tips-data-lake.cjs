const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  const session = await db.tipsLabSession.create({
    data: { state: "NEW", profile: { goal: "storage_smoke" }, consentScopes: [] },
  });
  try {
    await db.tipsLabEvent.create({
      data: {
        sessionId: session.id,
        sequence: 1,
        action: "initialize",
        previousState: "NEW",
        nextState: "NEW",
        input: { smoke: true },
        output: { ok: true },
        postconditionsMet: true,
      },
    });
    const stored = await db.tipsLabSession.findUnique({
      where: { id: session.id },
      include: { events: true },
    });
    if (!stored || stored.events.length !== 1 || stored.events[0].sequence !== 1) {
      throw new Error("tips_data_lake_round_trip_failed");
    }
    console.log(JSON.stringify({ ok: true, sessionStored: true, eventCount: 1 }));
  } finally {
    await db.tipsLabSession.delete({ where: { id: session.id } });
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
