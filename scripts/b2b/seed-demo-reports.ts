(async function run() {
  const { seedB2bDemoData } = require("../../lib/b2b/demo-seed") as typeof import("../../lib/b2b/demo-seed");
  const db = (require("../../lib/db") as typeof import("../../lib/db")).default;

  const result = await seedB2bDemoData();

  console.log(
    `[b2b] demo seed complete employees=${result.employeeIds.length} periods=${result.periods.join(",")}`
  );
  console.log(`[b2b] employeeIds=${result.employeeIds.join(",")}`);

  await db.$disconnect();
})().catch(async (error) => {
  const db = (require("../../lib/db") as typeof import("../../lib/db")).default;
  console.error("[b2b] failed to seed demo reports", error);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
