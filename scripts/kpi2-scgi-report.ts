/**
 * KPI-2 (효과 개선도, SCGI) 집계.
 *
 * 계획서 통과 조건은 복용 전후 유효 쌍 100개 이상, 평균 0pp 초과다.
 * 3차년도에 재는 지표지만 표본은 지금부터 쌓아야 해서, 얼마나 모였는지
 * 언제든 볼 수 있게 해 둔다.
 *
 *   npx tsx scripts/kpi2-scgi-report.ts
 *   npx tsx scripts/kpi2-scgi-report.ts --selftest   (DB 없이 계산식만 확인)
 *
 * 제외한 응답은 조용히 빼지 않고 이유와 함께 센다.
 */

import { PrismaClient } from "@prisma/client";
import {
  KPI2_MINIMUM_PAIR_COUNT,
  computeScgi,
  standardNormalCdf,
  type ProPair,
} from "../lib/server/pro-outcome-scoring";

/** 후속 응답이 이만큼도 안 되면 복용했다고 보기 어렵다. */
const MIN_DAYS_TAKEN = 7;
const MIN_ADHERENCE_PERCENT = 50;
/**
 * 자기보고 복용 일수와 실제 접수 간격이 이만큼 넘게 어긋나면 뺀다.
 * 두 응답을 같은 날 내면서 14일 복용했다고 적으면 복용 전 점수가 기억이 된다.
 * 하루치는 봐준다. 아침에 못 낸 복용 전 설문을 저녁에 같이 내는 식은 정상이다.
 */
const MAX_SELF_REPORT_GAP_DAYS = 1;

function selftest(): number {
  const failures: string[] = [];

  const check = (label: string, actual: number, expected: number, tol: number) => {
    if (Math.abs(actual - expected) > tol) {
      failures.push(`${label}: ${actual} != ${expected}`);
    }
  };

  // Φ 의 알려진 값으로 근사가 살아 있는지 본다.
  check("Φ(0)", standardNormalCdf(0), 0.5, 1e-7);
  check("Φ(1)", standardNormalCdf(1), 0.8413447, 1e-6);
  check("Φ(-1)", standardNormalCdf(-1), 0.1586553, 1e-6);
  check("Φ(1.96)", standardNormalCdf(1.96), 0.9750021, 1e-6);

  // 아무도 변하지 않으면 개선도는 정확히 0 이어야 한다.
  const flat = computeScgi([
    { participantToken: "a".repeat(16), goalKey: "sleep", preScore: 3, postScore: 3 },
    { participantToken: "b".repeat(16), goalKey: "sleep", preScore: 6, postScore: 6 },
    { participantToken: "c".repeat(16), goalKey: "sleep", preScore: 9, postScore: 9 },
  ]);
  check("변화 없음", flat.meanPercentilePointChange, 0, 1e-9);

  // 모두 좋아지면 양수여야 한다. 시점별로 표준화하면 여기서 0 이 나온다.
  const improved = computeScgi([
    { participantToken: "a".repeat(16), goalKey: "sleep", preScore: 3, postScore: 5 },
    { participantToken: "b".repeat(16), goalKey: "sleep", preScore: 6, postScore: 8 },
    { participantToken: "c".repeat(16), goalKey: "sleep", preScore: 9, postScore: 10 },
  ]);
  if (!(improved.meanPercentilePointChange > 0)) {
    failures.push(
      `전원 호전인데 개선도가 양수가 아니다: ${improved.meanPercentilePointChange}`
    );
  }

  // 표본이 100쌍 미만이면 평균이 양수여도 통과가 아니다.
  if (improved.targetMet) {
    failures.push("3쌍인데 통과로 나왔다");
  }

  // 퍼짐이 없으면 계산을 멈춰야 한다.
  try {
    computeScgi([
      { participantToken: "a".repeat(16), goalKey: "sleep", preScore: 5, postScore: 7 },
      { participantToken: "b".repeat(16), goalKey: "sleep", preScore: 5, postScore: 8 },
    ]);
    failures.push("복용 전 점수가 모두 같은데 계산이 통과했다");
  } catch {
    // 여기로 오는 것이 맞다.
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ status: "SELFTEST_FAILED", failures }, null, 2));
    return 1;
  }
  console.log(JSON.stringify({ status: "SELFTEST_PASSED" }, null, 2));
  return 0;
}

async function report(): Promise<number> {
  const db = new PrismaClient();
  try {
    const responses = await db.proOutcomeResponse.findMany({
      where: { researchConsented: true, excludedReason: null },
      select: {
        participantToken: true,
        phase: true,
        goalKey: true,
        goalScore: true,
        daysTaken: true,
        adherencePercent: true,
        submittedAt: true,
      },
    });

    const byToken = new Map<
      string,
      { baseline?: (typeof responses)[number]; followup?: (typeof responses)[number] }
    >();
    for (const row of responses) {
      const entry = byToken.get(row.participantToken) ?? {};
      if (row.phase === "BASELINE") entry.baseline = row;
      else entry.followup = row;
      byToken.set(row.participantToken, entry);
    }

    const pairs: ProPair[] = [];
    const excluded = {
      baselineOnly: 0,
      followupOnly: 0,
      goalChanged: 0,
      tooFewDays: 0,
      lowAdherence: 0,
      selfReportExceedsElapsed: 0,
    };

    for (const [token, entry] of byToken) {
      if (!entry.followup) {
        excluded.baselineOnly += 1;
        continue;
      }
      if (!entry.baseline) {
        excluded.followupOnly += 1;
        continue;
      }
      // 목표가 바뀌면 같은 자로 잰 것이 아니다.
      if (entry.baseline.goalKey !== entry.followup.goalKey) {
        excluded.goalChanged += 1;
        continue;
      }
      if ((entry.followup.daysTaken ?? 0) < MIN_DAYS_TAKEN) {
        excluded.tooFewDays += 1;
        continue;
      }
      if ((entry.followup.adherencePercent ?? 0) < MIN_ADHERENCE_PERCENT) {
        excluded.lowAdherence += 1;
        continue;
      }
      // 적어 낸 복용 일수가 실제 접수 간격보다 길면 복용 전 점수가 잰 값이 아니라 기억이다.
      const elapsedDays =
        (entry.followup.submittedAt.getTime() - entry.baseline.submittedAt.getTime()) /
        86_400_000;
      if ((entry.followup.daysTaken ?? 0) - elapsedDays > MAX_SELF_REPORT_GAP_DAYS) {
        excluded.selfReportExceedsElapsed += 1;
        continue;
      }
      pairs.push({
        participantToken: token,
        goalKey: entry.baseline.goalKey,
        preScore: entry.baseline.goalScore,
        postScore: entry.followup.goalScore,
      });
    }

    const base = {
      schema_version: "kpi2_scgi_report_v1",
      indicator_id: "KPI-2",
      minimum_pair_count: KPI2_MINIMUM_PAIR_COUNT,
      response_count: responses.length,
      participant_count: byToken.size,
      valid_pair_count: pairs.length,
      excluded,
      note:
        "실사용자 응답만 센다. 합성 자료는 이 경로로 들어오지 않는다. " +
        "표준화 기준 분포는 복용 전 점수 하나로 통일한다.",
    };

    // 아직 쌓는 중이면 계산을 억지로 돌리지 않는다. 몇 쌍인지만 알면 된다.
    if (pairs.length < 2) {
      console.log(
        JSON.stringify(
          { ...base, status: "COLLECTING", reason: "pairs_below_two" },
          null,
          2
        )
      );
      return 0;
    }

    const result = computeScgi(pairs);
    console.log(
      JSON.stringify(
        {
          ...base,
          mean_percentile_point_change: Number(
            result.meanPercentilePointChange.toFixed(6)
          ),
          reference_mean: Number(result.referenceMean.toFixed(6)),
          reference_std_dev: Number(result.referenceStdDev.toFixed(6)),
          meets_minimum_sample: result.meetsMinimumSample,
          mean_above_zero: result.meanAboveZero,
          target_met: result.targetMet,
          status: result.targetMet ? "READY" : "COLLECTING",
        },
        null,
        2
      )
    );
    return 0;
  } finally {
    await db.$disconnect();
  }
}

async function main(): Promise<number> {
  // 계산식이 깨진 채로 숫자를 뽑으면 그 숫자가 더 위험하다. 늘 먼저 확인한다.
  const selftestCode = selftest();
  if (selftestCode !== 0) return selftestCode;
  if (process.argv.includes("--selftest")) return 0;
  return report();
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
