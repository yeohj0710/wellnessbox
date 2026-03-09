"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSurveyAnswersByTemplate, type PublicSurveyAnswers } from "@/lib/b2b/public-survey";
import type { WellnessComputedResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import { isValidIdentityInput, toIdentityPayload } from "@/app/survey/_lib/survey-page-auto-compute";
import {
  isOptionalSelectionQuestion,
  isQuestionEffectivelyRequired,
  toDisplayQuestionText,
} from "@/app/survey/_lib/survey-page-helpers";
import { TEXT } from "@/app/survey/_lib/survey-page-copy";
import { useSurveyPageAccessControl } from "@/app/survey/_lib/use-survey-page-access-control";
import { useSurveyPageActionHandlers } from "@/app/survey/_lib/use-survey-page-action-handlers";
import { useSurveyPageDerivedState } from "@/app/survey/_lib/use-survey-page-derived-state";
import { useSurveyPagePanelProps } from "@/app/survey/_lib/use-survey-page-panel-props";
import { useSurveyPagePersistenceEffects } from "@/app/survey/_lib/use-survey-page-persistence-effects";
import {
  saveSurveyIdentity,
  useSurveyRemoteSnapshotAdapter,
} from "@/app/survey/_lib/use-survey-page-session-bridges";
import { useSurveyPageStructure } from "@/app/survey/_lib/use-survey-page-structure";
import { useSurveyPageUiEffects } from "@/app/survey/_lib/use-survey-page-ui-effects";
import { useSurveySectionNavigation } from "@/app/survey/_lib/use-survey-section-navigation";
import { useSurveyAuthActions } from "@/app/survey/_lib/use-survey-auth-actions";
import { useSurveyAuthBootstrap } from "@/app/survey/_lib/use-survey-auth-bootstrap";
import { useSurveyAnswerActions } from "@/app/survey/_lib/use-survey-answer-actions";
import { useSurveyIdentitySwitch } from "@/app/survey/_lib/use-survey-identity-switch";
import { useSurveyProgressionActions } from "@/app/survey/_lib/use-survey-progression-actions";
import {
  useSurveyRemoteSync,
} from "@/app/survey/_lib/use-survey-remote-sync";
import { useSurveyLifecycleActions } from "@/app/survey/_lib/use-survey-lifecycle-actions";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import SurveyPageShell from "./_components/SurveyPageShell";
import SurveyQuestionInput from "./_components/SurveyQuestionInput";
import { type SurveyPhase } from "./_lib/survey-page-persistence";

const STORAGE_KEY = "b2b-public-survey-state.v4";
const BLOCK_SURVEY_START_TEMPORARILY = false;

export default function SurveyPageClient() {
  const router = useRouter();
  const template = useMemo(() => loadWellnessTemplateForB2b(), []);
  const c27Key = template.rules.selectSectionByCommonQuestionKey || "C27";
  const maxSelectedSections = Math.max(1, template.rules.maxSelectedSections || 5);
  const sectionTitleMap = useMemo(
    () => new Map(template.sectionCatalog.map((item) => [item.key, item.displayName || item.title])),
    [template]
  );

  const [phase, setPhase] = useState<SurveyPhase>("intro");
  const [identity, setIdentity] = useState<IdentityInput>({ name: "", birthDate: "", phone: "" });
  const [authVerified, setAuthVerified] = useState(false);
  const [identityEditable, setIdentityEditable] = useState(true);
  const [authPendingSign, setAuthPendingSign] = useState(false);
  const [authBusy, setAuthBusy] = useState<"idle" | "session" | "init" | "sign" | "sync">("idle");
  const [authErrorText, setAuthErrorText] = useState<string | null>(null);
  const [authNoticeText, setAuthNoticeText] = useState<string | null>(null);
  const [surveyPeriodKey, setSurveyPeriodKey] = useState<string | null>(null);
  const [surveySyncReady, setSurveySyncReady] = useState(false);
  const [answers, setAnswers] = useState<PublicSurveyAnswers>({});
  const [selectedSectionsCommitted, setSelectedSectionsCommitted] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [focusedQuestionBySection, setFocusedQuestionBySection] = useState<Record<string, string>>({});
  const [confirmedQuestionKeys, setConfirmedQuestionKeys] = useState<string[]>([]);
  const [completedSectionKeys, setCompletedSectionKeys] = useState<string[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorQuestionKey, setErrorQuestionKey] = useState<string | null>(null);
  const [isSectionTransitioning, setIsSectionTransitioning] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [result, setResult] = useState<WellnessComputedResult | null>(null);
  const [hasCompletedSubmission, setHasCompletedSubmission] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [calcPercent, setCalcPercent] = useState(8);
  const [calcMessageIndex, setCalcMessageIndex] = useState(0);

  const restoredRef = useRef(false);
  const authBootstrappedRef = useRef(false);
  const restoredSnapshotUpdatedAtRef = useRef(0);
  const remoteSurveyBootstrappedRef = useRef(false);
  const lastRemoteSavedSignatureRef = useRef("");
  const renewalHoldTimerRef = useRef<number | null>(null);
  const renewalBypassTriggeredRef = useRef(false);
  const calcTickerRef = useRef<number | null>(null);
  const calcTimeoutRef = useRef<number | null>(null);
  const saveDraftTimerRef = useRef<number | null>(null);
  const lastVisitedSectionIndexRef = useRef(0);

  const handleOpenEmployeeReport = useCallback(() => {
    const query = surveyPeriodKey ? `?period=${encodeURIComponent(surveyPeriodKey)}` : "";
    router.push(`/employee-report${query}`);
  }, [router, surveyPeriodKey]);

  const {
    buildVisibleQuestionList,
    surveySections,
    visibleSectionKeySet,
    visibleQuestionKeySet,
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
  const { currentSection, focusedQuestionKey, scrollToQuestion, moveToSection, setQuestionRef } =
    useSurveySectionNavigation({
      surveySections,
      answers,
      currentSectionIndex,
      focusedQuestionBySection,
      isSectionTransitioning,
      setCurrentSectionIndex,
      setFocusedQuestionBySection,
      setErrorText,
      setErrorQuestionKey,
    });
  const identityPayload = useMemo(() => toIdentityPayload(identity), [identity]);
  const validIdentity = useMemo(() => isValidIdentityInput(identityPayload), [identityPayload]);

  const { isAdminLoggedIn, refreshLoginStatus } = useSurveyPageAccessControl({
    hydrated,
    phase,
    authVerified,
    setPhase,
  });

  useSurveyPageUiEffects({
    hydrated,
    phase,
    isAdminLoggedIn,
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

  useSurveyPagePersistenceEffects({
    storageKey: STORAGE_KEY,
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
    authVerified,
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

  useSurveyAuthBootstrap({
    hydrated,
    authBusy,
    authBootstrappedRef,
    refreshLoginStatus,
    saveSurveyIdentity,
    setIdentity,
    setAuthBusy,
    setAuthVerified,
    setIdentityEditable,
    setAuthPendingSign,
    setAuthErrorText,
    setAuthNoticeText,
    text: {
      noticeAuthBySession: TEXT.noticeAuthBySession,
      noticeAuthByStoredIdentity: TEXT.noticeAuthByStoredIdentity,
    },
  });

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

  const { handleStartKakaoAuth, handleConfirmKakaoAuth } = useSurveyAuthActions({
    validIdentity,
    identityPayload,
    saveSurveyIdentity,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
    text: {
      errorInvalidIdentity: TEXT.errorInvalidIdentity,
      noticeAuthComplete: TEXT.noticeAuthComplete,
      noticeAuthBySession: TEXT.noticeAuthBySession,
      noticeAuthByStoredIdentity: TEXT.noticeAuthByStoredIdentity,
      noticeAuthRequested: TEXT.noticeAuthRequested,
      noticeNeedResend: TEXT.noticeNeedResend,
    },
  });

  const { handleSwitchIdentity } = useSurveyIdentitySwitch({
    authBusy,
    storageKey: STORAGE_KEY,
    noticeSwitchedIdentityText: TEXT.noticeSwitchedIdentity,
    remoteSurveyBootstrappedRef,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    setAuthBusy,
    setIdentity,
    setAuthVerified,
    setIdentityEditable,
    setAuthPendingSign,
    setAuthErrorText,
    setAuthNoticeText,
    setSurveyPeriodKey,
    setSurveySyncReady,
    setPhase,
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

  const {
    identityLocked,
    authInitializing,
    startDisabled,
    hasPrevStep,
    isCommonSurveySection,
    prevButtonLabel,
    nextButtonLabel,
    progressMessage,
    resultSummary,
    resolveQuestionHelpText,
  } = useSurveyPageDerivedState({
    template,
    answers,
    selectedSectionsCommitted,
    phase,
    isAdminLoggedIn,
    result,
    hydrated,
    authBusy,
    authVerified,
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

  const {
    requestReset,
    handleReset,
    handleStartSurvey,
    handleRenewalHoldStart,
    handleRenewalHoldEnd,
  } = useSurveyLifecycleActions({
    authVerified,
    hasCompletedSubmission,
    surveyPeriodKey,
    blockSurveyStartTemporarily: BLOCK_SURVEY_START_TEMPORARILY,
    needAuthNoticeText: TEXT.needAuthNotice,
    storageKey: STORAGE_KEY,
    setAuthErrorText,
    setIsRenewalModalOpen,
    setPhase,
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
    setIsResetConfirmModalOpen,
    restoredSnapshotUpdatedAtRef,
    lastRemoteSavedSignatureRef,
    lastVisitedSectionIndexRef,
    renewalHoldTimerRef,
    renewalBypassTriggeredRef,
    persistSurveySnapshot,
  });
  const {
    handleNameChange,
    handleBirthDateChange,
    handlePhoneChange,
    handleStartKakaoAuthClick,
    handleConfirmKakaoAuthClick,
    handleSwitchIdentityClick,
    handleEditAdminResult,
    handleEditSubmittedResult,
    handleCloseRenewalModal,
    handleCancelResetConfirm,
  } = useSurveyPageActionHandlers({
    setIdentity,
    setPhase,
    setResult,
    setHasCompletedSubmission,
    setIsRenewalModalOpen,
    setIsResetConfirmModalOpen,
    handleStartKakaoAuth,
    handleConfirmKakaoAuth,
    handleSwitchIdentity,
    handleRenewalHoldEnd,
    resultSummary,
  });
  const {
    handleAdvance,
    handleMovePreviousSection,
    handleMoveNextSection,
  } = useSurveyProgressionActions({
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
  });

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

  const {
    introPanelProps,
    sectionPanelProps,
    calculatingPanelProps,
    resultPanelProps,
    submittedPanelProps,
    renewalModalProps,
    resetConfirmModalProps,
  } = useSurveyPagePanelProps({
    identity,
    identityEditable,
    identityLocked,
    authBusy,
    authPendingSign,
    authVerified,
    authInitializing,
    authNoticeText,
    authErrorText,
    hasCompletedSubmission,
    startDisabled,
    onNameChange: handleNameChange,
    onBirthDateChange: handleBirthDateChange,
    onPhoneChange: handlePhoneChange,
    onStartKakaoAuth: handleStartKakaoAuthClick,
    onConfirmKakaoAuth: handleConfirmKakaoAuthClick,
    onSwitchIdentity: handleSwitchIdentityClick,
    onStartSurvey: handleStartSurvey,
    currentSectionIndex,
    currentSection,
    surveySections,
    progressPercent,
    progressDoneCount: progressDisplayDoneCount,
    progressTotalCount,
    progressMessage,
    isSectionTransitioning,
    isCommonSurveySection,
    hasPrevStep,
    prevButtonLabel,
    nextButtonLabel,
    focusedQuestionKey,
    errorQuestionKey,
    errorText,
    onReset: requestReset,
    onMoveToSection: moveToSection,
    onMovePreviousSection: handleMovePreviousSection,
    onMoveNextSection: handleMoveNextSection,
    onQuestionRef: setQuestionRef,
    renderQuestionInput,
    resolveQuestionText: toDisplayQuestionText,
    resolveQuestionHelpText,
    isQuestionRequired: isQuestionEffectivelyRequired,
    shouldShowQuestionOptionalHint: isOptionalSelectionQuestion,
    calcMessageIndex,
    calcPercent,
    resultSummary,
    sectionTitleMap,
    onEditAdminResult: handleEditAdminResult,
    onOpenEmployeeReport: handleOpenEmployeeReport,
    onEditSubmittedResult: handleEditSubmittedResult,
    isRenewalModalOpen,
    onCloseRenewalModal: handleCloseRenewalModal,
    onRenewalHoldStart: handleRenewalHoldStart,
    onRenewalHoldEnd: handleRenewalHoldEnd,
    isResetConfirmModalOpen,
    onCancelResetConfirm: handleCancelResetConfirm,
    onConfirmReset: handleReset,
  });

  return (
    <SurveyPageShell
      hydrated={hydrated}
      phase={phase}
      isAdminLoggedIn={isAdminLoggedIn}
      introPanelProps={introPanelProps}
      sectionPanelProps={sectionPanelProps}
      calculatingPanelProps={calculatingPanelProps}
      resultPanelProps={resultPanelProps}
      submittedPanelProps={submittedPanelProps}
      renewalModalProps={renewalModalProps}
      resetConfirmModalProps={resetConfirmModalProps}
    />
  );
}
