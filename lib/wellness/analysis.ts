import { loadWellnessDataBundle } from "@/lib/wellness/data-loader";
import {
  buildLifestyleRoutineAdvice,
  buildSectionAdvice,
  buildSupplementDesign,
} from "@/lib/wellness/reportGenerator";
import { computeHealthScore, scoreCommon, scoreSections } from "@/lib/wellness/scoring";
import {
  buildCommonAnswerMap,
  buildQuestionAnswerMap,
  buildSectionAnswerMap,
  deriveSelectedSections,
  type WellnessAnalysisInput,
} from "@/lib/wellness/analysis-answer-maps";

export type {
  WellnessAnalysisAnswerRow,
  WellnessAnalysisInput,
} from "@/lib/wellness/analysis-answer-maps";

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
      items: Array<{
        questionNumber: number;
        score: number;
        text: string;
        questionKey?: string;
        questionText?: string;
        answerText?: string | null;
      }>;
    }
  >;
  highRiskHighlights: Array<{
    category: "detailed" | "common" | "domain" | "section";
    title: string;
    score: number;
    action: string;
    questionNumber?: number;
    sectionId?: string;
    questionKey?: string;
    questionText?: string;
    answerText?: string;
  }>;
  lifestyleRoutineAdvice: string[];
  supplementDesign: Array<{
    sectionId: string;
    title: string;
    paragraphs: string[];
    recommendedNutrients?: Array<{
      code: string;
      label: string;
      labelKo?: string;
      aliases?: string[];
    }>;
  }>;
  perQuestionScores: {
    common: Record<string, number | null>;
    sections: Record<string, Record<string, number | null>>;
  };
};

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
  questionKey?: string;
  questionText?: string;
  answerText?: string | null;
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

function pickRepresentativeRiskCandidate(candidates: RiskCandidate[]) {
  return [...candidates]
    .sort((left, right) => {
      const answerPresenceDiff =
        Number(Boolean(right.answerText && right.answerText.trim())) -
        Number(Boolean(left.answerText && left.answerText.trim()));
      if (answerPresenceDiff !== 0) return answerPresenceDiff;
      return sortRiskCandidates(left, right);
    })
    .at(0);
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
    questionKey: candidate.questionKey,
    questionText: candidate.questionText || undefined,
    answerText: candidate.answerText || undefined,
  } as const;
}

export function computeWellnessResult(input: WellnessAnalysisInput): WellnessComputedResult {
  const { common, sections, rules, texts } = loadWellnessDataBundle();
  const questionAnswers = buildQuestionAnswerMap(input);
  const selectedSections = deriveSelectedSections(input.selectedSections, common, questionAnswers);
  const questionTextById = new Map<string, string>();
  for (const question of common.questions) {
    questionTextById.set(question.id, (question.prompt ?? "").trim() || question.id);
  }
  for (const section of sections.sections) {
    for (const question of section.questions) {
      questionTextById.set(question.id, (question.prompt ?? "").trim() || question.id);
    }
  }
  const answerTextByQuestionId = new Map<string, string>();
  for (const [questionId, answer] of questionAnswers.entries()) {
    const resolvedAnswerText = (answer.answerText ?? answer.answerValue ?? "").trim();
    if (!resolvedAnswerText) continue;
    answerTextByQuestionId.set(questionId, resolvedAnswerText);
  }

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
      const adviceItems = buildSectionAdvice(sectionId, sectionQuestionScores, texts, rules).map((item) => {
        const questionKey = `${sectionId}_Q${String(item.questionNumber).padStart(2, "0")}`;
        return {
          ...item,
          questionKey,
          questionText:
            questionTextById.get(questionKey) ??
            `${section?.title ?? sectionId} ${item.questionNumber}번 문항`,
          answerText: answerTextByQuestionId.get(questionKey) ?? null,
        };
      });
      return [
        sectionId,
        {
          sectionTitle: section?.title ?? sectionId,
          items: adviceItems,
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
      const questionKey =
        item.questionKey ?? `${sectionId}_Q${String(item.questionNumber).padStart(2, "0")}`;
      const questionText =
        item.questionText ??
        questionTextById.get(questionKey) ??
        `${row.sectionTitle} ${item.questionNumber}번 문항`;
      const answerText = item.answerText ?? answerTextByQuestionId.get(questionKey) ?? null;
      detailedCandidates.push({
        category: "detailed",
        title: questionText,
        scorePercent: clampPercent(item.score * 100),
        contextPercent: sectionPercent,
        action: item.text,
        questionNumber: item.questionNumber,
        sectionId,
        questionKey,
        questionText,
        answerText,
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
    const questionText =
      questionTextById.get(questionId) ?? `공통 ${questionNumber}번 문항`;
    const answerText = answerTextByQuestionId.get(questionId) ?? null;
    commonCandidates.push({
      category: "common",
      title: questionText,
      scorePercent: clampPercent(score * 100),
      contextPercent: domain?.percent ?? 0,
      action,
      questionNumber,
      sectionId: undefined,
      questionKey: questionId,
      questionText,
      answerText,
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
  const domainRepresentative =
    worstDomain != null
      ? pickRepresentativeRiskCandidate(
          commonCandidates.filter((candidate) => {
            if (!candidate.questionKey) return false;
            return domainByQuestionId.get(candidate.questionKey)?.id === worstDomain.id;
          })
        )
      : undefined;
  const domainCandidate: RiskCandidate | null = worstDomain
    ? {
        category: "domain",
        title: worstDomain.name,
        scorePercent: clampPercent(worstDomain.percent),
        contextPercent: clampPercent(worstDomain.percent),
        action: `${worstDomain.name} 위험도가 높습니다. 해당 축 생활 루틴을 우선 교정해 주세요.`,
        questionNumber: domainRepresentative?.questionNumber ?? 999,
        questionKey: domainRepresentative?.questionKey,
        questionText: domainRepresentative?.questionText,
        answerText: domainRepresentative?.answerText ?? null,
      }
    : null;

  const worstSection = sectionNeedRows.at(0);
  const sectionRepresentative =
    worstSection != null
      ? pickRepresentativeRiskCandidate(
          detailedCandidates.filter(
            (candidate) => candidate.sectionId === worstSection.sectionId
          )
        )
      : undefined;
  const sectionCandidate: RiskCandidate | null = worstSection
    ? {
        category: "section",
        title: worstSection.sectionTitle,
        scorePercent: clampPercent(worstSection.percent),
        contextPercent: clampPercent(worstSection.percent),
        action: `${worstSection.sectionTitle} 영역 필요도가 높습니다. 우선 관리 영역으로 설정해 주세요.`,
        questionNumber: sectionRepresentative?.questionNumber ?? 999,
        sectionId: worstSection.sectionId,
        questionKey: sectionRepresentative?.questionKey,
        questionText: sectionRepresentative?.questionText,
        answerText: sectionRepresentative?.answerText ?? null,
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
