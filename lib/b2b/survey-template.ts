import "server-only";

import { readFileSync } from "fs";
import path from "path";
import { z } from "zod";
import db from "@/lib/db";

const surveyOptionSchema = z.object({
  value: z.string().trim().min(1),
  label: z.string().trim().min(1),
  score: z.number().min(0).max(1).optional(),
});

const surveyQuestionSchema = z.object({
  key: z.string().trim().min(1),
  index: z.number().int().min(1),
  text: z.string().min(1),
  helpText: z.string().optional(),
  type: z.enum(["text", "single", "multi"]).default("single"),
  required: z.boolean().optional(),
  options: z.array(surveyOptionSchema).optional(),
  placeholder: z.string().optional(),
  maxSelect: z.number().int().min(1).max(10).optional(),
});

const surveySectionCatalogSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  triggerLabel: z.string().min(1),
  questionCount: z.number().int().min(0),
});

const surveySectionSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  questions: z.array(surveyQuestionSchema),
});

const surveyTemplateSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  common: z.array(surveyQuestionSchema).min(1),
  sectionCatalog: z.array(surveySectionCatalogSchema).min(1),
  sections: z.array(surveySectionSchema).min(1),
  rules: z
    .object({
      selectSectionByCommonQuestionKey: z.string().trim().min(1),
      maxSelectedSections: z.number().int().min(1).max(10),
      minSelectedSections: z.number().int().min(0).max(10).default(0),
    })
    .default({
      selectSectionByCommonQuestionKey: "C27",
      maxSelectedSections: 5,
      minSelectedSections: 0,
    }),
});

export type B2bSurveyTemplateSchema = z.infer<typeof surveyTemplateSchema>;

let cachedFileTemplate: B2bSurveyTemplateSchema | null = null;

function normalizeQuestion(
  question: B2bSurveyTemplateSchema["common"][number]
): B2bSurveyTemplateSchema["common"][number] {
  return {
    ...question,
    required: question.required ?? false,
    options: question.options ?? [],
    placeholder: question.placeholder ?? "응답 입력",
    maxSelect: question.type === "multi" ? question.maxSelect ?? 5 : undefined,
  };
}

function normalizeTemplateSchema(
  schema: B2bSurveyTemplateSchema
): B2bSurveyTemplateSchema {
  const sectionCatalog = schema.sectionCatalog.map((section) => ({
    ...section,
    displayName: section.displayName ?? section.title,
    description:
      section.description ?? `${section.triggerLabel} 관련 상세 문항`,
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
  };
}

function loadTemplateFileFromDisk() {
  if (cachedFileTemplate) return cachedFileTemplate;
  const filePath = path.join(process.cwd(), "data", "b2b", "survey-template.v1.json");
  const raw = readFileSync(filePath, "utf8");
  const parsed = normalizeTemplateSchema(
    surveyTemplateSchema.parse(JSON.parse(raw))
  );
  cachedFileTemplate = parsed;
  return parsed;
}

function mapJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return fallback;
  }
}

export async function ensureActiveB2bSurveyTemplate() {
  const active = await db.b2bSurveyTemplate.findFirst({
    where: { isActive: true },
    orderBy: [{ version: "desc" }],
  });
  if (active) {
    const schema = mapJsonValue<B2bSurveyTemplateSchema | null>(active.schema, null);
    if (schema) return { template: active, schema: normalizeTemplateSchema(schema) };
  }

  const fileTemplate = normalizeTemplateSchema(loadTemplateFileFromDisk());
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

export function resolveSectionKeysFromC27Input(
  templateSchema: B2bSurveyTemplateSchema,
  rawC27Value: unknown
) {
  const rawTokens = Array.isArray(rawC27Value)
    ? rawC27Value.map((item) => String(item))
    : typeof rawC27Value === "string"
    ? rawC27Value.split(/[,\n/|]/g)
    : typeof rawC27Value === "object" && rawC27Value
    ? Object.values(rawC27Value as Record<string, unknown>).map((value) => String(value))
    : [];

  const normalized = rawTokens.map((item) => item.trim()).filter(Boolean);
  if (normalized.length === 0) return [];

  const sectionByKeyword = templateSchema.sectionCatalog.map((section) => ({
    key: section.key,
    title: section.title.toLowerCase(),
    displayName: (section.displayName ?? section.title).toLowerCase(),
    triggerLabel: section.triggerLabel.toLowerCase(),
  }));

  const selected = new Set<string>();
  for (const item of normalized) {
    const lowered = item.toLowerCase();
    const matched = sectionByKeyword.find(
      (section) =>
        lowered === section.key.toLowerCase() ||
        lowered.includes(section.title) ||
        lowered.includes(section.displayName) ||
        lowered.includes(section.triggerLabel)
    );
    if (matched) selected.add(matched.key);
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
