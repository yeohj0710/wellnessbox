import {
  buildPublicSurveyQuestionList,
  isSurveyQuestionAnswered,
  normalizeSurveyAnswersByTemplate,
  resolveSurveySelectionState,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import { resolveAutoComputedSurveyState } from "@/app/survey/_lib/survey-page-auto-compute";
import { buildSurveySections, getFocusedIndex } from "@/app/survey/_lib/survey-page-helpers";
import { tryComputeSurveyResultFromAnswers } from "@/app/survey/_lib/survey-result-derivation";

export type SurveyPhase = "intro" | "survey" | "calculating" | "result";
export type PersistedSurveyPhase = Exclude<SurveyPhase, "calculating">;

export type PersistedSurveyState = {
  phase: PersistedSurveyPhase;
  currentSectionIndex: number;
  focusedQuestionBySection?: Record<string, string>;
  confirmedQuestionKeys?: string[];
  completedSectionKeys?: string[];
  updatedAt?: string;
  periodKey?: string;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
};

export type RestoredSurveyState = {
  phase: PersistedSurveyPhase;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  surveyPeriodKey: string | null;
  currentSectionIndex: number;
  focusedQuestionBySection: Record<string, string>;
  confirmedQuestionKeys: string[];
  completedSectionKeys: string[];
  hasCompletedSubmission: boolean;
  result: WellnessComputedResult | null;
  updatedAtMs: number;
};

type RestorePersistedSurveyStateInput = {
  storageKey: string;
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
};

export function restorePersistedSurveyState(
  input: RestorePersistedSurveyStateInput
): RestoredSurveyState | null {
  const raw = window.localStorage.getItem(input.storageKey);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<PersistedSurveyState> & { currentIndex?: number };
  const parsedUpdatedAtMs =
    typeof parsed.updatedAt === "string" ? new Date(parsed.updatedAt).getTime() : 0;
  const updatedAtMs = Number.isFinite(parsedUpdatedAtMs) ? parsedUpdatedAtMs : 0;

  const loadedAnswers =
    parsed.answers && typeof parsed.answers === "object"
      ? normalizeSurveyAnswersByTemplate(input.template, parsed.answers as PublicSurveyAnswers)
      : {};
  const seededSections = Array.isArray(parsed.selectedSections)
    ? parsed.selectedSections.filter((value): value is string => typeof value === "string")
    : [];
  const nextSelectionState = resolveSurveySelectionState({
    template: input.template,
    answers: loadedAnswers,
    selectedSections: seededSections,
  });
  const nextSelectedSections = nextSelectionState.selectedSections;
  const prunedAnswers = nextSelectionState.answers;
  const rawList = buildPublicSurveyQuestionList(input.template, prunedAnswers, nextSelectedSections, {
    deriveSelectedSections: false,
  });
  const autoComputed = resolveAutoComputedSurveyState({
    answers: prunedAnswers,
    questionList: rawList,
    maxSelectedSections: input.maxSelectedSections,
  });
  const restoredList = rawList.filter(
    (item) => !autoComputed.hiddenQuestionKeys.has(item.question.key)
  );
  const restoredKeySet = new Set(restoredList.map((item) => item.question.key));
  const restoredSections = buildSurveySections(
    restoredList,
    nextSelectedSections,
    input.sectionTitleMap,
    input.commonSectionTitle
  );

  const requested =
    typeof parsed.currentSectionIndex === "number"
      ? parsed.currentSectionIndex
      : typeof parsed.currentIndex === "number"
        ? parsed.currentIndex
        : 0;
  const currentSectionIndex =
    restoredSections.length > 0 ? Math.max(0, Math.min(requested, restoredSections.length - 1)) : 0;

  let focusedQuestionBySection: Record<string, string> = {};
  if (parsed.focusedQuestionBySection && typeof parsed.focusedQuestionBySection === "object") {
    const sourceMap = parsed.focusedQuestionBySection as Record<string, string>;
    const sanitized: Record<string, string> = {};
    for (const section of restoredSections) {
      const questionKey = sourceMap[section.key];
      if (!questionKey) continue;
      if (!section.questions.some((item) => item.question.key === questionKey)) continue;
      sanitized[section.key] = questionKey;
    }
    focusedQuestionBySection = sanitized;
  }

  const confirmedQuestionKeys = Array.isArray(parsed.confirmedQuestionKeys)
    ? parsed.confirmedQuestionKeys
        .filter((key): key is string => typeof key === "string")
        .filter((key) => restoredKeySet.has(key))
    : [];
  const restoredSectionKeySet = new Set(restoredSections.map((section) => section.key));
  const completedSectionKeys = Array.isArray(parsed.completedSectionKeys)
    ? parsed.completedSectionKeys
        .filter((key): key is string => typeof key === "string")
        .filter((key) => restoredSectionKeySet.has(key))
    : [];
  const phase = parsed.phase === "result" ? "result" : parsed.phase === "survey" ? "survey" : "intro";
  const hasCompletedSubmission = phase === "result";

  return {
    phase,
    answers: prunedAnswers,
    selectedSections: nextSelectedSections,
    surveyPeriodKey: typeof parsed.periodKey === "string" ? parsed.periodKey : null,
    currentSectionIndex,
    focusedQuestionBySection,
    confirmedQuestionKeys,
    completedSectionKeys,
    hasCompletedSubmission,
    result: hasCompletedSubmission
      ? tryComputeSurveyResultFromAnswers({
          template: input.template,
          answers: prunedAnswers,
          selectedSections: nextSelectedSections,
        })
      : null,
    updatedAtMs,
  };
}

export function createPersistedSurveyState(input: {
  phase: SurveyPhase;
  currentSectionIndex: number;
  focusedQuestionBySection: Record<string, string>;
  confirmedQuestionKeys: string[];
  completedSectionKeys: string[];
  surveyPeriodKey: string | null;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
}): PersistedSurveyState {
  return {
    phase: input.phase === "calculating" ? "survey" : input.phase,
    currentSectionIndex: input.currentSectionIndex,
    focusedQuestionBySection: input.focusedQuestionBySection,
    confirmedQuestionKeys: input.confirmedQuestionKeys,
    completedSectionKeys: input.completedSectionKeys,
    updatedAt: new Date().toISOString(),
    periodKey: input.surveyPeriodKey ?? undefined,
    answers: input.answers,
    selectedSections: input.selectedSections,
  };
}

export function deriveRemoteSurveySnapshotState(input: {
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
  submittedAt?: string | null;
}) {
  const nextSelectionState = resolveSurveySelectionState({
    template: input.template,
    answers: input.answers,
    selectedSections: input.selectedSections,
  });
  const derivedSelectedSections = nextSelectionState.selectedSections;
  const prunedAnswers = nextSelectionState.answers;
  const rawList = buildPublicSurveyQuestionList(input.template, prunedAnswers, derivedSelectedSections, {
    deriveSelectedSections: false,
  });
  const autoComputed = resolveAutoComputedSurveyState({
    answers: prunedAnswers,
    questionList: rawList,
    maxSelectedSections: input.maxSelectedSections,
  });
  const nextQuestionList = rawList.filter(
    (item) => !autoComputed.hiddenQuestionKeys.has(item.question.key)
  );
  const nextSections = buildSurveySections(
    nextQuestionList,
    derivedSelectedSections,
    input.sectionTitleMap,
    input.commonSectionTitle
  );
  let nextSectionIndex = 0;
  for (let idx = 0; idx < nextSections.length; idx += 1) {
    const hasUnanswered = nextSections[idx].questions.some(
      (item) => !isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key])
    );
    if (hasUnanswered) {
      nextSectionIndex = idx;
      break;
    }
    if (idx === nextSections.length - 1) nextSectionIndex = idx;
  }
  const targetSection = nextSections[nextSectionIndex] ?? null;
  const targetQuestionIndex = getFocusedIndex(targetSection, undefined, prunedAnswers);
  const targetQuestionKey =
    targetSection && targetQuestionIndex >= 0
      ? targetSection.questions[targetQuestionIndex].question.key
      : "";
  const confirmedQuestionKeys = nextQuestionList
    .filter((item) => isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key]))
    .map((item) => item.question.key);
  const completedSectionKeys = input.submittedAt
    ? nextSections.map((section) => section.key)
    : nextSections.slice(0, nextSectionIndex).map((section) => section.key);

  return {
    answers: prunedAnswers,
    selectedSections: derivedSelectedSections,
    currentSectionIndex: nextSectionIndex,
    focusedQuestionBySection:
      targetSection && targetQuestionKey ? { [targetSection.key]: targetQuestionKey } : {},
    confirmedQuestionKeys,
    completedSectionKeys,
  };
}
