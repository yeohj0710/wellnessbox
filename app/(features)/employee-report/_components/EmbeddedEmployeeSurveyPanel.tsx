"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import styles from "@/components/b2b/B2bUx.module.css";
import InlineSpinnerLabel from "@/components/common/InlineSpinnerLabel";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import { TEXT, CALCULATING_MESSAGES } from "@/app/survey/_lib/survey-page-copy";
import { useSurveyPageStructure } from "@/app/survey/_lib/use-survey-page-structure";
import { useSurveySectionNavigation } from "@/app/survey/_lib/use-survey-section-navigation";
import { useSurveyPagePersistenceEffects } from "@/app/survey/_lib/use-survey-page-persistence-effects";
import {
  useSurveyRemoteSnapshotAdapter,
} from "@/app/survey/_lib/use-survey-page-session-bridges";
import { useSurveyRemoteSync } from "@/app/survey/_lib/use-survey-remote-sync";
import { useSurveyPageUiEffects } from "@/app/survey/_lib/use-survey-page-ui-effects";
import {
  useSurveyPageRefs,
  useSurveyPageState,
} from "@/app/survey/_lib/use-survey-page-state";
import { useSurveyAnswerActions } from "@/app/survey/_lib/use-survey-answer-actions";
import { useSurveyPageDerivedState } from "@/app/survey/_lib/use-survey-page-derived-state";
import { useSurveyProgressionActions } from "@/app/survey/_lib/use-survey-progression-actions";
import { resetSurveyFlowState } from "@/app/survey/_lib/survey-state-reset";
import {
  isOptionalSelectionQuestion,
  isQuestionEffectivelyRequired,
  toDisplayQuestionText,
} from "@/app/survey/_lib/survey-page-helpers";
import SurveyCalculatingPanel from "@/app/survey/_components/SurveyCalculatingPanel";
import SurveyQuestionInput from "@/app/survey/_components/SurveyQuestionInput";
import SurveyResetConfirmModal from "@/app/survey/_components/SurveyResetConfirmModal";
import SurveySectionPanel from "@/app/survey/_components/SurveySectionPanel";

export const EMPLOYEE_SURVEY_STORAGE_KEY = "b2b-public-survey-state.v4";

export function clearEmployeeSurveyDraftState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMPLOYEE_SURVEY_STORAGE_KEY);
}

type EmbeddedEmployeeSurveyPanelProps = {
  onCompleted: (periodKey: string | null) => void;
  onClose: () => void;
};

export default function EmbeddedEmployeeSurveyPanel({
  onCompleted,
  onClose,
}: EmbeddedEmployeeSurveyPanelProps) {
  const surveyViewportRef = useRef<HTMLDivElement | null>(null);
  const template = useMemo(() => loadWellnessTemplateForB2b(), []);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const sectionTitleMap = useMemo(
    () =>
      new Map(
        template.sectionCatalog.map((item) => [item.key, item.displayName || item.title])
      ),
    [template]
  );
  const {
    phase,
    setPhase,
    authVerified,
    setAuthVerified,
    identityEditable,
    setIdentityEditable,
    setAuthPendingSign,
    authBusy,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    surveyPeriodKey,
    setSurveyPeriodKey,
    surveySyncReady,
    setSurveySyncReady,
    answers,
    setAnswers,
    selectedSectionsCommitted,
    setSelectedSectionsCommitted,
    currentSectionIndex,
    setCurrentSectionIndex,
    focusedQuestionBySection,
    setFocusedQuestionBySection,
    confirmedQuestionKeys,
    setConfirmedQuestionKeys,
    completedSectionKeys,
    setCompletedSectionKeys,
    errorText,
    setErrorText,
    errorQuestionKey,
    setErrorQuestionKey,
    isSectionTransitioning,
    setIsSectionTransitioning,
    isResetConfirmModalOpen,
    setIsResetConfirmModalOpen,
    result,
    setResult,
    hasCompletedSubmission,
    setHasCompletedSubmission,
    hydrated,
    setHydrated,
    calcPercent,
    setCalcPercent,
    calcMessageIndex,
    setCalcMessageIndex,
  } = useSurveyPageState();
  const {
    restoredRef,
    restoredSnapshotUpdatedAtRef,
    remoteSurveyBootstrappedRef,
    lastRemoteSavedSignatureRef,
    renewalHoldTimerRef,
    calcTickerRef,
    calcTimeoutRef,
    saveDraftTimerRef,
    lastVisitedSectionIndexRef,
  } = useSurveyPageRefs();

  const completionReadyRef = useRef(false);
  const completionEmittedRef = useRef(false);
  const refreshLoginStatus = useCallback(async () => undefined, []);

  useEffect(() => {
    setAuthVerified(true);
    setIdentityEditable(false);
    setAuthPendingSign(false);
    setAuthBusy("idle");
    setAuthErrorText(null);
    setAuthNoticeText(null);
  }, [
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
  ]);

  useSurveyPagePersistenceEffects({
    storageKey: EMPLOYEE_SURVEY_STORAGE_KEY,
    template,
    maxSelectedSections,
    sectionTitleMap,
    commonSectionTitle: TEXT.commonSection,
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
  });

  const applyRemoteSurveySnapshot = useSurveyRemoteSnapshotAdapter({
    template,
    maxSelectedSections,
    sectionTitleMap,
    commonSectionTitle: TEXT.commonSection,
    restoredSnapshotUpdatedAtRef,
    lastVisitedSectionIndexRef,
    setAnswers,
    setSelectedSectionsCommitted,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setHasCompletedSubmission,
    setConfirmedQuestionKeys,
    setCompletedSectionKeys,
    setSurveyPeriodKey,
    setResult,
  });

  const { persistSurveySnapshot } = useSurveyRemoteSync({
    template,
    maxSelectedSections,
    hydrated,
    authVerified: true,
    phase,
    answers,
    selectedSectionsCommitted,
    surveyPeriodKey,
    surveySyncReady,
    setSurveyPeriodKey,
    setSurveySyncReady,
    applyRemoteSurveySnapshot,
    remoteSurveyBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    saveDraftTimerRef,
  });

  const {
    buildVisibleQuestionList,
    surveySections,
    visibleSectionKeySet,
    progressTotalCount,
    progressDisplayDoneCount,
    progressPercent,
  } = useSurveyPageStructure({
    template,
    answers,
    selectedSectionsCommitted,
    completedSectionKeys,
    maxSelectedSections,
    sectionTitleMap,
    commonSectionTitle: TEXT.commonSection,
    setAnswers,
  });
  const {
    currentSection,
    focusedQuestionKey,
    scrollToQuestion,
    moveToSection,
    setQuestionRef,
  } = useSurveySectionNavigation({
    surveySections,
    answers,
    currentSectionIndex,
    focusedQuestionBySection,
    isSectionTransitioning,
    scrollContainerRef: surveyViewportRef,
    setCurrentSectionIndex,
    setFocusedQuestionBySection,
    setErrorText,
    setErrorQuestionKey,
  });

  useSurveyPageUiEffects({
    hydrated,
    phase,
    isAdminLoggedIn: false,
    refreshLoginStatus,
    visibleSectionKeySet,
    surveySections,
    currentSectionIndex,
    lastVisitedSectionIndexRef,
    renewalHoldTimerRef,
    calcTickerRef,
    calcTimeoutRef,
    saveDraftTimerRef,
    setCompletedSectionKeys,
  });

  useEffect(() => {
    setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)));
  }, [setCompletedSectionKeys, visibleSectionKeySet]);

  const { applyAnswer, addConfirmedQuestion } = useSurveyAnswerActions({
    template,
    maxSelectedSections,
    selectedSectionsCommitted,
    errorQuestionKey,
    phase,
    setAnswers,
    setConfirmedQuestionKeys,
    setSelectedSectionsCommitted,
    setErrorQuestionKey,
    setErrorText,
    setPhase,
    setResult,
    setHasCompletedSubmission,
  });

  const {
    hasPrevStep,
    isCommonSurveySection,
    prevButtonLabel,
    nextButtonLabel,
    progressMessage,
    resolveQuestionHelpText,
  } = useSurveyPageDerivedState({
    template,
    answers,
    selectedSectionsCommitted,
    phase,
    isAdminLoggedIn: false,
    result,
    hydrated,
    authBusy,
    authVerified: true,
    identityEditable,
    currentSectionKey: currentSection?.key ?? null,
    currentSectionIndex,
    surveySectionsLength: surveySections.length,
    progressPercent,
    text: {
      optionalHint: TEXT.optionalHint,
      prevSection: TEXT.prevSection,
      nextSection: TEXT.nextSection,
      resultCheck: TEXT.resultCheck,
      submitSurvey: TEXT.submitSurvey,
    },
  });

  const { handleAdvance, handleMovePreviousSection, handleMoveNextSection } =
    useSurveyProgressionActions({
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
      commonSectionTitle: TEXT.commonSection,
      isSectionTransitioning,
      authVerified: true,
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
    });

  const handleOpenResetConfirm = useCallback(() => {
    setIsResetConfirmModalOpen(true);
  }, [setIsResetConfirmModalOpen]);

  const handleConfirmReset = useCallback(() => {
    resetSurveyFlowState({
      storageKey: EMPLOYEE_SURVEY_STORAGE_KEY,
      restoredSnapshotUpdatedAtRef,
      lastRemoteSavedSignatureRef,
      lastVisitedSectionIndexRef,
      setAnswers,
      setSelectedSectionsCommitted,
      setCurrentSectionIndex,
      setFocusedQuestionBySection,
      setConfirmedQuestionKeys,
      setCompletedSectionKeys,
      setErrorText,
      setErrorQuestionKey,
      setResult,
      setHasCompletedSubmission,
      setIsSectionTransitioning,
    });
    completionEmittedRef.current = false;
    setIsResetConfirmModalOpen(false);
    setPhase("survey");
    void persistSurveySnapshot({
      answers: {},
      selectedSections: [],
      finalize: false,
      periodKey: surveyPeriodKey,
    }).catch(() => null);
  }, [
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    persistSurveySnapshot,
    restoredSnapshotUpdatedAtRef,
    setAnswers,
    setCompletedSectionKeys,
    setConfirmedQuestionKeys,
    setCurrentSectionIndex,
    setErrorQuestionKey,
    setErrorText,
    setFocusedQuestionBySection,
    setHasCompletedSubmission,
    setIsResetConfirmModalOpen,
    setIsSectionTransitioning,
    setPhase,
    setResult,
    setSelectedSectionsCommitted,
    surveyPeriodKey,
  ]);

  useEffect(() => {
    if (!hydrated || !surveySyncReady) return;
    if (!completionReadyRef.current) {
      completionReadyRef.current = true;
      if (phase !== "survey") {
        setPhase("survey");
      }
      return;
    }
    if (phase !== "result" || !hasCompletedSubmission || completionEmittedRef.current) {
      return;
    }
    completionEmittedRef.current = true;
    const timer = window.setTimeout(() => {
      onCompleted(surveyPeriodKey);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [hasCompletedSubmission, hydrated, onCompleted, phase, setPhase, surveyPeriodKey, surveySyncReady]);

  function renderQuestionInput(question: WellnessSurveyQuestionForTemplate) {
    return (
      <SurveyQuestionInput
        question={question}
        answers={answers}
        maxSelectedSections={maxSelectedSections}
        applyAnswer={applyAnswer}
        onAdvance={handleAdvance}
      />
    );
  }

  if (!hydrated) {
    return (
      <section className="rounded-[28px] border border-cyan-200/70 bg-white/92 p-5 shadow-[0_24px_58px_-36px_rgba(15,23,42,0.48)]">
        <InlineSpinnerLabel
          label="설문 준비 중"
          size="md"
          className="text-sm font-semibold text-slate-800"
          spinnerClassName="text-cyan-500"
        />
        <div className="mt-4 grid gap-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-[20px] bg-slate-100" />
            <div className="h-24 animate-pulse rounded-[20px] bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-[28px] border border-cyan-200/70 bg-white/92 p-4 shadow-[0_24px_58px_-36px_rgba(15,23,42,0.48)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Survey
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              같은 페이지에서 설문을 이어서 진행합니다
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              답변은 자동 저장되며, 제출이 끝나면 최신 리포트로 바로 돌아갑니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          >
            리포트로 돌아가기
          </button>
        </div>

        <div ref={surveyViewportRef} className={styles.embeddedSurveyViewport}>
          {phase === "calculating" ? (
            <SurveyCalculatingPanel
              title={TEXT.resultTitle}
              message={CALCULATING_MESSAGES[calcMessageIndex]}
              percent={calcPercent}
            />
          ) : phase === "result" ? (
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/80 px-5 py-6 text-center">
              <p className="text-base font-semibold text-cyan-800">
                설문 제출이 완료되었습니다.
              </p>
              <p className="mt-2 text-sm text-cyan-700">
                최신 리포트를 여는 중입니다.
              </p>
            </div>
          ) : (
            <SurveySectionPanel
              text={{
                commonSection: TEXT.commonSection,
                sectionGuide: TEXT.sectionGuide,
                restart: TEXT.restart,
                progressBarLabel: TEXT.progressBarLabel,
                sectionTransitionTitle: TEXT.sectionTransitionTitle,
                sectionTransitionDesc: TEXT.sectionTransitionDesc,
                commonBadge: TEXT.commonBadge,
                requiredBadge: TEXT.requiredBadge,
                optionalBadge: TEXT.optionalBadge,
                optionalHint: TEXT.optionalHint,
              }}
              currentSectionIndex={currentSectionIndex}
              currentSection={currentSection}
              surveySections={surveySections}
              progressPercent={progressPercent}
              progressDoneCount={progressDisplayDoneCount}
              progressTotalCount={progressTotalCount}
              progressMessage={progressMessage}
              isSectionTransitioning={isSectionTransitioning}
              isCommonSurveySection={isCommonSurveySection}
              hasPrevStep={hasPrevStep}
              prevButtonLabel={prevButtonLabel}
              nextButtonLabel={nextButtonLabel}
              focusedQuestionKey={focusedQuestionKey}
              errorQuestionKey={errorQuestionKey}
              errorText={errorText}
              onReset={handleOpenResetConfirm}
              onMoveToSection={moveToSection}
              onMovePreviousSection={handleMovePreviousSection}
              onMoveNextSection={handleMoveNextSection}
              onQuestionRef={setQuestionRef}
              renderQuestionInput={renderQuestionInput}
              resolveQuestionText={toDisplayQuestionText}
              resolveQuestionHelpText={resolveQuestionHelpText}
              isQuestionRequired={isQuestionEffectivelyRequired}
              shouldShowQuestionOptionalHint={isOptionalSelectionQuestion}
            />
          )}
        </div>
      </section>

      <SurveyResetConfirmModal
        open={isResetConfirmModalOpen}
        title={TEXT.resetAsk}
        description={TEXT.resetDesc}
        cancelText={TEXT.cancel}
        confirmText={TEXT.reset}
        onCancel={() => setIsResetConfirmModalOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </>
  );
}
