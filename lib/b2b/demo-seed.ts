import "server-only";

import db from "@/lib/db";
import { computeAndSaveB2bAnalysis } from "@/lib/b2b/analysis-service";
import { resolveB2bEmployeeIdentity } from "@/lib/b2b/identity";
import {
  listRecentPeriodKeys,
  monthRangeFromPeriodKey,
  periodKeyToCycle,
  resolveCurrentPeriodKey,
} from "@/lib/b2b/period";
import { regenerateB2bReport } from "@/lib/b2b/report-service";
import {
  buildSurveyQuestionMap,
  ensureActiveB2bSurveyTemplate,
  type B2bSurveyTemplateSchema,
} from "@/lib/b2b/survey-template";

import {
  DEMO_EMPLOYEES,
  buildCommonAnswers,
  buildMockHealth,
  buildSectionAnswers,
} from "@/lib/b2b/demo-seed-builders";
import {
  normalizeSeedAnswerValue,
  resolveSeedAnswerScore,
} from "@/lib/b2b/demo-seed-survey-normalize";

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

      const question = common ?? section;
      const normalized = normalizeSeedAnswerValue(rawValue);
      const score = resolveSeedAnswerScore(question, normalized);
      const meta = {
        selectedValues: normalized.selectedValues,
        variantId: normalized.variantId ?? "base",
        lockedScore: score,
        fieldValues: normalized.fieldValues,
      };

      return {
        responseId: survey.id,
        questionKey,
        sectionKey: section?.sectionKey ?? null,
        answerText: normalized.answerText,
        answerValue: normalized.answerValue,
        score,
        meta: JSON.parse(JSON.stringify(meta)),
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
  const allowedSectionKeys = new Set(schema.sectionCatalog.map((section) => section.key));

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

      let selectedSections = seed.sections
        .filter((sectionKey) => allowedSectionKeys.has(sectionKey))
        .slice(0, schema.rules.maxSelectedSections);
      if (selectedSections.length === 0) {
        selectedSections = schema.sectionCatalog
          .slice(0, schema.rules.maxSelectedSections)
          .map((section) => section.key);
      }

      const health = buildMockHealth(periodRank, employeeRank);
      await upsertHealthSnapshot({
        employeeId: employee.id,
        periodKey,
        normalizedJson: health.normalizedJson,
        rawJson: health.rawJson,
        fetchedAt,
      });

      const answers = {
        ...buildCommonAnswers(schema, seed, selectedSections, periodRank, employeeRank),
        ...buildSectionAnswers(schema, selectedSections, periodRank, employeeRank),
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
