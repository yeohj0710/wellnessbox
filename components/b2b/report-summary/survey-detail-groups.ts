import type { SectionAdviceLine } from "./SurveyDetailPages";

export type NormalizedSectionAdviceLine = SectionAdviceLine & {
  normalizedSectionTitle: string;
  normalizedQuestionText: string;
};

export type SurveyDetailSectionAdviceGroup = {
  sectionTitle: string;
  items: NormalizedSectionAdviceLine[];
};

function normalizeGroupKey(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeSectionAdviceLine(
  line: SectionAdviceLine
): NormalizedSectionAdviceLine {
  if (line.continuation) {
    const continuationSectionTitle = line.sectionTitle.trim();
    return {
      ...line,
      normalizedSectionTitle:
        continuationSectionTitle && continuationSectionTitle !== "-"
          ? continuationSectionTitle
          : "분석 항목",
      normalizedQuestionText: "",
    };
  }

  const sectionTitleRaw = line.sectionTitle.trim();
  const questionTextRaw = line.questionText.trim();
  const questionPrefixMatch = questionTextRaw.match(/^(.+?)\s*[·㍍]\s*(.+)$/u);

  let normalizedSectionTitle = sectionTitleRaw;
  let normalizedQuestionText = questionTextRaw;

  if (questionPrefixMatch) {
    const prefix = questionPrefixMatch[1].trim();
    const body = questionPrefixMatch[2].trim();
    if (!normalizedSectionTitle || normalizedSectionTitle === "-") {
      normalizedSectionTitle = prefix;
      normalizedQuestionText = body;
    } else if (normalizeGroupKey(normalizedSectionTitle) === normalizeGroupKey(prefix)) {
      normalizedQuestionText = body;
    }
  }

  if (!normalizedSectionTitle || normalizedSectionTitle === "-") {
    normalizedSectionTitle = "분석 항목";
  }
  if (!normalizedQuestionText) {
    normalizedQuestionText = line.questionText || "확인 필요 문항";
  }

  return {
    ...line,
    normalizedSectionTitle,
    normalizedQuestionText,
  };
}

export function groupSectionAdviceRows(
  rows: SectionAdviceLine[]
): SurveyDetailSectionAdviceGroup[] {
  return rows.reduce<SurveyDetailSectionAdviceGroup[]>((acc, row) => {
    const normalized = normalizeSectionAdviceLine(row);
    const existing = acc.find(
      (group) =>
        normalizeGroupKey(group.sectionTitle) ===
        normalizeGroupKey(normalized.normalizedSectionTitle)
    );
    if (existing) {
      existing.items.push(normalized);
      return acc;
    }
    acc.push({
      sectionTitle: normalized.normalizedSectionTitle,
      items: [normalized],
    });
    return acc;
  }, []);
}
