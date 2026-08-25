/**
 * KPI-2 참여 링크 만들기.
 *
 * 복용 전 링크와 2주 뒤 링크는 같은 번호(participantToken)를 쓴다. 그래야 두 답이
 * 짝이 된다. 번호는 무작위이고 사람을 가리키지 않는다.
 *
 *   npx tsx scripts/kpi2-make-participant-links.ts --count 20
 *   npx tsx scripts/kpi2-make-participant-links.ts --count 20 --csv > links.csv
 *
 * 이 스크립트는 아무것도 보내지 않는다. 링크만 만든다. 누구에게 어떻게 보낼지는
 * 사람이 정한다.
 */

import { randomBytes } from "node:crypto";

const BASE_URL = process.env.KPI2_SURVEY_BASE_URL ?? "https://wellnessbox.kr";

function parseCount(): number {
  const index = process.argv.indexOf("--count");
  if (index === -1) return 10;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 2000) {
    throw new Error("count_must_be_between_1_and_2000");
  }
  return value;
}

function makeToken(): string {
  // 24바이트를 base64url 로 적으면 32자다. 라우트가 요구하는 16자를 넉넉히 넘는다.
  return randomBytes(24).toString("base64url");
}

function main() {
  const count = parseCount();
  const asCsv = process.argv.includes("--csv");
  const rows = Array.from({ length: count }, () => {
    const token = makeToken();
    return {
      token,
      baseline: `${BASE_URL}/survey/effect?t=${token}`,
      followup: `${BASE_URL}/survey/effect?t=${token}&phase=followup`,
    };
  });

  if (asCsv) {
    console.log("token,baseline_url,followup_url");
    for (const row of rows) {
      console.log(`${row.token},${row.baseline},${row.followup}`);
    }
    return;
  }
  console.log(
    JSON.stringify(
      {
        schema_version: "kpi2_participant_links_v1",
        count,
        base_url: BASE_URL,
        note:
          "복용 전 링크를 먼저 보내고, 2주 뒤에 같은 번호의 followup 링크를 보낸다. " +
          "번호가 다르면 짝이 지어지지 않는다.",
        links: rows,
      },
      null,
      2
    )
  );
}

main();
