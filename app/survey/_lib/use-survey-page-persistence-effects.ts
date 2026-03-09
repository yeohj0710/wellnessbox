import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import type { WellnessSurveyTemplate } from "@/lib/wellness/data-template-types";
import {
  createPersistedSurveyState,
  restorePersistedSurveyState,
  type SurveyPhase,
} from "./survey-page-persistence";

type UseSurveyPagePersistenceEffectsInput = {
  storageKey: string;
  template: WellnessSurveyTemplate;
  maxSelectedSections: number;
  sectionTitleMap: Map<string, string>;
  commonSectionTitle: string;
  restoredRef: MutableRefObject<boolean>;
  restoredSnapshotUpdatedAtRef: MutableRefObject<number>;
  lastVisitedSectionIndexRef: MutableRefObject<number>;
  hydrated: boolean;
  phase: SurveyPhase;
  currentSectionIndex: number;
  focusedQuestionBySection: Record<string, string>;
  confirmedQuestionKeys: string[];
  completedSectionKeys: string[];
  surveyPeriodKey: string | null;
  answers: PublicSurveyAnswers;
  selectedSectionsCommitted: string[];
  setHydrated: Dispatch<SetStateAction<boolean>>;
  setAnswers: Dispatch<SetStateAction<PublicSurveyAnswers>>;
  setSelectedSectionsCommitted: Dispatch<SetStateAction<string[]>>;
  setSurveyPeriodKey: Dispatch<SetStateAction<string | null>>;
  setCurrentSectionIndex: Dispatch<SetStateAction<number>>;
  setFocusedQuestionBySection: Dispatch<SetStateAction<Record<string, string>>>;
  setConfirmedQuestionKeys: Dispatch<SetStateAction<string[]>>;
  setCompletedSectionKeys: Dispatch<SetStateAction<string[]>>;
  setHasCompletedSubmission: Dispatch<SetStateAction<boolean>>;
  setResult: Dispatch<SetStateAction<WellnessComputedResult | null>>;
  setPhase: Dispatch<SetStateAction<SurveyPhase>>;
};

export function useSurveyPagePersistenceEffects({
  storageKey,
  template,
  maxSelectedSections,
  sectionTitleMap,
  commonSectionTitle,
  restoredRef,
  restoredSnapshotUpdatedAtRef,
  lastVisitedSectionIndexRef,
  hydrated,
  phase,
  currentSectionIndex,
  focusedQuestionBySection,
  confirmedQuestionKeys,
  completedSectionKeys,
  surveyPeriodKey,
  answers,
  selectedSectionsCommitted,
  setHydrated,
  setAnswers,
  setSelectedSectionsCommitted,
  setSurveyPeriodKey,
  setCurrentSectionIndex,
  setFocusedQuestionBySection,
  setConfirmedQuestionKeys,
  setCompletedSectionKeys,
  setHasCompletedSubmission,
  setResult,
  setPhase,
}: UseSurveyPagePersistenceEffectsInput) {
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const restoredState = restorePersistedSurveyState({
        storageKey,
        template,
        maxSelectedSections,
        sectionTitleMap,
        commonSectionTitle,
      });
      if (!restoredState) {
        setHydrated(true);
        return;
      }
      restoredSnapshotUpdatedAtRef.current = restoredState.updatedAtMs;
      setAnswers(restoredState.answers);
      setSelectedSectionsCommitted(restoredState.selectedSections);
      setSurveyPeriodKey(restoredState.surveyPeriodKey);
      setCurrentSectionIndex(restoredState.currentSectionIndex);
      lastVisitedSectionIndexRef.current = restoredState.currentSectionIndex;
      setFocusedQuestionBySection(restoredState.focusedQuestionBySection);
      setConfirmedQuestionKeys(restoredState.confirmedQuestionKeys);
      setCompletedSectionKeys(restoredState.completedSectionKeys);
      setHasCompletedSubmission(restoredState.hasCompletedSubmission);
      setResult(restoredState.result);
      if (restoredState.phase === "result") {
        setPhase("result");
      } else if (restoredState.phase === "survey") {
        setPhase("survey");
      }
    } catch {
      setPhase("intro");
    } finally {
      setHydrated(true);
    }
  }, [
    commonSectionTitle,
    lastVisitedSectionIndexRef,
    maxSelectedSections,
    restoredRef,
    restoredSnapshotUpdatedAtRef,
    sectionTitleMap,
    setAnswers,
    setCompletedSectionKeys,
    setConfirmedQuestionKeys,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setHasCompletedSubmission,
    setHydrated,
    setPhase,
    setResult,
    setSelectedSectionsCommitted,
    setSurveyPeriodKey,
    storageKey,
    template,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "intro" && Object.keys(answers).length === 0 && selectedSectionsCommitted.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    const snapshot = createPersistedSurveyState({
      phase,
      currentSectionIndex,
      focusedQuestionBySection,
      confirmedQuestionKeys,
      completedSectionKeys,
      surveyPeriodKey,
      answers,
      selectedSections: selectedSectionsCommitted,
    });
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [
    answers,
    completedSectionKeys,
    confirmedQuestionKeys,
    currentSectionIndex,
    focusedQuestionBySection,
    hydrated,
    phase,
    selectedSectionsCommitted,
    storageKey,
    surveyPeriodKey,
  ]);
}
