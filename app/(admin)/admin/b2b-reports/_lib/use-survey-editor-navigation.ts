import { useCallback, useEffect, useState } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import {
  getFocusedQuestionIndex,
  type SurveySectionGroup,
} from "./survey-editor-sections";
import {
  clampSectionIndex,
  findCurrentQuestionIndex,
  findFirstInvalidQuestionInSection,
  resolveSectionFocusQuestionKey,
  validateQuestionAnswerForNavigation,
} from "./survey-editor-navigation-helpers";
import { useSurveyEditorQuestionScroller } from "./use-survey-editor-question-scroller";

type UseSurveyEditorNavigationInput = {
  surveySections: SurveySectionGroup[];
  answers: PublicSurveyAnswers;
};

export function useSurveyEditorNavigation({
  surveySections,
  answers,
}: UseSurveyEditorNavigationInput) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [focusedQuestionBySection, setFocusedQuestionBySection] = useState<
    Record<string, string>
  >({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorQuestionKey, setErrorQuestionKey] = useState<string | null>(null);
  const { scrollToQuestion, setQuestionRef } = useSurveyEditorQuestionScroller();

  const currentSection = surveySections[currentSectionIndex] ?? null;
  const focusedIndex = getFocusedQuestionIndex(
    currentSection,
    focusedQuestionBySection[currentSection?.key ?? ""],
    answers
  );
  const focusedQuestionKey =
    currentSection && focusedIndex >= 0
      ? currentSection.questions[focusedIndex]?.key ?? null
      : null;

  useEffect(() => {
    setCurrentSectionIndex((prev) => clampSectionIndex(prev, surveySections.length));
  }, [surveySections.length]);

  useEffect(() => {
    const nextFocusedQuestionKey = resolveSectionFocusQuestionKey({
      section: currentSection,
      answers,
      currentFocusedQuestionKey: focusedQuestionBySection[currentSection?.key ?? ""],
    });
    if (!currentSection || !nextFocusedQuestionKey) return;
    if (focusedQuestionBySection[currentSection.key] === nextFocusedQuestionKey) return;
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [currentSection.key]: nextFocusedQuestionKey,
    }));
  }, [answers, currentSection, focusedQuestionBySection]);

  const moveToSection = useCallback(
    (nextIndex: number) => {
      if (surveySections.length === 0) return;
      const index = clampSectionIndex(nextIndex, surveySections.length);
      const target = surveySections[index];
      if (!target) return;

      const nextFocusedQuestionKey = resolveSectionFocusQuestionKey({
        section: target,
        answers,
        currentFocusedQuestionKey: focusedQuestionBySection[target.key],
      });

      setCurrentSectionIndex(index);
      if (nextFocusedQuestionKey) {
        setFocusedQuestionBySection((prev) => ({
          ...prev,
          [target.key]: nextFocusedQuestionKey,
        }));
        scrollToQuestion(nextFocusedQuestionKey);
      }
      setErrorQuestionKey(null);
      setErrorText(null);
    },
    [answers, focusedQuestionBySection, scrollToQuestion, surveySections]
  );

  const handleAdvance = useCallback(
    (fromQuestionKey?: string, pendingValue?: unknown) => {
      if (!currentSection || currentSection.questions.length === 0) return;

      const currentIndex = findCurrentQuestionIndex({
        section: currentSection,
        answers,
        fromQuestionKey,
        focusedQuestionKey: focusedQuestionBySection[currentSection.key],
      });
      if (currentIndex < 0) return;

      const currentQuestion = currentSection.questions[currentIndex];
      const currentValueForValidation =
        fromQuestionKey &&
        currentQuestion.key === fromQuestionKey &&
        pendingValue !== undefined
          ? pendingValue
          : answers[currentQuestion.key];
      const currentError = validateQuestionAnswerForNavigation(
        currentQuestion,
        currentValueForValidation
      );
      if (currentError) {
        setErrorQuestionKey(currentQuestion.key);
        setErrorText(currentError);
        scrollToQuestion(currentQuestion.key);
        return;
      }
      setErrorQuestionKey(null);
      setErrorText(null);

      if (currentIndex < currentSection.questions.length - 1) {
        const nextQuestion = currentSection.questions[currentIndex + 1];
        if (!nextQuestion) return;
        setFocusedQuestionBySection((prev) => ({
          ...prev,
          [currentSection.key]: nextQuestion.key,
        }));
        scrollToQuestion(nextQuestion.key);
        return;
      }

      if (currentSectionIndex < surveySections.length - 1) {
        moveToSection(currentSectionIndex + 1);
      }
    },
    [
      answers,
      currentSection,
      currentSectionIndex,
      focusedQuestionBySection,
      moveToSection,
      scrollToQuestion,
      surveySections.length,
    ]
  );

  const handleMovePreviousSection = useCallback(() => {
    if (currentSectionIndex <= 0) return;
    moveToSection(currentSectionIndex - 1);
  }, [currentSectionIndex, moveToSection]);

  const handleMoveNextSection = useCallback(() => {
    if (!currentSection || currentSection.questions.length === 0) return;

    const invalidQuestion = findFirstInvalidQuestionInSection(currentSection, answers);
    if (invalidQuestion) {
      setFocusedQuestionBySection((prev) => ({
        ...prev,
        [currentSection.key]: invalidQuestion.question.key,
      }));
      setErrorQuestionKey(invalidQuestion.question.key);
      setErrorText(invalidQuestion.error);
      scrollToQuestion(invalidQuestion.question.key);
      return;
    }

    setErrorQuestionKey(null);
    setErrorText(null);
    if (currentSectionIndex < surveySections.length - 1) {
      moveToSection(currentSectionIndex + 1);
    }
  }, [
    answers,
    currentSection,
    currentSectionIndex,
    moveToSection,
    scrollToQuestion,
    surveySections.length,
  ]);

  const focusQuestion = useCallback((sectionKey: string, questionKey: string) => {
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [sectionKey]: questionKey,
    }));
  }, []);

  const clearErrorForQuestion = useCallback((questionKey: string) => {
    setErrorQuestionKey((prev) => {
      if (prev !== questionKey) return prev;
      return null;
    });
    setErrorText((prev) => (prev ? null : prev));
  }, []);

  return {
    currentSectionIndex,
    currentSection,
    focusedQuestionKey,
    errorText,
    errorQuestionKey,
    moveToSection,
    handleAdvance,
    handleMovePreviousSection,
    handleMoveNextSection,
    setQuestionRef,
    focusQuestion,
    clearErrorForQuestion,
  };
}
