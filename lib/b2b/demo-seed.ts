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

type DemoEmployeeSeed = {
  name: string;
  birthDate: string;
  phone: string;
  gender: "female" | "male";
  age: number;
  heightCm: number;
  weightKg: number;
  femaleStatusLabel?: string;
  sections: string[];
  multiChoiceKeywords?: Partial<Record<"C05" | "C06" | "C07" | "C08" | "C09", string[]>>;
};

type SurveyOption = { value: string; label: string; score?: number; isNoneOption?: boolean };

const DEMO_EMPLOYEES: DemoEmployeeSeed[] = [
  {
    name: "데모 임직원 김하나",
    birthDate: "19890215",
    phone: "01090010001",
    gender: "female",
    age: 36,
    heightCm: 162,
    weightKg: 58,
    femaleStatusLabel: "해당없음",
    sections: ["S01", "S02", "S15", "S16", "S17"],
    multiChoiceKeywords: {
      C05: ["갑상선 기능 저하증", "피부질환"],
      C06: ["혈압관리", "콜레스테롤관리"],
      C07: ["비타민D", "오메가3"],
      C08: ["종합비타민", "루테인"],
      C09: ["수면&피로 개선", "혈압 조절", "면역 기능 개선"],
    },
  },
  {
    name: "데모 임직원 박준호",
    birthDate: "19810420",
    phone: "01090010002",
    gender: "male",
    age: 44,
    heightCm: 175,
    weightKg: 78,
    sections: ["S03", "S10", "S19", "S21", "S24"],
    multiChoiceKeywords: {
      C05: ["고혈압", "이상지질혈증"],
      C06: ["복부비만관리", "관절건강관리"],
      C07: ["밀크씨슬", "오메가3"],
      C08: ["프로바이오틱스", "홍삼"],
      C09: ["스트레스 완화", "체지방 감소", "전립선 건강"],
    },
  },
];

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function optionScoreByValue(
  question:
    | {
        options?: Array<{
          value: string;
          label: string;
          score?: number;
        }>;
      }
    | undefined,
  value: string
) {
  if (!question?.options) return null;
  const normalized = value.trim().toLowerCase();
  const found = question.options.find(
    (option) =>
      option.value.trim().toLowerCase() === normalized ||
      option.label.trim().toLowerCase() === normalized
  );
  if (!found || typeof found.score !== "number") return null;
  return Number(found.score.toFixed(4));
}

function targetScoreForPeriod(periodRank: number, employeeRank: number) {
  if (periodRank <= 0) return clamp01(0.55 + employeeRank * 0.05);
  if (periodRank === 1) return clamp01(0.7 + employeeRank * 0.05);
  return clamp01(0.85 + employeeRank * 0.05);
}

function normalizeTextToken(value: string) {
  return value.trim().toLowerCase();
}

function pickOptionByKeyword(
  options: SurveyOption[],
  keywords: string[] | undefined,
  fallbackIndex = 0
) {
  if (options.length === 0) return null;
  const normalizedKeywords = (keywords ?? [])
    .map((keyword) => normalizeTextToken(keyword))
    .filter(Boolean);
  if (normalizedKeywords.length > 0) {
    for (const option of options) {
      const label = normalizeTextToken(option.label);
      const value = normalizeTextToken(option.value);
      const matched = normalizedKeywords.some(
        (keyword) =>
          keyword === label ||
          keyword === value ||
          label.includes(keyword) ||
          keyword.includes(label)
      );
      if (matched) return option;
    }
  }
  return options[Math.abs(fallbackIndex) % options.length] ?? options[0];
}

function pickOptionByScore(options: SurveyOption[], scoreTarget: number, fallbackIndex = 0) {
  if (options.length === 0) return null;
  const scored = options
    .map((option, index) => ({ option, index }))
    .filter((row) => typeof row.option.score === "number");
  if (scored.length === 0) {
    return options[Math.abs(fallbackIndex) % options.length] ?? options[0];
  }

  let selected = scored[0];
  let selectedDistance = Math.abs((selected.option.score ?? 0) - scoreTarget);
  for (const row of scored.slice(1)) {
    const distance = Math.abs((row.option.score ?? 0) - scoreTarget);
    if (distance < selectedDistance - 1e-9) {
      selected = row;
      selectedDistance = distance;
      continue;
    }
    if (Math.abs(distance - selectedDistance) <= 1e-9 && row.index < selected.index) {
      selected = row;
      selectedDistance = distance;
    }
  }
  return selected.option;
}

function pickMultiValues(input: {
  options: SurveyOption[];
  maxSelect: number;
  keywords?: string[];
  fallbackSeed: number;
}) {
  const available = input.options.filter((option) => option.isNoneOption !== true);
  const noneOption = input.options.find((option) => option.isNoneOption === true) ?? null;
  if (available.length === 0) {
    return noneOption ? [noneOption.value] : [];
  }

  const chosen: string[] = [];
  for (const keyword of input.keywords ?? []) {
    const match = pickOptionByKeyword(available, [keyword], input.fallbackSeed);
    if (!match) continue;
    if (!chosen.includes(match.value)) {
      chosen.push(match.value);
    }
    if (chosen.length >= input.maxSelect) break;
  }

  if (chosen.length === 0) {
    const rotated = [...available]
      .slice(input.fallbackSeed % available.length)
      .concat([...available].slice(0, input.fallbackSeed % available.length));
    const targetCount = Math.min(Math.max(1, input.maxSelect), 2);
    for (const option of rotated) {
      if (!chosen.includes(option.value)) {
        chosen.push(option.value);
      }
      if (chosen.length >= targetCount) break;
    }
  }

  if (chosen.length === 0 && noneOption) return [noneOption.value];
  return chosen.slice(0, input.maxSelect);
}

function buildGroupAnswer(
  question: B2bSurveyTemplateSchema["common"][number],
  seed: DemoEmployeeSeed
) {
  const fields = question.fields ?? [];
  const fieldValues: Record<string, string> = {};
  for (const field of fields) {
    const key = field.id.toLowerCase();
    if (key.includes("height")) {
      fieldValues[field.id] = String(seed.heightCm);
      continue;
    }
    if (key.includes("weight")) {
      fieldValues[field.id] = String(seed.weightKg);
      continue;
    }
    fieldValues[field.id] = "";
  }

  const summary = fields
    .map((field) => {
      const fieldValue = fieldValues[field.id]?.trim() ?? "";
      if (!fieldValue) return null;
      return `${field.label} ${fieldValue}${field.unit ? ` ${field.unit}` : ""}`.trim();
    })
    .filter((item): item is string => Boolean(item))
    .join(", ");

  return {
    fieldValues,
    answerValue: summary || undefined,
    answerText: summary || undefined,
    selectedValues: Object.values(fieldValues).filter((item) => item.trim().length > 0),
  };
}

function buildCommonAnswers(
  schema: B2bSurveyTemplateSchema,
  seed: DemoEmployeeSeed,
  selectedSections: string[],
  periodRank: number,
  employeeRank: number
) {
  const scoreTarget = targetScoreForPeriod(periodRank, employeeRank);
  const answers: Record<string, unknown> = { C27: selectedSections };

  for (const question of schema.common) {
    if (answers[question.key] !== undefined) continue;

    if (question.key === "C01") {
      const option = pickOptionByKeyword(
        question.options ?? [],
        [seed.gender === "female" ? "여성" : "남성"],
        employeeRank
      );
      answers[question.key] = option?.value ?? "";
      continue;
    }

    if (question.key === "C02") {
      answers[question.key] = String(seed.age);
      continue;
    }

    if (question.key === "C03" && question.type === "group") {
      answers[question.key] = buildGroupAnswer(question, seed);
      continue;
    }

    if (question.key === "C04") {
      const keywords =
        seed.gender === "female"
          ? [seed.femaleStatusLabel ?? "해당없음", "해당없음"]
          : ["해당없음"];
      const option = pickOptionByKeyword(question.options ?? [], keywords, periodRank);
      answers[question.key] = option?.value ?? "";
      continue;
    }

    if (
      question.type === "multi" &&
      ["C05", "C06", "C07", "C08", "C09"].includes(question.key)
    ) {
      const maxSelect =
        question.maxSelect ||
        question.constraints?.maxSelections ||
        (question.options ?? []).filter((option) => option.isNoneOption !== true).length ||
        5;
      answers[question.key] = pickMultiValues({
        options: question.options ?? [],
        maxSelect,
        keywords: seed.multiChoiceKeywords?.[question.key as "C05" | "C06" | "C07" | "C08" | "C09"],
        fallbackSeed: employeeRank + periodRank,
      });
      continue;
    }

    if (question.type === "single") {
      const option = pickOptionByScore(
        question.options ?? [],
        scoreTarget,
        employeeRank + periodRank + question.index
      );
      answers[question.key] = option?.value ?? "";
      continue;
    }

    if (question.type === "multi") {
      const maxSelect =
        question.maxSelect ||
        question.constraints?.maxSelections ||
        (question.options ?? []).filter((option) => option.isNoneOption !== true).length ||
        3;
      answers[question.key] = pickMultiValues({
        options: question.options ?? [],
        maxSelect,
        fallbackSeed: employeeRank + periodRank + question.index,
      });
      continue;
    }

    if (question.type === "number") {
      answers[question.key] = String(seed.age);
      continue;
    }

    if (question.type === "group") {
      answers[question.key] = buildGroupAnswer(question, seed);
      continue;
    }

    answers[question.key] = "해당 없음";
  }

  return answers;
}

function buildSectionAnswers(
  schema: B2bSurveyTemplateSchema,
  selectedSections: string[],
  periodRank: number,
  employeeRank: number
) {
  const answers: Record<string, unknown> = {};
  const selectedSet = new Set(selectedSections);
  const scoreTarget = targetScoreForPeriod(periodRank, employeeRank);

  for (const section of schema.sections) {
    if (!selectedSet.has(section.key)) continue;
    for (const question of section.questions) {
      if (question.type === "single") {
        const option = pickOptionByScore(
          question.options ?? [],
          clamp01(scoreTarget + ((question.index % 3) - 1) * 0.05),
          employeeRank + periodRank + question.index
        );
        answers[question.key] = option?.value ?? "";
        continue;
      }

      if (question.type === "multi") {
        const maxSelect =
          question.maxSelect ||
          question.constraints?.maxSelections ||
          (question.options ?? []).filter((option) => option.isNoneOption !== true).length ||
          3;
        answers[question.key] = pickMultiValues({
          options: question.options ?? [],
          maxSelect,
          fallbackSeed: employeeRank + periodRank + question.index,
        });
        continue;
      }

      if (question.type === "number") {
        answers[question.key] = "1";
        continue;
      }

      answers[question.key] = "해당 없음";
    }
  }
  return answers;
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

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

type NormalizedSeedAnswerValue = {
  answerText: string | null;
  answerValue: string | null;
  selectedValues: string[];
  submittedScore: number | null;
  variantId: string | null;
  fieldValues: Record<string, string> | null;
};

function normalizeSeedAnswerValue(raw: unknown): NormalizedSeedAnswerValue {
  if (raw == null) {
    return {
      answerText: null as string | null,
      answerValue: null as string | null,
      selectedValues: [],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (Array.isArray(raw)) {
    const selectedValues = raw.map((item) => toText(item)).filter(Boolean);
    const joined = selectedValues.join(", ");
    return {
      answerText: joined || null,
      answerValue: joined || null,
      selectedValues,
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = toText(raw);
    return {
      answerText: text || null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
      submittedScore: null,
      variantId: null,
      fieldValues: null,
    };
  }

  const record = raw as Record<string, unknown>;
  const answerText = toText(record.answerText ?? record.text) || null;
  const answerValue = toText(record.answerValue ?? record.value) || null;
  const selectedValues = Array.isArray(record.selectedValues)
    ? record.selectedValues.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(record.values)
    ? record.values.map((item) => toText(item)).filter(Boolean)
    : [];
  const submittedScore =
    typeof record.score === "number" && Number.isFinite(record.score)
      ? Number(clamp01(record.score).toFixed(4))
      : null;
  const variantId = toText(record.variantId) || null;
  const fieldValues: Record<string, string> | null =
    record.fieldValues && typeof record.fieldValues === "object" && !Array.isArray(record.fieldValues)
      ? (Object.fromEntries(
          Object.entries(record.fieldValues as Record<string, unknown>)
            .map(([fieldKey, fieldValue]) => [fieldKey, toText(fieldValue)])
            .filter(([, fieldValue]) => fieldValue.length > 0)
        ) as Record<string, string>)
      : null;
  const fieldTokens = fieldValues ? Object.values(fieldValues) : [];
  const fieldText = fieldTokens.join(", ");

  return {
    answerText: answerText ?? (fieldText || null),
    answerValue: answerValue ?? answerText ?? (fieldText || null),
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : answerValue
        ? [answerValue]
        : answerText
        ? [answerText]
        : fieldTokens,
    submittedScore,
    variantId,
    fieldValues,
  };
}

function resolveSeedAnswerScore(
  question:
    | {
        type: "text" | "single" | "multi" | "number" | "group";
        options?: Array<{ value: string; label: string; score?: number }>;
      }
    | undefined,
  normalized: ReturnType<typeof normalizeSeedAnswerValue>
) {
  if (!question) return null;
  if (question.type === "text" || question.type === "number" || question.type === "group") {
    return null;
  }
  if (typeof normalized.submittedScore === "number") {
    return normalized.submittedScore;
  }
  if (!question.options || question.options.length === 0) return null;

  const candidates = [
    ...normalized.selectedValues,
    normalized.answerValue ?? "",
    normalized.answerText ?? "",
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (candidates.length === 0) return null;

  const scores = candidates
    .map((candidate) => optionScoreByValue(question, candidate))
    .filter((score): score is number => typeof score === "number");
  if (scores.length === 0) return null;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(4));
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
