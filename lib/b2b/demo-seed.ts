import "server-only";

import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import { listRecentPeriodKeys, monthRangeFromPeriodKey, periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { regenerateB2bReport } from "@/lib/b2b/report-service";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
  type B2bSurveyTemplateSchema,
} from "@/lib/b2b/survey-template";

type DemoEmployeeSeed = {
  name: string;
  birthDate: string;
  phone: string;
  gender: "female" | "male";
  ageBand: "30s" | "40s" | "50s";
  sections: string[];
};

const DEMO_EMPLOYEES: DemoEmployeeSeed[] = [
  {
    name: "데모 임직원 김하나",
    birthDate: "19890215",
    phone: "01090010001",
    gender: "female",
    ageBand: "30s",
    sections: ["S01", "S02", "S15", "S16"],
  },
  {
    name: "데모 임직원 박준호",
    birthDate: "19810420",
    phone: "01090010002",
    gender: "male",
    ageBand: "40s",
    sections: ["S03", "S10", "S19", "S24"],
  },
];

function optionScoreByValue(
  question:
    | { options?: Array<{ value: string; label: string; score?: number }> }
    | undefined,
  value: string
) {
  if (!question?.options) return null;
  const found = question.options.find((option) => option.value === value);
  if (!found || typeof found.score !== "number") return null;
  return Number(found.score.toFixed(4));
}

function scoreIndexForPeriod(periodRank: number) {
  if (periodRank <= 0) return 0;
  if (periodRank === 1) return 1;
  return 2;
}

function buildMockHealth(periodRank: number, employeeRank: number) {
  const drift = periodRank * 2 + employeeRank;
  const checkupOverview = [
    { itemName: "체질량지수", value: String((24.2 + drift * 0.2).toFixed(1)), unit: "kg/m2" },
    { itemName: "혈압", value: `${122 + drift}/${78 + periodRank}`, unit: "mmHg" },
    { itemName: "공복혈당", value: String(95 + drift), unit: "mg/dL" },
    { itemName: "총콜레스테롤", value: String(188 + drift * 2), unit: "mg/dL" },
    { itemName: "중성지방", value: String(130 + drift * 3), unit: "mg/dL" },
    { itemName: "HDL", value: String(50 - periodRank), unit: "mg/dL" },
    { itemName: "LDL", value: String(110 + drift * 2), unit: "mg/dL" },
  ];

  const medicationList = [
    {
      medicineNm: "오메가3",
      diagDate: `2026-0${Math.max(1, 3 - periodRank)}-02`,
      dosageDay: "30일",
      hospitalNm: "웰니스의원",
    },
    {
      medicineNm: "비타민D",
      diagDate: `2026-0${Math.max(1, 3 - periodRank)}-11`,
      dosageDay: "60일",
      hospitalNm: "웰니스의원",
    },
    {
      medicineNm: employeeRank === 0 ? "콜레스테롤 관리제" : "혈압 관리제",
      diagDate: `2026-0${Math.max(1, 3 - periodRank)}-20`,
      dosageDay: "30일",
      hospitalNm: "메디컬센터",
    },
  ];

  return {
    normalizedJson: {
      checkup: { overview: checkupOverview },
      medication: { list: medicationList },
    },
    rawJson: {
      meta: {
        ok: true,
        partial: false,
        failed: [],
        source: "demo-seed",
      },
    },
  };
}

function buildCommonAnswers(
  schema: B2bSurveyTemplateSchema,
  seed: DemoEmployeeSeed,
  selectedSections: string[],
  periodRank: number
) {
  const scoreIndex = scoreIndexForPeriod(periodRank);
  const answers: Record<string, unknown> = {
    C01: seed.gender,
    C02: seed.ageBand,
    C03: seed.gender === "female" ? "162" : "175",
    C04: seed.gender === "female" ? "58" : "74",
    C05: "종합비타민, 오메가3",
    C27: selectedSections,
  };

  for (const question of schema.common) {
    if (answers[question.key] !== undefined) continue;
    if (question.type === "text") {
      answers[question.key] = "해당 없음";
      continue;
    }
    const options = question.options || [];
    if (options.length === 0) {
      answers[question.key] = "";
      continue;
    }
    const option = options[Math.min(scoreIndex, options.length - 1)];
    answers[question.key] = option.value;
  }
  return answers;
}

function buildSectionAnswers(
  schema: B2bSurveyTemplateSchema,
  selectedSections: string[],
  periodRank: number
) {
  const scoreIndex = scoreIndexForPeriod(periodRank);
  const answers: Record<string, unknown> = {};
  for (const section of schema.sections) {
    if (!selectedSections.includes(section.key)) continue;
    for (const question of section.questions) {
      const options = question.options || [];
      if (question.type === "text") {
        answers[question.key] = "해당 없음";
        continue;
      }
      if (options.length === 0) {
        answers[question.key] = "";
        continue;
      }
      const option = options[Math.min(scoreIndex, options.length - 1)];
      answers[question.key] = option.value;
    }
  }
  return answers;
}

async function upsertHealthSnapshot(input: {
  employeeId: string;
  periodKey: string;
  normalizedJson: unknown;
  rawJson: unknown;
  fetchedAt: Date;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);
  const existing = await db.b2bHealthDataSnapshot.findFirst({
    where: { employeeId: input.employeeId, periodKey: input.periodKey },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    return db.b2bHealthDataSnapshot.update({
      where: { id: existing.id },
      data: {
        sourceMode: "mock",
        provider: "HYPHEN_NHIS",
        normalizedJson: JSON.parse(JSON.stringify(input.normalizedJson)),
        rawJson: JSON.parse(JSON.stringify(input.rawJson)),
        fetchedAt: input.fetchedAt,
        reportCycle: reportCycle ?? null,
      },
    });
  }
  return db.b2bHealthDataSnapshot.create({
    data: {
      employeeId: input.employeeId,
      sourceMode: "mock",
      provider: "HYPHEN_NHIS",
      normalizedJson: JSON.parse(JSON.stringify(input.normalizedJson)),
      rawJson: JSON.parse(JSON.stringify(input.rawJson)),
      periodKey: input.periodKey,
      reportCycle: reportCycle ?? null,
      fetchedAt: input.fetchedAt,
    },
  });
}

async function upsertSurveyResponse(input: {
  employeeId: string;
  periodKey: string;
  templateId: string;
  templateVersion: number;
  schema: B2bSurveyTemplateSchema;
  selectedSections: string[];
  answers: Record<string, unknown>;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);
  const existing = await db.b2bSurveyResponse.findFirst({
    where: {
      employeeId: input.employeeId,
      templateId: input.templateId,
      periodKey: input.periodKey,
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  const survey = existing
    ? await db.b2bSurveyResponse.update({
        where: { id: existing.id },
        data: {
          templateVersion: input.templateVersion,
          selectedSections: input.selectedSections,
          answersJson: JSON.parse(JSON.stringify(input.answers)),
          periodKey: input.periodKey,
          reportCycle: reportCycle ?? null,
          submittedAt: new Date(),
        },
      })
    : await db.b2bSurveyResponse.create({
        data: {
          employeeId: input.employeeId,
          templateId: input.templateId,
          templateVersion: input.templateVersion,
          selectedSections: input.selectedSections,
          answersJson: JSON.parse(JSON.stringify(input.answers)),
          periodKey: input.periodKey,
          reportCycle: reportCycle ?? null,
          submittedAt: new Date(),
        },
      });

  await db.b2bSurveyAnswer.deleteMany({ where: { responseId: survey.id } });
  const { commonMap, sectionMap } = buildSurveyQuestionMap(input.schema);

  const rows = Object.entries(input.answers)
    .map(([questionKey, rawValue]) => {
      const common = commonMap.get(questionKey);
      const section = sectionMap.get(questionKey);
      if (!common && !section) return null;

      const value = Array.isArray(rawValue)
        ? rawValue.map((item) => String(item)).join(", ")
        : String(rawValue ?? "");
      const question = common ?? section;
      const score =
        typeof rawValue === "string"
          ? optionScoreByValue(question, rawValue)
          : null;
      return {
        responseId: survey.id,
        questionKey,
        sectionKey: section?.sectionKey ?? null,
        answerText: value || null,
        answerValue: value || null,
        score,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (rows.length > 0) {
    await db.b2bSurveyAnswer.createMany({ data: rows });
  }
}

async function upsertPharmacistNote(input: {
  employeeId: string;
  periodKey: string;
  periodRank: number;
}) {
  const reportCycle = periodKeyToCycle(input.periodKey);
  const existing = await db.b2bPharmacistNote.findFirst({
    where: { employeeId: input.employeeId, periodKey: input.periodKey },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  const noteText =
    input.periodRank === 0
      ? "최근 수면/스트레스 영역 개선이 확인됩니다."
      : "식습관과 복약 루틴을 일정하게 유지해 주세요.";
  const recommendations =
    "주 3회 이상 유산소 운동, 매일 수분 1.5L 이상, 취침 시간 고정";
  const cautions = "과도한 카페인 섭취와 야식은 가능한 줄여 주세요.";

  if (existing) {
    return db.b2bPharmacistNote.update({
      where: { id: existing.id },
      data: {
        note: noteText,
        recommendations,
        cautions,
        createdByAdminTag: "demo-seed",
        reportCycle: reportCycle ?? null,
      },
    });
  }
  return db.b2bPharmacistNote.create({
    data: {
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      reportCycle: reportCycle ?? null,
      note: noteText,
      recommendations,
      cautions,
      createdByAdminTag: "demo-seed",
    },
  });
}

export async function seedB2bDemoData() {
  const latestPeriodKey = resolveCurrentPeriodKey();
  const periods = listRecentPeriodKeys({ latestPeriodKey, count: 3 });
  const { template, schema } = await ensureActiveB2bSurveyTemplate();

  const employeeIds: string[] = [];

  for (let employeeRank = 0; employeeRank < DEMO_EMPLOYEES.length; employeeRank += 1) {
    const seed = DEMO_EMPLOYEES[employeeRank];
    const identity = resolveB2bEmployeeIdentity({
      name: seed.name,
      birthDate: seed.birthDate,
      phone: seed.phone,
    });

    const employee = await db.b2bEmployee.upsert({
      where: { identityHash: identity.identityHash },
      create: {
        appUserId: null,
        name: identity.name,
        birthDate: identity.birthDate,
        phoneNormalized: identity.phoneNormalized,
        identityHash: identity.identityHash,
        linkedProvider: "HYPHEN_NHIS",
      },
      update: {
        name: identity.name,
        birthDate: identity.birthDate,
        phoneNormalized: identity.phoneNormalized,
        linkedProvider: "HYPHEN_NHIS",
      },
    });
    employeeIds.push(employee.id);

    for (let periodRank = 0; periodRank < periods.length; periodRank += 1) {
      const periodKey = periods[periodRank];
      const range = monthRangeFromPeriodKey(periodKey);
      if (!range) continue;
      const fetchedAt = new Date(range.to.getTime() - 1000 * 60 * 60 * 24 * 2);
      const selectedSections = seed.sections.slice(0, 4);

      const health = buildMockHealth(periodRank, employeeRank);
      await upsertHealthSnapshot({
        employeeId: employee.id,
        periodKey,
        normalizedJson: health.normalizedJson,
        rawJson: health.rawJson,
        fetchedAt,
      });

      const answers = {
        ...buildCommonAnswers(schema, seed, selectedSections, periodRank),
        ...buildSectionAnswers(schema, selectedSections, periodRank),
      };
      await upsertSurveyResponse({
        employeeId: employee.id,
        periodKey,
        templateId: template.id,
        templateVersion: template.version,
        schema,
        selectedSections,
        answers,
      });

      await upsertPharmacistNote({
        employeeId: employee.id,
        periodKey,
        periodRank,
      });

      await computeAndSaveB2bAnalysis({
        employeeId: employee.id,
        periodKey,
        replaceLatestPeriodEntry: true,
        generateAiEvaluation: false,
      });

      await regenerateB2bReport({
        employeeId: employee.id,
        periodKey,
        pageSize: "A4",
        recomputeAnalysis: false,
        generateAiEvaluation: false,
      });
    }

    await db.b2bEmployee.update({
      where: { id: employee.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  return { employeeIds, periods };
}
