/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

const { isNonFatalNhisNoDataFailure } = require(path.join(
  ROOT,
  "lib/server/hyphen/fetch-executor.ts"
)) as {
  isNonFatalNhisNoDataFailure: (reason: unknown) => boolean;
};

const { isServeableNhisCachedPayload } = require(path.join(
  ROOT,
  "lib/server/hyphen/fetch-route-cache.ts"
)) as {
  isServeableNhisCachedPayload: (value: unknown) => boolean;
};

const { normalizeTreatmentPayload } = require(path.join(
  ROOT,
  "lib/server/hyphen/normalize-treatment.ts"
)) as {
  normalizeTreatmentPayload: (payload: unknown) => { list: unknown[] };
};

const {
  normalizeCheckupListPayload,
  normalizeCheckupYearlyPayload,
  normalizeCheckupOverviewPayload,
} = require(path.join(ROOT, "lib/server/hyphen/normalize-checkup.ts")) as {
  normalizeCheckupListPayload: (payloads: unknown[]) => { rows: unknown[] };
  normalizeCheckupYearlyPayload: (payloads: unknown[]) => unknown[];
  normalizeCheckupOverviewPayload: (payload: unknown) => unknown[];
};

function hyphenFailureFixture(input: {
  errCd?: string;
  errMsg?: string;
  message?: string;
}) {
  return {
    message: input.message ?? input.errMsg ?? "Hyphen request failed",
    common: {
      errCd: input.errCd,
      errMsg: input.errMsg,
    },
  };
}

function runNoDataFailureClassifierCases() {
  const noDataByCode = hyphenFailureFixture({
    errCd: "C0009-001",
    errMsg: "No data found",
  });
  assert.equal(isNonFatalNhisNoDataFailure(noDataByCode), true);
  console.log("[qa:nhis-fetch-resilience] PASS no-data by code");

  const noDataByMessage = hyphenFailureFixture({
    errMsg: "No data records available",
  });
  assert.equal(isNonFatalNhisNoDataFailure(noDataByMessage), true);
  console.log("[qa:nhis-fetch-resilience] PASS no-data by message");

  const noDataByKoreanMessage = hyphenFailureFixture({
    errMsg: "조회 결과가 없습니다.",
  });
  assert.equal(isNonFatalNhisNoDataFailure(noDataByKoreanMessage), true);
  console.log("[qa:nhis-fetch-resilience] PASS no-data by korean message");

  const sessionExpired = hyphenFailureFixture({
    errCd: "LOGIN-999",
    errMsg: "Session expired. Please login again.",
  });
  assert.equal(isNonFatalNhisNoDataFailure(sessionExpired), false);
  console.log("[qa:nhis-fetch-resilience] PASS auth-expired is fatal");

  const reauthRequired = hyphenFailureFixture({
    errCd: "C0012-001",
    errMsg: "Pre-consent required.",
  });
  assert.equal(isNonFatalNhisNoDataFailure(reauthRequired), false);
  console.log("[qa:nhis-fetch-resilience] PASS reauth-required is fatal");

  const hardFailureByMessage = hyphenFailureFixture({
    errMsg: "복약 정보를 불러오지 못했습니다.",
  });
  assert.equal(isNonFatalNhisNoDataFailure(hardFailureByMessage), false);
  console.log("[qa:nhis-fetch-resilience] PASS hard-failure message is fatal");
}

function runCachePayloadGuards() {
  assert.equal(isServeableNhisCachedPayload({ ok: true }), true);
  assert.equal(
    isServeableNhisCachedPayload({ ok: false, error: "temporary failure" }),
    false
  );
  assert.equal(isServeableNhisCachedPayload({ foo: "bar" }), false);
  console.log("[qa:nhis-fetch-resilience] PASS cache payload guard");

  const source = read("lib/server/hyphen/fetch-route-cache.ts");
  assert.ok(
    source.includes("isServeableNhisCachedPayload(cachedPayload)"),
    "memory cache serving should guard failed payloads"
  );
  assert.ok(
    source.includes("isServeableNhisCachedPayload(directCachedRaw.payload)"),
    "db direct cache serving should guard failed payloads"
  );
  console.log("[qa:nhis-fetch-resilience] PASS cache gate regression checks");
}

function runNormalizationCapCases() {
  process.env.HYPHEN_NHIS_NORMALIZE_TREATMENT_MAX_ROWS = "120";
  process.env.HYPHEN_NHIS_NORMALIZE_CHECKUP_LIST_MAX_ROWS = "130";
  process.env.HYPHEN_NHIS_NORMALIZE_CHECKUP_YEARLY_MAX_ROWS = "140";
  process.env.HYPHEN_NHIS_NORMALIZE_CHECKUP_OVERVIEW_MAX_ROWS = "110";

  const treatmentPayload = {
    data: {
      list: Array.from({ length: 400 }, (_, index) => ({
        subject: "self",
        examinee: `employee-${index}`,
        sublist: [
          {
            diagDate: "2026-01-10",
            medList: [{ medicineNm: `drug-${index}` }],
          },
        ],
      })),
    },
  };
  const treatment = normalizeTreatmentPayload(treatmentPayload);
  assert.ok(treatment.list.length <= 120);
  console.log("[qa:nhis-fetch-resilience] PASS treatment row cap");

  const checkupListPayload = [
    {
      data: {
        yyyy: "2026",
        list: Array.from({ length: 300 }, (_, index) => ({
          name: `person-${index}`,
          inqryResList: Array.from({ length: 3 }, (__, i) => ({
            inspectItem: `item-${i}`,
            result: `${index + i}`,
          })),
        })),
      },
    },
  ];
  const checkupList = normalizeCheckupListPayload(checkupListPayload);
  assert.ok(checkupList.rows.length <= 130);
  console.log("[qa:nhis-fetch-resilience] PASS checkup list row cap");

  const checkupYearlyPayload = [
    {
      data: {
        detailKey: "A",
        detailKey2: "B",
        list: Array.from({ length: 180 }, (_, index) => ({
          title: `detail-${index}`,
          checkList: [
            {
              qtitle: "question",
              itemList: Array.from({ length: 4 }, (__, i) => ({
                metric: `metric-${i}`,
                value: `${index + i}`,
              })),
            },
          ],
        })),
      },
    },
  ];
  const checkupYearly = normalizeCheckupYearlyPayload(checkupYearlyPayload);
  assert.ok(checkupYearly.length <= 140);
  console.log("[qa:nhis-fetch-resilience] PASS checkup yearly row cap");

  const checkupOverviewPayload = {
    data: {
      list: Array.from({ length: 260 }, (_, index) => ({
        year: "2026",
        chkResult: Array.from({ length: 2 }, (__, i) => ({
          inspectItem: `overview-${i}`,
          result: `${index + i}`,
        })),
      })),
    },
  };
  const checkupOverview = normalizeCheckupOverviewPayload(checkupOverviewPayload);
  assert.ok(checkupOverview.length <= 110);
  console.log("[qa:nhis-fetch-resilience] PASS checkup overview row cap");
}

function run() {
  runNoDataFailureClassifierCases();
  runCachePayloadGuards();
  runNormalizationCapCases();
  console.log("[qa:nhis-fetch-resilience] ALL PASS");
}

try {
  run();
} catch (error) {
  console.error("[qa:nhis-fetch-resilience] FAIL", error);
  process.exit(1);
}
