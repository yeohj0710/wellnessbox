/**
 * KPI-2 응답을 CSV 로 들여온다.
 *
 * 설문 화면 말고 다른 경로(카톡, 전화, 종이)로 받은 답을 넣기 위한 통로다.
 * 채널은 아무거나 써도 된다. 다만 **실제 사람이 실제로 답한 것**이어야 하고,
 * 최종평가에서 그것을 증빙할 수 있어야 한다. 이 스크립트는 형식만 지킨다.
 *
 *   npx tsx scripts/kpi2-import-responses.ts --file responses.csv
 *   npx tsx scripts/kpi2-import-responses.ts --file responses.csv --apply
 *   npx tsx scripts/kpi2-import-responses.ts --template > template.csv
 *
 * 기본은 검사만 하고 쓰지 않는다. 실제로 넣으려면 --apply 를 붙인다.
 * 한 줄이라도 형식이 틀리면 파일 전체를 거부한다. 절반만 들어가면 어디까지
 * 들어갔는지 알 수 없고, 그 상태에서 다시 돌리면 중복이 난다.
 */

import { readFileSync } from "node:fs";
import { PrismaClient, ProOutcomePhase } from "@prisma/client";
import {
  PRO_CONSENT_VERSION,
  PRO_GOAL_KEYS,
  PRO_MIN_DAYS_TAKEN,
  PRO_TOKEN_MAX_LENGTH,
  PRO_TOKEN_MIN_LENGTH,
} from "../lib/server/pro-outcome-constants";

const MIN_TOKEN_LENGTH = PRO_TOKEN_MIN_LENGTH;
const MAX_TOKEN_LENGTH = PRO_TOKEN_MAX_LENGTH;
const MIN_DAYS_TAKEN = PRO_MIN_DAYS_TAKEN;

const COLUMNS = [
  "token",
  "phase",
  "goal_key",
  "goal_score",
  "general_score",
  "sleep_score",
  "digestion_score",
  "energy_score",
  "days_taken",
  "adherence_percent",
  "consented",
  "collected_at",
  "channel",
  "note",
] as const;

type Row = Record<(typeof COLUMNS)[number], string>;

type Parsed = {
  line: number;
  token: string;
  phase: ProOutcomePhase;
  goalKey: string;
  goalScore: number;
  generalScore: number;
  sleepScore: number;
  digestionScore: number;
  energyScore: number;
  daysTaken: number | null;
  adherencePercent: number | null;
  submittedAt: Date;
  channel: string;
  note: string | null;
};

function template(): string {
  const example = [
    "AbCdEfGhIjKlMnOpQrStUvWx012345678",
    "BASELINE",
    "sleep",
    "3",
    "5",
    "3",
    "6",
    "4",
    "",
    "",
    "yes",
    "2026-09-02",
    "kakao",
    "",
  ];
  const example2 = [
    "AbCdEfGhIjKlMnOpQrStUvWx012345678",
    "FOLLOWUP",
    "sleep",
    "6",
    "7",
    "6",
    "7",
    "6",
    "14",
    "90",
    "yes",
    "2026-09-16",
    "kakao",
    "",
  ];
  return [COLUMNS.join(","), example.join(","), example2.join(",")].join("\n") + "\n";
}

/** 따옴표 없는 단순 CSV 만 받는다. 쉼표가 든 값은 note 뿐이라 마지막 칸으로 몰아 둔다. */
function splitCsvLine(line: string, expected: number): string[] {
  const parts = line.split(",");
  if (parts.length <= expected) return parts;
  return [...parts.slice(0, expected - 1), parts.slice(expected - 1).join(",")];
}

function score(value: string, label: string, line: number, errors: string[]): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10) {
    errors.push(`${line}행 ${label}: 0~10 정수여야 합니다 (받은 값 "${value}")`);
    return -1;
  }
  return n;
}

function parse(text: string, errors: string[]): Parsed[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    errors.push("머리글 말고 자료 줄이 없습니다.");
    return [];
  }
  const header = splitCsvLine(lines[0], COLUMNS.length).map((h) => h.trim());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    errors.push(`머리글에 빠진 칸: ${missing.join(", ")}`);
    return [];
  }
  const index = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;

  const rows: Parsed[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i += 1) {
    const line = i + 1;
    const cells = splitCsvLine(lines[i], COLUMNS.length);
    const get = (name: (typeof COLUMNS)[number]) => (cells[index[name]] ?? "").trim();
    const row = Object.fromEntries(COLUMNS.map((c) => [c, get(c)])) as Row;

    if (row.token.length < MIN_TOKEN_LENGTH || row.token.length > MAX_TOKEN_LENGTH) {
      errors.push(`${line}행 token: ${MIN_TOKEN_LENGTH}~${MAX_TOKEN_LENGTH}자여야 합니다`);
      continue;
    }
    if (row.phase !== "BASELINE" && row.phase !== "FOLLOWUP") {
      errors.push(`${line}행 phase: BASELINE 또는 FOLLOWUP 이어야 합니다 (받은 값 "${row.phase}")`);
      continue;
    }
    const key = `${row.token}::${row.phase}`;
    if (seen.has(key)) {
      errors.push(`${line}행: 파일 안에 같은 token+phase 가 두 번 있습니다`);
      continue;
    }
    seen.add(key);
    if (!(PRO_GOAL_KEYS as readonly string[]).includes(row.goal_key)) {
      errors.push(`${line}행 goal_key: ${PRO_GOAL_KEYS.join("/")} 중 하나여야 합니다`);
      continue;
    }
    // 동의가 없으면 저장하지 않는다. 받아 두고 나중에 빼는 방식은 쓰지 않는다.
    if (!["yes", "y", "true", "1"].includes(row.consented.toLowerCase())) {
      errors.push(`${line}행 consented: 연구 이용 동의가 없는 응답은 넣지 않습니다`);
      continue;
    }
    const collectedAt = new Date(row.collected_at);
    if (Number.isNaN(collectedAt.getTime())) {
      errors.push(`${line}행 collected_at: 날짜를 읽을 수 없습니다 (예: 2026-09-02)`);
      continue;
    }
    if (!row.channel) {
      errors.push(`${line}행 channel: 어떤 경로로 받았는지 적어야 합니다 (kakao, phone, paper 등)`);
      continue;
    }

    const goalScore = score(row.goal_score, "goal_score", line, errors);
    const generalScore = score(row.general_score, "general_score", line, errors);
    const sleepScore = score(row.sleep_score, "sleep_score", line, errors);
    const digestionScore = score(row.digestion_score, "digestion_score", line, errors);
    const energyScore = score(row.energy_score, "energy_score", line, errors);
    if ([goalScore, generalScore, sleepScore, digestionScore, energyScore].includes(-1)) continue;

    let daysTaken: number | null = null;
    let adherencePercent: number | null = null;
    if (row.phase === "FOLLOWUP") {
      const d = Number(row.days_taken);
      if (!Number.isInteger(d) || d < 0 || d > 365) {
        errors.push(`${line}행 days_taken: 후속 응답에는 0~365 정수가 필요합니다`);
        continue;
      }
      if (d < MIN_DAYS_TAKEN) {
        errors.push(
          `${line}행 days_taken: ${d}일은 ${MIN_DAYS_TAKEN}일 미만이라 집계에서 빠집니다. ` +
            `넣어도 되지만 유효 쌍이 되지 않습니다`
        );
      }
      const a = Number(row.adherence_percent);
      if (!Number.isInteger(a) || a < 0 || a > 100) {
        errors.push(`${line}행 adherence_percent: 후속 응답에는 0~100 정수가 필요합니다`);
        continue;
      }
      daysTaken = d;
      adherencePercent = a;
    }

    rows.push({
      line,
      token: row.token,
      phase: row.phase as ProOutcomePhase,
      goalKey: row.goal_key,
      goalScore,
      generalScore,
      sleepScore,
      digestionScore,
      energyScore,
      daysTaken,
      adherencePercent,
      submittedAt: collectedAt,
      channel: row.channel,
      note: row.note || null,
    });
  }
  return rows;
}

async function main() {
  if (process.argv.includes("--template")) {
    process.stdout.write(template());
    return;
  }
  const fileIndex = process.argv.indexOf("--file");
  if (fileIndex === -1 || !process.argv[fileIndex + 1]) {
    throw new Error("--file <경로> 가 필요합니다. 형식은 --template 으로 확인하세요.");
  }
  const path = process.argv[fileIndex + 1];
  const apply = process.argv.includes("--apply");

  const errors: string[] = [];
  const rows = parse(readFileSync(path, "utf8"), errors);

  const db = new PrismaClient();
  try {
    // 이미 들어 있는 것과 겹치는지 본다. 같은 사람의 같은 시점은 한 번만 받는다.
    const existing = await db.proOutcomeResponse.findMany({
      where: { participantToken: { in: rows.map((r) => r.token) } },
      select: { participantToken: true, phase: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.participantToken}::${e.phase}`));
    for (const row of rows) {
      if (existingKeys.has(`${row.token}::${row.phase}`)) {
        errors.push(`${row.line}행: 이 token 의 ${row.phase} 응답이 이미 저장되어 있습니다`);
      }
    }
    // 후속만 있고 복용 전이 없으면 분모에 못 들어간다.
    const baselineTokens = new Set(
      existing.filter((e) => e.phase === "BASELINE").map((e) => e.participantToken)
    );
    for (const row of rows) {
      if (row.phase !== "FOLLOWUP") continue;
      const inFile = rows.some((r) => r.token === row.token && r.phase === "BASELINE");
      if (!inFile && !baselineTokens.has(row.token)) {
        errors.push(`${row.line}행: 이 token 의 복용 전 응답이 없습니다. 후속만으로는 짝이 안 됩니다`);
      }
    }

    const summary = {
      schema_version: "kpi2_import_v1",
      file: path,
      parsed_rows: rows.length,
      baseline: rows.filter((r) => r.phase === "BASELINE").length,
      followup: rows.filter((r) => r.phase === "FOLLOWUP").length,
      channels: [...new Set(rows.map((r) => r.channel))],
      errors,
    };

    if (errors.length > 0) {
      console.log(JSON.stringify({ ...summary, status: "REJECTED" }, null, 2));
      console.log(
        "\n한 줄이라도 틀리면 파일 전체를 거부합니다. 고친 뒤 다시 돌리세요."
      );
      process.exitCode = 1;
      return;
    }
    if (!apply) {
      console.log(JSON.stringify({ ...summary, status: "DRY_RUN_OK" }, null, 2));
      console.log("\n검사만 했습니다. 실제로 넣으려면 --apply 를 붙이세요.");
      return;
    }

    await db.proOutcomeResponse.createMany({
      data: rows.map((r) => ({
        participantToken: r.token,
        phase: r.phase,
        goalKey: r.goalKey,
        goalScore: r.goalScore,
        generalScore: r.generalScore,
        sleepScore: r.sleepScore,
        digestionScore: r.digestionScore,
        energyScore: r.energyScore,
        daysTaken: r.daysTaken,
        adherencePercent: r.adherencePercent,
        researchConsented: true,
        consentVersion: PRO_CONSENT_VERSION,
        submittedAt: r.submittedAt,
        // 어느 경로로 받았는지 남긴다. 화면 응답과 섞이면 나중에 가릴 수 없다.
        clientId: `import:${r.channel}`,
        note: r.note,
      })),
    });
    console.log(JSON.stringify({ ...summary, status: "IMPORTED" }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
