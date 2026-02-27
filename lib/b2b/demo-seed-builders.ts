import "server-only";

import type { B2bSurveyTemplateSchema } from "@/lib/b2b/survey-template";
import {
  clamp01,
  pickMultiValues,
  pickOptionByKeyword,
  pickOptionByScore,
  targetScoreForPeriod,
  type SurveyOption,
} from "@/lib/b2b/demo-seed-selection";

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

export const DEMO_EMPLOYEES: DemoEmployeeSeed[] = [
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

export function optionScoreByValue(
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

export function buildCommonAnswers(
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

export function buildSectionAnswers(
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

export function buildMockHealth(periodRank: number, employeeRank: number) {
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
