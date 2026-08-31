/**
 * 시험 삼아 넣은 KPI-2 응답을 지운다.
 *
 * 화면이 도는지 보려고 직접 답해 본 것은 연구 표본이 아니다. 남겨 두면 분모에
 * 섞이고, 나중에 어느 것이 시험이었는지 알 수 없게 된다.
 *
 *   npx tsx scripts/kpi2-delete-test-rows.ts --token TEST-...
 *   npx tsx scripts/kpi2-delete-test-rows.ts --token TEST-... --apply
 *
 * 기본은 무엇이 지워질지 보여 주기만 한다. 실제로 지우려면 --apply 를 붙인다.
 * 토큰을 정확히 대야 한다. 접두사만으로 지우면 실수로 실제 응답을 날릴 수 있다.
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const index = process.argv.indexOf("--token");
  const token = index === -1 ? "" : (process.argv[index + 1] ?? "");
  if (!token) {
    throw new Error("--token <토큰> 이 필요합니다.");
  }
  const apply = process.argv.includes("--apply");

  const db = new PrismaClient();
  try {
    const rows = await db.proOutcomeResponse.findMany({
      where: { participantToken: token },
      select: { id: true, phase: true, goalKey: true, submittedAt: true },
    });
    if (rows.length === 0) {
      console.log(JSON.stringify({ token, found: 0, status: "NOTHING_TO_DELETE" }, null, 2));
      return;
    }
    if (!apply) {
      console.log(
        JSON.stringify({ token, found: rows.length, rows, status: "DRY_RUN" }, null, 2)
      );
      console.log("\n실제로 지우려면 --apply 를 붙이세요.");
      return;
    }
    const result = await db.proOutcomeResponse.deleteMany({
      where: { participantToken: token },
    });
    console.log(JSON.stringify({ token, deleted: result.count, status: "DELETED" }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
