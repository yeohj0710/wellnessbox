import {
  isSurveyQuestionAnswered,
  resolveGroupFieldValues,
  toInputValue,
  type PublicSurveyAnswers,
  type PublicSurveyQuestionNode,
} from "@/lib/b2b/public-survey";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";

export type SurveySectionGroup = {
  key: string;
  title: string;
  questions: PublicSurveyQuestionNode[];
};

export type NumericRangeRule = {
  min: number;
  max: number;
  label: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHintTextForMatch(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

function parseFiniteNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveNumberRangeForQuestion(
  question: WellnessSurveyQuestionForTemplate
): NumericRangeRule | null {
  const key = (question.key ?? "").toLowerCase();
  const text = `${question.text ?? ""} ${question.placeholder ?? ""}`.toLowerCase();
  if (key === "c02" || text.includes("나이")) return { min: 0, max: 120, label: "나이" };
  if (text.includes("몸무게") || text.includes("체중") || text.includes("kg")) {
    return { min: 20, max: 250, label: "몸무게" };
  }
  if (text.includes("키") || text.includes("cm")) return { min: 50, max: 250, label: "키" };
  return null;
}

export function resolveNumberRangeForGroupField(field: {
  id?: string | null;
  label?: string | null;
  unit?: string | null;
}): NumericRangeRule | null {
  const id = (field.id ?? "").toLowerCase();
  const label = (field.label ?? "").toLowerCase();
  const unit = (field.unit ?? "").toLowerCase();
  if (id.includes("age") || label.includes("나이")) return { min: 0, max: 120, label: "나이" };
  if (id.includes("weight") || label.includes("몸무게") || label.includes("체중") || unit === "kg") {
    return { min: 20, max: 250, label: "몸무게" };
  }
  if (id.includes("height") || label.includes("키") || unit === "cm") {
    return { min: 50, max: 250, label: "키" };
  }
  return null;
}

export function buildOutOfRangeWarning(rule: NumericRangeRule, value: string): string | null {
  const parsed = parseFiniteNumber(value);
  if (parsed == null) return null;
  if (parsed < rule.min || parsed > rule.max) {
    return `입력 범위를 확인해 주세요. ${rule.label}는 ${rule.min}~${rule.max} 범위로 입력해 주세요.`;
  }
  return null;
}

export function toDisplayQuestionText(question: WellnessSurveyQuestionForTemplate) {
  let text = (question.text ?? "")
    .replace(/귀하께서는/g, "")
    .replace(/귀하께서/g, "")
    .replace(/귀하가/g, "")
    .replace(/귀하의/g, "")
    .replace(/귀하는/g, "")
    .replace(/귀하\b/g, "")
    .replace(/\s*만\s*\(\s*\)\s*세/gi, "")
    .replace(/만\s*나이/g, "나이")
    .replace(/\(\s*\)/g, "")
    .replace(/해주십시오/g, "해 주세요")
    .replace(/기재해/g, "입력해")
    .replace(/^\s*여성일\s*경우/g, "여성이라면")
    .replace(/^\s*남성일\s*경우/g, "남성이라면")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/^\s*[\uC758\uAC00\uB294]\s+/, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  if (question.type === "group" && (question.fields?.length ?? 0) > 0) {
    const trailingUnits = (question.fields ?? [])
      .map((field) => {
        const label = (field.label ?? "").trim();
        if (!label) return "";
        const unit = (field.unit ?? "").trim();
        if (!unit) return escapeRegExp(label);
        return `${escapeRegExp(label)}\\s*\\(?\\s*${escapeRegExp(unit)}\\s*\\)?`;
      })
      .filter(Boolean);
    if (trailingUnits.length > 0) {
      const trailingPattern = new RegExp(
        `(?:\\s*[:,-]?\\s*)?(?:${trailingUnits.join("\\s+")})\\s*$`,
        "i"
      );
      text = text.replace(trailingPattern, "").trim();
    }
  }

  return text.replace(/\s+[,.]$/g, "").trim();
}

export function resolveProgressMessage(percent: number) {
  if (percent <= 0) return "설문을 시작해 주세요.";
  if (percent < 25) return "좋은 출발입니다.";
  if (percent < 50) return "차근차근 잘 진행 중입니다.";
  if (percent < 75) return "절반 이상 진행됐습니다.";
  if (percent < 100) return "거의 완료 단계입니다.";
  return "설문이 완료되었습니다.";
}

export function isOptionalSelectionQuestion(question: WellnessSurveyQuestionForTemplate) {
  if (question.type !== "single" && question.type !== "multi") return false;
  return !question.required;
}

export function isQuestionEffectivelyRequired(question: WellnessSurveyQuestionForTemplate) {
  return question.required;
}

export function isOptionalHintLikeText(text: string | undefined, optionalHint: string) {
  if (!text) return false;
  const normalized = normalizeHintTextForMatch(text);
  const baseHint = normalizeHintTextForMatch(optionalHint);
  if (normalized === baseHint) return true;
  if (normalized.includes("선택하지않고다음")) return true;
  return (
    normalized.includes("해당") &&
    normalized.includes("없으면") &&
    normalized.includes("선택") &&
    normalized.includes("다음")
  );
}

export function isNoneLikeOption(option: { label?: string | null; value?: string | null }) {
  const normalized = `${option.label ?? ""}${option.value ?? ""}`
    .replace(/\s+/g, "")
    .toLowerCase();
  return (
    normalized === "없음" ||
    normalized.includes("해당없음") ||
    normalized === "none"
  );
}

export function resolveQuestionNumericWarning(
  question: WellnessSurveyQuestionForTemplate,
  answer: unknown
): string | null {
  if (question.type === "number") {
    const rule = resolveNumberRangeForQuestion(question);
    if (!rule) return null;
    return buildOutOfRangeWarning(rule, toInputValue(answer));
  }

  if (question.type === "group") {
    const fields = question.fields ?? [];
    const values = resolveGroupFieldValues(question, answer);
    for (const field of fields) {
      if (field.type !== "number") continue;
      const rule = resolveNumberRangeForGroupField(field);
      if (!rule) continue;
      const warning = buildOutOfRangeWarning(rule, values[field.id] ?? "");
      if (warning) return warning;
    }
  }

  return null;
}

export function resolveOptionLayout(options: Array<{ label?: string | null }>) {
  const count = options.length;
  const lengths = options.map((option) => (option.label ?? "").replace(/\s+/g, "").length);
  const maxLabelLength = lengths.length > 0 ? Math.max(...lengths) : 0;
  const avgLabelLength =
    lengths.length > 0
      ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length)
      : 0;
  const shortLabelRatio =
    lengths.length > 0 ? lengths.filter((len) => len <= 7).length / lengths.length : 0;
  const prefersWideCards = maxLabelLength >= 9 || avgLabelLength >= 7;
  const denseText = maxLabelLength >= 10 || avgLabelLength >= 8;

  if (count <= 1) return { gridClass: "grid-cols-1", compact: false, denseText: false };
  if (count === 2) return { gridClass: "grid-cols-2", compact: false, denseText: false };

  const canUseThreeColsOnMobile =
    count >= 12 && shortLabelRatio >= 0.65 && avgLabelLength <= 8;
  if (canUseThreeColsOnMobile) {
    if (prefersWideCards) {
      return {
        gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        compact: true,
        denseText,
      };
    }
    if (count >= 12) {
      return {
        gridClass: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5",
        compact: true,
        denseText,
      };
    }
    if (count >= 9) {
      return {
        gridClass: "grid-cols-3 sm:grid-cols-4",
        compact: true,
        denseText,
      };
    }
    return {
      gridClass: "grid-cols-3 sm:grid-cols-3 lg:grid-cols-4",
      compact: true,
      denseText,
    };
  }

  if (count <= 6) {
    return {
      gridClass: "grid-cols-2 sm:grid-cols-3",
      compact: false,
      denseText,
    };
  }
  return {
    gridClass: prefersWideCards ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    compact: count >= 10 && maxLabelLength <= 10,
    denseText,
  };
}

export function buildSurveySections(
  list: PublicSurveyQuestionNode[],
  selectedSections: string[],
  sectionTitleMap: Map<string, string>,
  commonSectionTitle: string
) {
  const groups: SurveySectionGroup[] = [];
  const used = new Set<string>();

  const common = list.filter((item) => item.sectionKey === null);
  if (common.length > 0) {
    groups.push({ key: "common", title: commonSectionTitle, questions: common });
    used.add("common");
  }

  for (const sectionKey of selectedSections) {
    const questions = list.filter((item) => item.sectionKey === sectionKey);
    if (questions.length === 0) continue;
    groups.push({
      key: sectionKey,
      title: sectionTitleMap.get(sectionKey) || sectionKey,
      questions,
    });
    used.add(sectionKey);
  }

  for (const item of list) {
    if (!item.sectionKey || used.has(item.sectionKey)) continue;
    const questions = list.filter((node) => node.sectionKey === item.sectionKey);
    if (questions.length === 0) continue;
    groups.push({
      key: item.sectionKey,
      title: sectionTitleMap.get(item.sectionKey) || item.sectionKey,
      questions,
    });
    used.add(item.sectionKey);
  }
  return groups;
}

export function getFocusedIndex(
  section: SurveySectionGroup | null,
  focusedKey: string | undefined,
  answers: PublicSurveyAnswers
) {
  if (!section || section.questions.length === 0) return -1;
  if (focusedKey) {
    const idx = section.questions.findIndex((item) => item.question.key === focusedKey);
    if (idx >= 0) return idx;
  }
  const firstUnanswered = section.questions.findIndex(
    (item) => !isSurveyQuestionAnswered(item.question, answers[item.question.key])
  );
  return firstUnanswered >= 0 ? firstUnanswered : 0;
}
