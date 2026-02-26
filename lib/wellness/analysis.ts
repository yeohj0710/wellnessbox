import {
  loadWellnessDataBundle,
  type WellnessCommonSurvey,
  type WellnessSectionSurvey,
} from "@/lib/wellness/data-loader";
import {
  buildLifestyleRoutineAdvice,
  buildSectionAdvice,
  buildSupplementDesign,
} from "@/lib/wellness/reportGenerator";
import {
  computeHealthScore,
  scoreCommon,
  scoreSections,
  type CommonAnswerMap,
  type SectionAnswerMapBySectionId,
  type WellnessAnswerValue,
} from "@/lib/wellness/scoring";

export type WellnessAnalysisAnswerRow = {
  questionKey: string;
  sectionKey: string | null;
  answerText: string | null;
  answerValue: string | null;
  score?: number | null;
  meta?: unknown;
};

export type WellnessAnalysisInput = {
  selectedSections: string[];
  answersJson: Record<string, unknown> | null;
  answers: WellnessAnalysisAnswerRow[];
};

export type WellnessComputedResult = {
  schemaVersion: string;
  selectedSections: string[];
  lifestyleRisk: {
    domainScoresNormalized: Record<string, number>;
    domainScoresPercent: Record<string, number>;
    domains: Array<{
      id: string;
      name: string;
      normalized: number;
      percent: number;
    }>;
    overallPercent: number;
  };
  healthManagementNeed: {
    sectionNeedPercentById: Record<string, number>;
    sections: Array<{
      sectionId: string;
      sectionTitle: string;
      percent: number;
    }>;
    averagePercent: number;
  };
  overallHealthScore: number;
  sectionAdvice: Record<
    string,
    {
      sectionTitle: string;
      items: Array<{ questionNumber: number; score: number; text: string }>;
    }
  >;
  highRiskHighlights: Array<{
    category: "detailed" | "common" | "domain" | "section";
    title: string;
    score: number;
    action: string;
    questionNumber?: number;
    sectionId?: string;
  }>;
  lifestyleRoutineAdvice: string[];
  supplementDesign: Array<{
    sectionId: string;
    title: string;
    paragraphs: string[];
  }>;
  perQuestionScores: {
    common: Record<string, number | null>;
    sections: Record<string, Record<string, number | null>>;
  };
};

function toText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeSelectedValues(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.map((item) => toText(item)).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,\n/|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseAnswerValue(raw: unknown): WellnessAnswerValue {
  if (raw == null) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }
  if (Array.isArray(raw)) {
    const selectedValues = normalizeSelectedValues(raw);
    return {
      answerText: selectedValues.join(", ") || null,
      answerValue: null,
      selectedValues,
    };
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    const text = toText(raw);
    return {
      answerText: text || null,
      answerValue: text || null,
      selectedValues: text ? [text] : [],
    };
  }

  const row = asRecord(raw);
  if (!row) {
    return { answerText: null, answerValue: null, selectedValues: [] };
  }

  const answerText = toText(row.answerText ?? row.text) || null;
  const answerValue = toText(row.answerValue ?? row.value) || null;
  const selectedValues = normalizeSelectedValues(row.selectedValues ?? row.values);
  const fieldValues = asRecord(row.fieldValues);
  const fieldTokens = fieldValues
    ? Object.values(fieldValues).map((item) => toText(item)).filter(Boolean)
    : [];
  const fieldText = fieldTokens.join(", ");
  const score =
    typeof row.score === "number" && Number.isFinite(row.score) ? row.score : null;
  const variantId = toText(row.variantId) || null;

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
        : fieldTokens.length > 0
        ? fieldTokens
        : [],
    score,
    variantId,
  };
}

function toAnswerValueFromRow(row: WellnessAnalysisAnswerRow): WellnessAnswerValue {
  const meta = asRecord(row.meta);
  const selectedValues = normalizeSelectedValues(meta?.selectedValues);
  const fieldValues = asRecord(meta?.fieldValues);
  const fieldTokens = fieldValues
    ? Object.values(fieldValues).map((item) => toText(item)).filter(Boolean)
    : [];
  const variantId = toText(meta?.variantId) || null;

  return {
    answerText: row.answerText ?? null,
    answerValue: row.answerValue ?? null,
    selectedValues:
      selectedValues.length > 0
        ? selectedValues
        : row.answerValue
        ? [row.answerValue]
        : row.answerText
        ? [row.answerText]
        : fieldTokens.length > 0
        ? fieldTokens
        : [],
    score: typeof row.score === "number" ? row.score : null,
    variantId,
  };
}

function buildQuestionAnswerMap(input: WellnessAnalysisInput) {
  const map = new Map<string, WellnessAnswerValue>();

  for (const [questionKey, rawValue] of Object.entries(input.answersJson ?? {})) {
    map.set(questionKey, parseAnswerValue(rawValue));
  }

  for (const row of input.answers) {
    if (!row.questionKey) continue;
    map.set(row.questionKey, toAnswerValueFromRow(row));
  }

  return map;
}

function deriveSelectedSections(
  selectedSections: string[],
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
) {
  const selected = new Set(selectedSections.filter(Boolean));
  const c27 = commonDef.questions.find((question) => question.id === "C27");
  const c27Answer = questionAnswers.get("C27");
  for (const token of c27Answer?.selectedValues ?? []) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) continue;
    const matched = c27?.options?.find((option) => {
      if (option.value.toLowerCase() === normalized) return true;
      if (option.label.toLowerCase() === normalized) return true;
      return (option.aliases ?? []).some(
        (alias) => alias.trim().toLowerCase() === normalized
      );
    });
    if (matched) selected.add(matched.value);
  }

  const maxSelected = c27?.constraints?.maxSelections ?? 5;
  return [...selected].slice(0, maxSelected);
}

function buildCommonAnswerMap(
  commonDef: WellnessCommonSurvey,
  questionAnswers: Map<string, WellnessAnswerValue>
): CommonAnswerMap {
  const commonAnswers: CommonAnswerMap = {};
  for (const question of commonDef.questions) {
    commonAnswers[question.id] = questionAnswers.get(question.id) ?? null;
  }
  return commonAnswers;
}

function buildSectionAnswerMap(
  sectionsDef: WellnessSectionSurvey,
  selectedSections: string[],
  questionAnswers: Map<string, WellnessAnswerValue>
): SectionAnswerMapBySectionId {
  const selectedSet = new Set(selectedSections);
  const answerMap: SectionAnswerMapBySectionId = {};

  for (const section of sectionsDef.sections) {
    if (!selectedSet.has(section.id)) continue;
    answerMap[section.id] = {};
    for (const question of section.questions) {
      answerMap[section.id][question.id] = questionAnswers.get(question.id) ?? null;
    }
  }
  return answerMap;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

type RiskCandidate = {
  category: "detailed" | "common" | "domain" | "section";
  title: string;
  scorePercent: number;
  contextPercent: number;
  action: string;
  questionNumber: number;
  sectionId?: string;
};

function sortRiskCandidates(left: RiskCandidate, right: RiskCandidate) {
  if (right.scorePercent !== left.scorePercent) {
    return right.scorePercent - left.scorePercent;
  }
  if (right.contextPercent !== left.contextPercent) {
    return right.contextPercent - left.contextPercent;
  }
  if (left.questionNumber !== right.questionNumber) {
    return left.questionNumber - right.questionNumber;
  }
  return left.title.localeCompare(right.title);
}

function toHighlight(candidate: RiskCandidate) {
  return {
    category: candidate.category,
    title: candidate.title,
    score: Math.round(clampPercent(candidate.scorePercent)),
    action: candidate.action,
    questionNumber: Number.isFinite(candidate.questionNumber)
      ? candidate.questionNumber
      : undefined,
    sectionId: candidate.sectionId,
  } as const;
}

export function computeWellnessResult(input: WellnessAnalysisInput): WellnessComputedResult {
  const { common, sections, rules, texts } = loadWellnessDataBundle();
  const questionAnswers = buildQuestionAnswerMap(input);
  const selectedSections = deriveSelectedSections(input.selectedSections, common, questionAnswers);

  const commonAnswers = buildCommonAnswerMap(common, questionAnswers);
  const sectionAnswersBySectionId = buildSectionAnswerMap(
    sections,
    selectedSections,
    questionAnswers
  );

  const commonScoring = scoreCommon(commonAnswers, rules, common);
  const sectionScoring = scoreSections(sectionAnswersBySectionId, rules, sections);
  const overallHealthScore = computeHealthScore(
    commonScoring.overallPercent,
    sectionScoring.averagePercent,
    rules
  );

  const domains = rules.lifestyleRisk.domains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    normalized: commonScoring.domainScoresNormalized[domain.id] ?? 0,
    percent: commonScoring.domainScoresPercent[domain.id] ?? 0,
  }));

  const sectionNeedRows = selectedSections
    .map((sectionId) => {
      const section = sections.sections.find((item) => item.id === sectionId);
      return {
        sectionId,
        sectionTitle: section?.title ?? sectionId,
        percent: sectionScoring.sectionNeedPercentById[sectionId] ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.percent !== left.percent) return right.percent - left.percent;
      return left.sectionId.localeCompare(right.sectionId);
    });

  const sectionAdvice = Object.fromEntries(
    selectedSections.map((sectionId) => {
      const section = sections.sections.find((item) => item.id === sectionId);
      const sectionQuestionScores = sectionScoring.perQuestionScores[sectionId] ?? {};
      return [
        sectionId,
        {
          sectionTitle: section?.title ?? sectionId,
          items: buildSectionAdvice(sectionId, sectionQuestionScores, texts, rules),
        },
      ];
    })
  );

  const supplementDesign = buildSupplementDesign(
    sectionNeedRows.map((row) => ({
      sectionId: row.sectionId,
      score: row.percent,
    })),
    texts,
    rules
  );

  const domainByQuestionId = new Map<string, { id: string; name: string; percent: number }>();
  for (const domain of domains) {
    const domainDef = rules.lifestyleRisk.domains.find((item) => item.id === domain.id);
    if (!domainDef) continue;
    for (const questionId of domainDef.questionIds) {
      domainByQuestionId.set(questionId, {
        id: domain.id,
        name: domain.name,
        percent: domain.percent,
      });
    }
  }

  const sectionPercentById = new Map(sectionNeedRows.map((row) => [row.sectionId, row.percent]));

  const detailedCandidates: RiskCandidate[] = [];
  for (const [sectionId, row] of Object.entries(sectionAdvice)) {
    const sectionPercent = sectionPercentById.get(sectionId) ?? 0;
    for (const item of row.items) {
      detailedCandidates.push({
        category: "detailed",
        title: `${row.sectionTitle} Q${item.questionNumber}`,
        scorePercent: clampPercent(item.score * 100),
        contextPercent: sectionPercent,
        action: item.text,
        questionNumber: item.questionNumber,
        sectionId,
      });
    }
  }

  const commonCandidates: RiskCandidate[] = [];
  for (let questionNumber = 10; questionNumber <= 26; questionNumber += 1) {
    const questionId = `C${String(questionNumber).padStart(2, "0")}`;
    const score = commonScoring.perQuestionScores[questionId];
    if (typeof score !== "number") continue;
    const action = texts.lifestyleRoutineAdviceByCommonQuestionNumber[String(questionNumber)];
    if (!action) continue;
    const domain = domainByQuestionId.get(questionId);
    commonCandidates.push({
      category: "common",
      title: `Q${questionNumber}`,
      scorePercent: clampPercent(score * 100),
      contextPercent: domain?.percent ?? 0,
      action,
      questionNumber,
      sectionId: undefined,
    });
  }

  const questionCandidates = [...detailedCandidates, ...commonCandidates];
  const primaryQuestionCandidates = questionCandidates.filter(
    (item) => item.scorePercent >= 75
  );
  const fallbackQuestionCandidates = questionCandidates.filter(
    (item) => item.scorePercent >= 50
  );
  const pickedQuestionCandidates =
    primaryQuestionCandidates.length > 0
      ? primaryQuestionCandidates
      : fallbackQuestionCandidates;

  const worstDomain = [...domains]
    .sort((left, right) => right.percent - left.percent)
    .at(0);
  const domainCandidate: RiskCandidate | null = worstDomain
    ? {
        category: "domain",
        title: worstDomain.name,
        scorePercent: clampPercent(worstDomain.percent),
        contextPercent: clampPercent(worstDomain.percent),
        action: `${worstDomain.name} 위험도가 높습니다. 해당 축 생활 루틴을 우선 교정해 주세요.`,
        questionNumber: 999,
      }
    : null;

  const worstSection = sectionNeedRows.at(0);
  const sectionCandidate: RiskCandidate | null = worstSection
    ? {
        category: "section",
        title: worstSection.sectionTitle,
        scorePercent: clampPercent(worstSection.percent),
        contextPercent: clampPercent(worstSection.percent),
        action: `${worstSection.sectionTitle} 영역 필요도가 높습니다. 우선 관리 영역으로 설정해 주세요.`,
        questionNumber: 999,
        sectionId: worstSection.sectionId,
      }
    : null;

  const maxHighlights = 5;
  const selectedQuestionHighlights = [...pickedQuestionCandidates]
    .sort(sortRiskCandidates)
    .slice(0, maxHighlights);
  const requiredCandidates = [domainCandidate, sectionCandidate].filter(
    (candidate): candidate is RiskCandidate => Boolean(candidate)
  );

  let mergedHighlights = [...selectedQuestionHighlights];
  for (const required of requiredCandidates) {
    const exists = mergedHighlights.some((item) => item.category === required.category);
    if (exists) continue;
    if (mergedHighlights.length < maxHighlights) {
      mergedHighlights.push(required);
    } else {
      mergedHighlights = [...mergedHighlights]
        .sort(sortRiskCandidates)
        .slice(0, maxHighlights - 1);
      mergedHighlights.push(required);
    }
  }

  mergedHighlights = [...mergedHighlights].sort(sortRiskCandidates).slice(0, maxHighlights);

  for (const required of requiredCandidates) {
    const exists = mergedHighlights.some((item) => item.category === required.category);
    if (exists) continue;
    const next = [...mergedHighlights].slice(0, Math.max(0, maxHighlights - 1));
    next.push(required);
    mergedHighlights = next.sort(sortRiskCandidates).slice(0, maxHighlights);
  }

  const highRiskHighlights = mergedHighlights.map((candidate) => toHighlight(candidate));

  return {
    schemaVersion: "wellness-score-v1",
    selectedSections,
    lifestyleRisk: {
      domainScoresNormalized: commonScoring.domainScoresNormalized,
      domainScoresPercent: commonScoring.domainScoresPercent,
      domains,
      overallPercent: commonScoring.overallPercent,
    },
    healthManagementNeed: {
      sectionNeedPercentById: sectionScoring.sectionNeedPercentById,
      sections: sectionNeedRows,
      averagePercent: sectionScoring.averagePercent,
    },
    overallHealthScore,
    sectionAdvice,
    highRiskHighlights,
    lifestyleRoutineAdvice: buildLifestyleRoutineAdvice(
      commonScoring.perQuestionScores,
      texts,
      rules
    ),
    supplementDesign,
    perQuestionScores: {
      common: commonScoring.perQuestionScores,
      sections: sectionScoring.perQuestionScores,
    },
  };
}
