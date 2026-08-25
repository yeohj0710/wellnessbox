/**
 * 시험용으로 넣은 PRO 응답을 지운다. participantToken 이 selftest 로 시작하는 행만
 * 지운다. 실제 참여자 토큰은 무작위 base64url 이라 이 접두어가 나올 수 없다.
 *
 *   npx tsx scripts/probe-pro-table.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const before = await db.proOutcomeResponse.count();
  const removed = await db.proOutcomeResponse.deleteMany({
    where: { participantToken: { startsWith: "selftest" } },
  });
  const after = await db.proOutcomeResponse.count();
  console.log(
    JSON.stringify(
      { before, removed: removed.count, after, remaining_is_real: after },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
