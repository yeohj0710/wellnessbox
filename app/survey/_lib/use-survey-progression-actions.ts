import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  buildPublicSurveyQuestionList,
  isSurveyQuestionAnswered,
  resolveSurveySelectionState,
  sanitizeSurveyAnswerValue,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
} from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import { isOptionalSelectionQuestion, resolveQuestionNumericWarning, type SurveySectionGroup } from "./survey-page-helpers";
import { CALCULATING_MESSAGES } from "./survey-page-copy";
import { resolveAutoComputedSurveyState } from "./survey-page-auto-compute";
import { computeSurveyResultFromAnswers } from "./survey-result-derivation";
import {
  buildEffectiveSurveyStructure,
  findSectionValidationIssue,
  hasSameSectionSelection,
  resolveCurrentSectionQuestionContext,
} from "./survey-progression-helpers";

type AdvanceParams = {
  fromQuestionKey?: string;
  answerOverride?: unknown;
};

type UseSurveyProgressionActionsInput = {
  template: WellnessSurveyTemplate;
  c27Key: string;
  maxSelectedSections: number;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  currentSection: SurveySectionGroup | null;
  currentSectionIndex: number;
  focusedQuestionBySection: Record<string, string>;
  surveySections: SurveySectionGroup[];
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
  isSectionTransitioning: boolean;
  authVerified: boolean;
  surveyPeriodKey: string | null;
  calcTickerRef: MutableRefObject<number | null>;
  calcTimeoutRef: MutableRefObject<number | null>;
  buildVisibleQuestionList: (
    inputAnswers: PublicSurveyAnswers,
    selectedSections: string[]
  ) => ReturnType<typeof buildPublicSurveyQuestionList>;
  moveToSection: (nextIndex: number) => void;
  scrollToQuestion: (questionKey: string, options?: { align?: "comfort" | "center" }) => void;
  persistSurveySnapshot: (input: {
    answers: PublicSurveyAnswers;
    selectedSections: string[];
    finalize: boolean;
    periodKey?: string | null;
  }) => Promise<void>;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
  setSelectedSectionsCommitted: Dispatch<SetStateAction<string[]>>;
  setCurrentSectionIndex: Dispatch<SetStateAction<number>>;
  setFocusedQuestionBySection: Dispatch<SetStateAction<Record<string, string>>>;
  setCompletedSectionKeys: Dispatch<SetStateAction<string[]>>;
  setPhase: Dispatch<SetStateAction<"intro" | "survey" | "calculating" | "result">>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
  setErrorText: Dispatch<SetStateAction<string | null>>;
  setErrorQuestionKey: Dispatch<SetStateAction<string | null>>;
  setCalcPercent: Dispatch<SetStateAction<number>>;
  setCalcMessageIndex: Dispatch<SetStateAction<number>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
  setIsSectionTransitioning: Dispatch<SetStateAction<boolean>>;
  addConfirmedQuestion: (questionKey: string, visibleKeys: Set<string>) => void;
};

export function useSurveyProgressionActions({
  template,
  c27Key,
  maxSelectedSections,
  answers,
  selectedSectionsCommitted,
  currentSection,
  currentSectionIndex,
  focusedQuestionBySection,
  surveySections,
  sectionTitleMap,
  commonSectionTitle,
  isSectionTransitioning,
  authVerified,
  surveyPeriodKey,
  calcTickerRef,
  calcTimeoutRef,
  buildVisibleQuestionList,
  moveToSection,
  scrollToQuestion,
  persistSurveySnapshot,
  setAnswers,
  setSelectedSectionsCommitted,
  setCurrentSectionIndex,
  setFocusedQuestionBySection,
  setCompletedSectionKeys,
  setPhase,
  setResult,
  setErrorText,
  setErrorQuestionKey,
  setCalcPercent,
  setCalcMessageIndex,
  setHasCompletedSubmission,
  setIsSectionTransitioning,
  addConfirmedQuestion,
}: UseSurveyProgressionActionsInput) {
  const clearNavigationError = useCallback(() => {
    setErrorQuestionKey(null);
    setErrorText(null);
  }, [setErrorQuestionKey, setErrorText]);

  const startCalculation = useCallback(
    (finalAnswers: PublicSurveyAnswers, finalSections: string[]) => {
      const resolvedAnswers = resolveAutoComputedSurveyState({
        answers: finalAnswers,
        questionList: buildPublicSurveyQuestionList(template, finalAnswers, finalSections, {
          deriveSelectedSections: false,
        }),
        maxSelectedSections,
      }).answers;

      if (resolvedAnswers !== finalAnswers) {
        setAnswers(resolvedAnswers);
      }

      setCompletedSectionKeys((prev) => {
        const next = new Set(prev);
        for (const section of surveySections) next.add(section.key);
        return [...next];
      });
      setPhase("calculating");
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
      }
      setResult(null);
      clearNavigationError();
      setCalcPercent(8);
      setCalcMessageIndex(0);
      if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
      if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);

      calcTickerRef.current = window.setInterval(() => {
        setCalcPercent((prev) => (prev >= 92 ? prev : prev + (prev < 70 ? 8 : 4)));
        setCalcMessageIndex((prev) => (prev + 1) % CALCULATING_MESSAGES.length);
      }, 420);

      calcTimeoutRef.current = window.setTimeout(() => {
        try {
          setResult(
            computeSurveyResultFromAnswers({
              template,
              answers: resolvedAnswers,
              selectedSections: finalSections,
            })
          );
          setCalcPercent(100);
          setHasCompletedSubmission(true);
          if (authVerified) {
            void persistSurveySnapshot({
              answers: resolvedAnswers,
              selectedSections: finalSections,
              finalize: true,
              periodKey: surveyPeriodKey,
            }).catch(() => null);
          }
          setPhase("result");
        } catch {
          setPhase("survey");
          setErrorText("analysis_failed");
        } finally {
          if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
          if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
        }
      }, 1700);
    },
    [
      authVerified,
      calcTickerRef,
      calcTimeoutRef,
      clearNavigationError,
      maxSelectedSections,
      persistSurveySnapshot,
      setAnswers,
      setCalcMessageIndex,
      setCalcPercent,
      setCompletedSectionKeys,
      setErrorText,
      setHasCompletedSubmission,
      setPhase,
      setResult,
      surveyPeriodKey,
      surveySections,
      template,
    ]
  );

  const handleAdvance = useCallback(
    (params?: AdvanceParams) => {
      if (isSectionTransitioning) return;
      const progressionContext = resolveCurrentSectionQuestionContext({
        currentSection,
        fromQuestionKey: params?.fromQuestionKey,
        focusedQuestionKey: currentSection
          ? focusedQuestionBySection[currentSection.key]
          : undefined,
        answers,
      });
      if (!progressionContext || !currentSection) return;
      const activeSection = currentSection;
      const { currentNode, isAutoAdvanceFromAnswer } = progressionContext;

      let effectiveAnswers = answers;
      if (
        params &&
        params.fromQuestionKey === currentNode.question.key &&
        typeof params.answerOverride !== "undefined"
      ) {
        const sanitized = sanitizeSurveyAnswerValue(
          currentNode.question,
          params.answerOverride,
          maxSelectedSections
        );
        effectiveAnswers = resolveSurveySelectionState({
          template,
          answers: { ...answers, [currentNode.question.key]: sanitized },
          selectedSections: selectedSectionsCommitted,
        }).answers;
      }

      const currentError = validateSurveyQuestionAnswer(
        currentNode.question,
        effectiveAnswers[currentNode.question.key],
        {
          treatSelectionAsOptional: isOptionalSelectionQuestion(currentNode.question),
        }
      );
      const numericWarning = resolveQuestionNumericWarning(
        currentNode.question,
        effectiveAnswers[currentNode.question.key]
      );
      if (numericWarning) {
        setErrorQuestionKey(currentNode.question.key);
        setErrorText(numericWarning);
        scrollToQuestion(currentNode.question.key);
        return;
      }
      if (currentError) {
        setErrorQuestionKey(currentNode.question.key);
        setErrorText(currentError);
        scrollToQuestion(currentNode.question.key);
        return;
      }

      let nextAnswers = effectiveAnswers;
      let nextSelectedSections = selectedSectionsCommitted;
      if (currentNode.question.key === c27Key) {
        const nextSelectionState = resolveSurveySelectionState({
          template,
          answers: nextAnswers,
          selectedSections: selectedSectionsCommitted,
        });
        nextSelectedSections = nextSelectionState.selectedSections;
        nextAnswers = nextSelectionState.answers;
        setSelectedSectionsCommitted(nextSelectedSections);
        setAnswers(nextAnswers);
      }

      const { effectiveVisibleKeySet, effectiveSections } = buildEffectiveSurveyStructure({
        answers: nextAnswers,
        selectedSections: nextSelectedSections,
        buildVisibleQuestionList,
        sectionTitleMap,
        commonSectionTitle,
      });
      addConfirmedQuestion(currentNode.question.key, effectiveVisibleKeySet);
      const sectionAt = Math.max(
        0,
        effectiveSections.findIndex((item) => item.key === activeSection.key)
      );
      const section = effectiveSections[sectionAt];
      if (!section) return;
      const questionAt = Math.max(
        0,
        section.questions.findIndex((item) => item.question.key === currentNode.question.key)
      );

      if (isAutoAdvanceFromAnswer && currentNode.question.type === "multi") {
        clearNavigationError();
        setIsSectionTransitioning(false);
        return;
      }

      if (questionAt < section.questions.length - 1) {
        const nextQuestion = section.questions[questionAt + 1].question;
        const nextKey = nextQuestion.key;
        const nextAlreadyAnswered = isSurveyQuestionAnswered(
          nextQuestion,
          nextAnswers[nextKey]
        );
        if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
          clearNavigationError();
          setIsSectionTransitioning(false);
          return;
        }
        setCurrentSectionIndex(sectionAt);
        setFocusedQuestionBySection((prev) => ({ ...prev, [section.key]: nextKey }));
        clearNavigationError();
        scrollToQuestion(nextKey, {
          align:
            isAutoAdvanceFromAnswer &&
            currentNode.question.type !== "multi" &&
            !nextAlreadyAnswered
              ? "center"
              : "comfort",
        });
        setIsSectionTransitioning(false);
        return;
      }

      if (sectionAt < effectiveSections.length - 1) {
        const nextSection = effectiveSections[sectionAt + 1];
        const nextKey = nextSection.questions[0]?.question.key ?? "";
        const nextQuestion = nextSection.questions[0]?.question;
        const nextAlreadyAnswered =
          nextQuestion != null
            ? isSurveyQuestionAnswered(nextQuestion, nextAnswers[nextKey])
            : false;
        if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
          clearNavigationError();
          setIsSectionTransitioning(false);
          return;
        }
        const shouldShowSectionTransition = currentNode.question.key === c27Key;
        setIsSectionTransitioning(shouldShowSectionTransition);
        setCurrentSectionIndex(sectionAt + 1);
        if (nextKey) {
          setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
          const align =
            isAutoAdvanceFromAnswer &&
            currentNode.question.type !== "multi" &&
            !nextAlreadyAnswered
              ? "center"
              : "comfort";
          if (shouldShowSectionTransition) {
            window.setTimeout(() => {
              scrollToQuestion(nextKey, { align });
              setIsSectionTransitioning(false);
            }, 140);
          } else {
            scrollToQuestion(nextKey, { align });
          }
        } else {
          setIsSectionTransitioning(false);
        }
        clearNavigationError();
        return;
      }

      if (isAutoAdvanceFromAnswer) {
        clearNavigationError();
        setIsSectionTransitioning(false);
        return;
      }

      setIsSectionTransitioning(false);
      startCalculation(nextAnswers, nextSelectedSections);
    },
    [
      addConfirmedQuestion,
      answers,
      buildVisibleQuestionList,
      c27Key,
      clearNavigationError,
      commonSectionTitle,
      currentSection,
      focusedQuestionBySection,
      isSectionTransitioning,
      maxSelectedSections,
      scrollToQuestion,
      sectionTitleMap,
      selectedSectionsCommitted,
      setAnswers,
      setCurrentSectionIndex,
      setErrorQuestionKey,
      setErrorText,
      setFocusedQuestionBySection,
      setIsSectionTransitioning,
      setSelectedSectionsCommitted,
      startCalculation,
      template,
    ]
  );

  const handleMovePreviousSection = useCallback(() => {
    if (isSectionTransitioning) return;
    if (currentSectionIndex <= 0) return;
    moveToSection(currentSectionIndex - 1);
  }, [currentSectionIndex, isSectionTransitioning, moveToSection]);

  const handleMoveNextSection = useCallback(() => {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;

    const validationIssue = findSectionValidationIssue({
      section: currentSection,
      answers,
    });
    if (validationIssue) {
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [currentSection.key]: validationIssue.questionKey,
      }));
      setErrorQuestionKey(validationIssue.questionKey);
      setErrorText(validationIssue.errorText);
      scrollToQuestion(validationIssue.questionKey);
      return;
    }

    let nextAnswers = answers;
    const nextSelectionState = resolveSurveySelectionState({
      template,
      answers: nextAnswers,
      selectedSections: selectedSectionsCommitted,
    });
    const nextSelectedSections = nextSelectionState.selectedSections;
    const nextPrunedAnswers = nextSelectionState.answers;
    if (
      !hasSameSectionSelection(nextSelectedSections, selectedSectionsCommitted) ||
      JSON.stringify(nextPrunedAnswers) !== JSON.stringify(nextAnswers)
    ) {
      nextAnswers = nextPrunedAnswers;
      setSelectedSectionsCommitted(nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const { effectiveSections } = buildEffectiveSurveyStructure({
      answers: nextAnswers,
      selectedSections: nextSelectedSections,
      buildVisibleQuestionList,
      sectionTitleMap,
      commonSectionTitle,
    });
    const sectionAt = effectiveSections.findIndex(
      (section) => section.key === currentSection.key
    );
    if (sectionAt < 0) return;

    if (sectionAt >= effectiveSections.length - 1) {
      clearNavigationError();
      setIsSectionTransitioning(false);
      startCalculation(nextAnswers, nextSelectedSections);
      return;
    }

    const nextSection = effectiveSections[sectionAt + 1];
    const nextKey = nextSection.questions[0]?.question.key ?? "";
    const shouldShowSectionTransition = currentSection.questions.some(
      (item) => item.question.key === c27Key
    );
    clearNavigationError();
    setIsSectionTransitioning(shouldShowSectionTransition);
    setCurrentSectionIndex(sectionAt + 1);
    if (nextKey) {
      setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
      if (shouldShowSectionTransition) {
        window.setTimeout(() => {
          scrollToQuestion(nextKey);
          setIsSectionTransitioning(false);
        }, 140);
      } else {
        scrollToQuestion(nextKey);
      }
    } else {
      setIsSectionTransitioning(false);
    }
  }, [
    answers,
    buildVisibleQuestionList,
    c27Key,
    clearNavigationError,
    commonSectionTitle,
    currentSection,
    isSectionTransitioning,
    scrollToQuestion,
    sectionTitleMap,
    selectedSectionsCommitted,
    setAnswers,
    setCurrentSectionIndex,
    setErrorQuestionKey,
    setErrorText,
    setFocusedQuestionBySection,
    setIsSectionTransitioning,
    setSelectedSectionsCommitted,
    startCalculation,
    template,
  ]);

  return {
    startCalculation,
    handleAdvance,
    handleMovePreviousSection,
    handleMoveNextSection,
  };
}
