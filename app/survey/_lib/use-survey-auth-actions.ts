import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  postEmployeeSync,
  requestNhisInit,
  requestNhisSign,
  upsertEmployeeSession,
} from "@/app/(features)/employee-report/_lib/api";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";

type AuthBusyState = "idle" | "session" | "init" | "sign" | "sync";

type SurveyAuthActionText = {
  errorInvalidIdentity: string;
  noticeAuthComplete: string;
  noticeAuthBySession: string;
  noticeAuthByStoredIdentity: string;
  noticeAuthRequested: string;
  noticeNeedResend: string;
};

type UseSurveyAuthActionsInput = {
  validIdentity: boolean;
  identityPayload: IdentityInput;
  saveSurveyIdentity: (identity: IdentityInput) => void;
  setAuthBusy: Dispatch<SetStateAction<AuthBusyState>>;
  setAuthErrorText: Dispatch<SetStateAction<string | null>>;
  setAuthNoticeText: Dispatch<SetStateAction<string | null>>;
  setAuthPendingSign: Dispatch<SetStateAction<boolean>>;
  setAuthVerified: Dispatch<SetStateAction<boolean>>;
  setIdentityEditable: Dispatch<SetStateAction<boolean>>;
  text: SurveyAuthActionText;
};

export function useSurveyAuthActions(input: UseSurveyAuthActionsInput) {
  const {
    validIdentity,
    identityPayload,
    saveSurveyIdentity,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
    text,
  } = input;

  const ensureEmployeeSessionFromIdentity = useCallback(
    async (nextIdentity: IdentityInput) => {
      setAuthBusy("sync");
      const syncResult = await postEmployeeSync({
        identity: nextIdentity,
        forceRefresh: false,
      });
      saveSurveyIdentity(nextIdentity);
      emitAuthSyncEvent({
        scope: "b2b-employee-session",
        reason: "survey-session-synced",
      });
      setAuthVerified(true);
      setIdentityEditable(false);
      setAuthPendingSign(false);
      setAuthErrorText(null);
      setAuthNoticeText(
        syncResult.sync?.source === "fresh" ? text.noticeAuthComplete : text.noticeAuthBySession
      );
    },
    [
      saveSurveyIdentity,
      setAuthBusy,
      setAuthErrorText,
      setAuthNoticeText,
      setAuthPendingSign,
      setAuthVerified,
      setIdentityEditable,
      text.noticeAuthBySession,
      text.noticeAuthComplete,
    ]
  );

  const handleStartKakaoAuth = useCallback(async () => {
    if (!validIdentity) {
      setAuthErrorText(text.errorInvalidIdentity);
      return;
    }
    const payload = identityPayload;
    setAuthBusy("init");
    setAuthErrorText(null);
    setAuthNoticeText(null);
    try {
      const existing = await upsertEmployeeSession(payload).catch(() => null);
      if (existing?.found) {
        saveSurveyIdentity(payload);
        emitAuthSyncEvent({
          scope: "b2b-employee-session",
          reason: "survey-session-found",
        });
        setAuthVerified(true);
        setIdentityEditable(false);
        setAuthPendingSign(false);
        setAuthNoticeText(text.noticeAuthByStoredIdentity);
        return;
      }
      const initResult = await requestNhisInit({
        identity: payload,
        forceInit: true,
      });
      if (initResult.linked || initResult.nextStep === "fetch") {
        await ensureEmployeeSessionFromIdentity(payload);
        return;
      }
      setAuthPendingSign(true);
      saveSurveyIdentity(payload);
      setAuthNoticeText(text.noticeAuthRequested);
    } catch (error) {
      setAuthErrorText(error instanceof Error ? error.message : "auth_request_failed");
    } finally {
      setAuthBusy("idle");
    }
  }, [
    ensureEmployeeSessionFromIdentity,
    identityPayload,
    saveSurveyIdentity,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
    text.errorInvalidIdentity,
    text.noticeAuthByStoredIdentity,
    text.noticeAuthRequested,
    validIdentity,
  ]);

  const handleConfirmKakaoAuth = useCallback(async () => {
    if (!validIdentity) {
      setAuthErrorText(text.errorInvalidIdentity);
      return;
    }
    const payload = identityPayload;
    setAuthBusy("sign");
    setAuthErrorText(null);
    setAuthNoticeText(null);
    try {
      const signResult = await requestNhisSign();
      if (!signResult.linked && !signResult.reused) {
        setAuthPendingSign(true);
        setAuthNoticeText(text.noticeNeedResend);
        return;
      }
      await ensureEmployeeSessionFromIdentity(payload);
    } catch (error) {
      const status =
        typeof (error as { status?: unknown })?.status === "number"
          ? (error as { status: number }).status
          : null;
      if (status === 409) {
        setAuthPendingSign(false);
        setAuthNoticeText(text.noticeNeedResend);
      } else {
        setAuthErrorText(error instanceof Error ? error.message : "auth_confirm_failed");
      }
    } finally {
      setAuthBusy("idle");
    }
  }, [
    ensureEmployeeSessionFromIdentity,
    identityPayload,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    text.errorInvalidIdentity,
    text.noticeNeedResend,
    validIdentity,
  ]);

  return {
    handleStartKakaoAuth,
    handleConfirmKakaoAuth,
  };
}
