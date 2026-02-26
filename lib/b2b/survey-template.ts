import "server-only";

import db from "@/lib/db";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import { z } from "zod";

const surveyOptionSchema = z
  .object({
    value: z.string().trim().min(1),
    label: z.string().trim().min(1),
    score: z.number().min(0).max(1).optional(),
    aliases: z.array(z.string().trim().min(1)).optional(),
  })
  .passthrough();

const surveyQuestionVariantSchema = z
  .object({
    variantId: z.string().trim().min(1).optional(),
    optionsPrefix: z.string().optional(),
    options: z.array(surveyOptionSchema).min(1),
  })
  .passthrough();

const surveyQuestionSchema = z
  .object({
    key: z.string().trim().min(1),
    index: z.number().int().min(1),
    text: z.string().min(1),
    helpText: z.string().optional(),
    type: z.enum(["text", "single", "multi"]).default("single"),
    required: z.boolean().optional(),
    options: z.array(surveyOptionSchema).optional(),
    placeholder: z.string().optional(),
    maxSelect: z.number().int().min(1).max(24).optional(),
    optionsPrefix: z.string().optional(),
    scoringEnabled: z.boolean().optional(),
    constraints: z
      .object({
        maxSelections: z.number().int().min(1).max(24).optional(),
        recommendedSelectionsRange: z
          .tuple([z.number().int().min(0), z.number().int().min(0)])
          .optional(),
      })
      .optional(),
    variants: z.record(z.string(), surveyQuestionVariantSchema).optional(),
  })
  .passthrough();

const surveySectionCatalogSchema = z
  .object({
    key: z.string().trim().min(1),
    title: z.string().min(1),
    displayName: z.string().optional(),
    description: z.string().optional(),
    triggerLabel: z.string().min(1),
    questionCount: z.number().int().min(0),
    aliases: z.array(z.string().trim().min(1)).optional(),
  })
  .passthrough();

const surveySectionSchema = z
  .object({
    key: z.string().trim().min(1),
    title: z.string().min(1),
    displayName: z.string().optional(),
    description: z.string().optional(),
    questions: z.array(surveyQuestionSchema),
  })
  .passthrough();

const surveyTemplateSchema = z
  .object({
    version: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    common: z.array(surveyQuestionSchema).min(1),
    sectionCatalog: z.array(surveySectionCatalogSchema).min(1),
    sections: z.array(surveySectionSchema).min(1),
    rules: z
      .object({
        selectSectionByCommonQuestionKey: z.string().trim().min(1),
        maxSelectedSections: z.number().int().min(1).max(24),
        minSelectedSections: z.number().int().min(0).max(24).default(0),
        recommendedSelectionsRange: z
          .tuple([z.number().int().min(0), z.number().int().min(0)])
          .optional(),
      })
      .default({
        selectSectionByCommonQuestionKey: "C27",
        maxSelectedSections: 5,
        minSelectedSections: 0,
      }),
  })
  .passthrough();

export type B2bSurveyTemplateSchema = z.infer<typeof surveyTemplateSchema>;

let cachedTemplate: B2bSurveyTemplateSchema | null = null;

function normalizeQuestion(
  question: B2bSurveyTemplateSchema["common"][number]
): B2bSurveyTemplateSchema["common"][number] {
  const normalizedType =
    question.type === "single" || question.type === "multi" || question.type === "text"
      ? question.type
      : "single";
  return {
    ...question,
    type: normalizedType,
    required: question.required ?? false,
    options: question.options ?? [],
    placeholder: question.placeholder ?? "응답 입력",
    maxSelect:
      normalizedType === "multi"
        ? question.maxSelect ?? question.constraints?.maxSelections ?? 5
        : undefined,
  };
}

function normalizeTemplateSchema(
  schema: B2bSurveyTemplateSchema
): B2bSurveyTemplateSchema {
  const sectionCatalog = schema.sectionCatalog.map((section) => ({
    ...section,
    displayName: section.displayName ?? section.title,
    description: section.description ?? `${section.triggerLabel} 관련 상세 문항`,
    aliases: section.aliases ?? [],
  }));

  const sectionByKey = new Map(sectionCatalog.map((item) => [item.key, item]));

  return {
    ...schema,
    common: schema.common.map((question) => normalizeQuestion(question)),
    sectionCatalog,
    sections: schema.sections.map((section) => {
      const linked = sectionByKey.get(section.key);
      return {
        ...section,
        displayName: section.displayName ?? linked?.displayName ?? section.title,
        description:
          section.description ??
          linked?.description ??
          `${linked?.triggerLabel ?? section.title} 관련 상세 문항`,
        questions: section.questions.map((question) => normalizeQuestion(question)),
      };
    }),
    rules: {
      ...schema.rules,
      selectSectionByCommonQuestionKey:
        schema.rules.selectSectionByCommonQuestionKey || "C27",
      maxSelectedSections: schema.rules.maxSelectedSections || 5,
      minSelectedSections: schema.rules.minSelectedSections ?? 0,
      recommendedSelectionsRange: schema.rules.recommendedSelectionsRange,
    },
  };
}

function mapJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}

function loadTemplateFromData() {
  if (cachedTemplate) return cachedTemplate;
  const sourceTemplate = loadWellnessTemplateForB2b();
  const parsed = normalizeTemplateSchema(surveyTemplateSchema.parse(sourceTemplate));
  cachedTemplate = parsed;
  return parsed;
}

export async function ensureActiveB2bSurveyTemplate() {
  const active = await db.b2bSurveyTemplate.findFirst({
    where: { isActive: true },
    orderBy: [{ version: "desc" }],
  });

  if (active) {
    const schema = mapJsonValue<B2bSurveyTemplateSchema | null>(active.schema, null);
    if (schema) {
      return { template: active, schema: normalizeTemplateSchema(schema) };
    }
  }

  const fileTemplate = loadTemplateFromData();
  const upserted = await db.b2bSurveyTemplate.upsert({
    where: { version: fileTemplate.version },
    create: {
      version: fileTemplate.version,
      title: fileTemplate.title,
      schema: JSON.parse(JSON.stringify(fileTemplate)),
      isActive: true,
    },
    update: {
      title: fileTemplate.title,
      schema: JSON.parse(JSON.stringify(fileTemplate)),
      isActive: true,
    },
  });

  await db.b2bSurveyTemplate.updateMany({
    where: {
      id: { not: upserted.id },
      isActive: true,
    },
    data: { isActive: false },
  });

  return { template: upserted, schema: fileTemplate };
}

function collectRawTokens(rawValue: unknown) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item));
  }
  if (typeof rawValue === "string") {
    return rawValue.split(/[,\n/|]/g);
  }
  if (typeof rawValue === "object" && rawValue) {
    const record = rawValue as Record<string, unknown>;
    if (Array.isArray(record.selectedValues)) {
      return record.selectedValues.map((item) => String(item));
    }
    if (Array.isArray(record.values)) {
      return record.values.map((item) => String(item));
    }
    return Object.values(record).map((value) => String(value));
  }
  return [];
}

export function resolveSectionKeysFromC27Input(
  templateSchema: B2bSurveyTemplateSchema,
  rawC27Value: unknown
) {
  const normalized = collectRawTokens(rawC27Value)
    .map((item) => item.trim())
    .filter(Boolean);
  if (normalized.length === 0) return [];

  const sectionByKeyword = templateSchema.sectionCatalog.map((section) => {
    const aliases = section.aliases ?? [];
    return {
      key: section.key,
      keywords: [
        section.key,
        section.title,
        section.displayName ?? section.title,
        section.triggerLabel,
        ...aliases,
      ]
        .map((item) => item.toLowerCase())
        .filter(Boolean),
    };
  });

  const selected = new Set<string>();
  for (const token of normalized) {
    const lowered = token.toLowerCase();
    const matched = sectionByKeyword.find((section) =>
      section.keywords.some(
        (keyword) => lowered === keyword || lowered.includes(keyword) || keyword.includes(lowered)
      )
    );
    if (!matched) continue;
    selected.add(matched.key);
    if (selected.size >= templateSchema.rules.maxSelectedSections) break;
  }

  return [...selected];
}

export function buildSurveyQuestionMap(templateSchema: B2bSurveyTemplateSchema) {
  const commonMap = new Map(templateSchema.common.map((question) => [question.key, question]));
  const sectionMap = new Map(
    templateSchema.sections.flatMap((section) =>
      section.questions.map((question) => [
        question.key,
        {
          ...question,
          sectionKey: section.key,
        },
      ])
    )
  );

  return { commonMap, sectionMap };
}

