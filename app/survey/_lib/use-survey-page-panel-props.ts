import type { ComponentProps, ReactNode } from "react";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import SurveyCalculatingPanel from "../_components/SurveyCalculatingPanel";
import SurveyIntroPanel from "../_components/SurveyIntroPanel";
import SurveyRenewalModal from "../_components/SurveyRenewalModal";
import SurveyResetConfirmModal from "../_components/SurveyResetConfirmModal";
import SurveyResultPanel from "../_components/SurveyResultPanel";
import SurveySectionPanel from "../_components/SurveySectionPanel";
import SurveySubmittedPanel from "../_components/SurveySubmittedPanel";
import { CALCULATING_MESSAGES, TEXT } from "./survey-page-copy";

type UseSurveyPagePanelPropsInput = {
  identity: ComponentProps<typeof SurveyIntroPanel>["identity"];
  identityEditable: boolean;
  identityLocked: boolean;
  authBusy: ComponentProps<typeof SurveyIntroPanel>["authBusy"];
  authPendingSign: boolean;
  authVerified: boolean;
  authInitializing: boolean;
  authNoticeText: string | null;
  authErrorText: string | null;
  hasCompletedSubmission: boolean;
  startDisabled: boolean;
  onNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onStartKakaoAuth: () => void;
  onConfirmKakaoAuth: () => void;
  onSwitchIdentity: () => void;
  onStartSurvey: () => void;
  currentSectionIndex: number;
  currentSection: ComponentProps<typeof SurveySectionPanel>["currentSection"];
  surveySections: ComponentProps<typeof SurveySectionPanel>["surveySections"];
  progressPercent: number;
  progressDoneCount: number;
  progressTotalCount: number;
  progressMessage: string;
  isSectionTransitioning: boolean;
  isCommonSurveySection: boolean;
  hasPrevStep: boolean;
  prevButtonLabel: string;
  nextButtonLabel: string;
  focusedQuestionKey: string | null;
  errorQuestionKey: string | null;
  errorText: string | null;
  onReset: () => void;
  onMoveToSection: (index: number) => void;
  onMovePreviousSection: () => void;
  onMoveNextSection: () => void;
  onQuestionRef: (questionKey: string, node: HTMLElement | null) => void;
  renderQuestionInput: (question: WellnessSurveyQuestionForTemplate) => ReactNode;
  resolveQuestionText: ComponentProps<typeof SurveySectionPanel>["resolveQuestionText"];
  resolveQuestionHelpText: ComponentProps<typeof SurveySectionPanel>["resolveQuestionHelpText"];
  isQuestionRequired: ComponentProps<typeof SurveySectionPanel>["isQuestionRequired"];
  shouldShowQuestionOptionalHint: ComponentProps<typeof SurveySectionPanel>["shouldShowQuestionOptionalHint"];
  calcMessageIndex: number;
  calcPercent: number;
  resultSummary: ComponentProps<typeof SurveyResultPanel>["resultSummary"];
  sectionTitleMap: ComponentProps<typeof SurveyResultPanel>["sectionTitleMap"];
  onEditAdminResult: () => void;
  onOpenEmployeeReport: () => void;
  onEditSubmittedResult: () => void;
  isRenewalModalOpen: boolean;
  onCloseRenewalModal: () => void;
  onRenewalHoldStart: () => void;
  onRenewalHoldEnd: () => void;
  isResetConfirmModalOpen: boolean;
  onCancelResetConfirm: () => void;
  onConfirmReset: () => void;
};

export function useSurveyPagePanelProps(input: UseSurveyPagePanelPropsInput) {
  return {
    introPanelProps: {
        text: {
          introBadge: TEXT.introBadge,
          introTitle: TEXT.introTitle,
          introDesc1: TEXT.introDesc1,
          introDesc2: TEXT.introDesc2,
          preAuthTitle: TEXT.preAuthTitle,
          preAuthDesc: TEXT.preAuthDesc,
          namePlaceholder: TEXT.namePlaceholder,
          birthPlaceholder: TEXT.birthPlaceholder,
          phonePlaceholder: TEXT.phonePlaceholder,
          sendAuth: TEXT.sendAuth,
          resendAuth: TEXT.resendAuth,
          checkAuth: TEXT.checkAuth,
          authDone: TEXT.authDone,
          authCheckingTitle: TEXT.authCheckingTitle,
          authCheckingDesc: TEXT.authCheckingDesc,
          authLockedHint: TEXT.authLockedHint,
          switchIdentity: TEXT.switchIdentity,
          startSurvey: TEXT.startSurvey,
          needAuthNotice: TEXT.needAuthNotice,
          busyRequest: TEXT.busyRequest,
          busyChecking: TEXT.busyChecking,
          completedRestartHint: TEXT.completedRestartHint,
        },
        identity: input.identity,
        identityEditable: input.identityEditable,
        identityLocked: input.identityLocked,
        authBusy: input.authBusy,
        authPendingSign: input.authPendingSign,
        authVerified: input.authVerified,
        authInitializing: input.authInitializing,
        authNoticeText: input.authNoticeText,
        authErrorText: input.authErrorText,
        hasCompletedSubmission: input.hasCompletedSubmission,
        startDisabled: input.startDisabled,
        onNameChange: input.onNameChange,
        onBirthDateChange: input.onBirthDateChange,
        onPhoneChange: input.onPhoneChange,
        onStartKakaoAuth: input.onStartKakaoAuth,
        onConfirmKakaoAuth: input.onConfirmKakaoAuth,
        onSwitchIdentity: input.onSwitchIdentity,
        onStartSurvey: input.onStartSurvey,
      } satisfies ComponentProps<typeof SurveyIntroPanel>,
    sectionPanelProps: {
        text: {
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
        },
        currentSectionIndex: input.currentSectionIndex,
        currentSection: input.currentSection,
        surveySections: input.surveySections,
        progressPercent: input.progressPercent,
        progressDoneCount: input.progressDoneCount,
        progressTotalCount: input.progressTotalCount,
        progressMessage: input.progressMessage,
        isSectionTransitioning: input.isSectionTransitioning,
        isCommonSurveySection: input.isCommonSurveySection,
        hasPrevStep: input.hasPrevStep,
        prevButtonLabel: input.prevButtonLabel,
        nextButtonLabel: input.nextButtonLabel,
        focusedQuestionKey: input.focusedQuestionKey,
        errorQuestionKey: input.errorQuestionKey,
        errorText: input.errorText,
        onReset: input.onReset,
        onMoveToSection: input.onMoveToSection,
        onMovePreviousSection: input.onMovePreviousSection,
        onMoveNextSection: input.onMoveNextSection,
        onQuestionRef: input.onQuestionRef,
        renderQuestionInput: input.renderQuestionInput,
        resolveQuestionText: input.resolveQuestionText,
        resolveQuestionHelpText: input.resolveQuestionHelpText,
        isQuestionRequired: input.isQuestionRequired,
        shouldShowQuestionOptionalHint: input.shouldShowQuestionOptionalHint,
      } satisfies ComponentProps<typeof SurveySectionPanel>,
    calculatingPanelProps: {
        title: TEXT.resultTitle,
        message: CALCULATING_MESSAGES[input.calcMessageIndex],
        percent: input.calcPercent,
      } satisfies ComponentProps<typeof SurveyCalculatingPanel>,
    resultPanelProps: {
        resultSummary: input.resultSummary,
        sectionTitleMap: input.sectionTitleMap,
        text: {
          resultTitle: TEXT.resultTitle,
          scoreHealth: TEXT.scoreHealth,
          scoreRisk: TEXT.scoreRisk,
          editSurvey: TEXT.editSurvey,
          restart: TEXT.restart,
          viewEmployeeReport: TEXT.viewEmployeeReport,
        },
        onEditSurvey: input.onEditAdminResult,
        onRestart: input.onReset,
        onOpenEmployeeReport: input.onOpenEmployeeReport,
      } satisfies ComponentProps<typeof SurveyResultPanel>,
    submittedPanelProps: {
        text: {
          submittedTitle: TEXT.submittedTitle,
          submittedDesc: TEXT.submittedDesc,
          editSurvey: TEXT.editSurvey,
          restart: TEXT.restart,
        },
        onEditSurvey: input.onEditSubmittedResult,
        onRestart: input.onReset,
      } satisfies ComponentProps<typeof SurveySubmittedPanel>,
    renewalModalProps: {
        open: input.isRenewalModalOpen,
        title: TEXT.renewalTitle,
        description1: TEXT.renewalDesc1,
        description2: TEXT.renewalDesc2,
        closeText: TEXT.close,
        confirmText: TEXT.confirm,
        onClose: input.onCloseRenewalModal,
        onHoldStart: input.onRenewalHoldStart,
        onHoldEnd: input.onRenewalHoldEnd,
      } satisfies ComponentProps<typeof SurveyRenewalModal>,
    resetConfirmModalProps: {
        open: input.isResetConfirmModalOpen,
        title: TEXT.resetAsk,
        description: TEXT.resetDesc,
        cancelText: TEXT.cancel,
        confirmText: TEXT.reset,
        onCancel: input.onCancelResetConfirm,
        onConfirm: input.onConfirmReset,
      } satisfies ComponentProps<typeof SurveyResetConfirmModal>,
  };
}
