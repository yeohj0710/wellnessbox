import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
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
  errorAuthRequestStalled: string;
  errorAuthConfirmStalled: string;
  noticeAuthComplete: string;
  noticeAuthBySession: string;
  noticeAuthByStoredIdentity: string;
  noticeAuthRequested: string;
  noticeNeedResend: string;
};

const AUTH_REQUEST_FALLBACK_MS = 75_000;

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
  const authRequestIdRef = useRef(0);

  const beginAuthRequest = useCallback(() => {
    const nextRequestId = authRequestIdRef.current + 1;
    authRequestIdRef.current = nextRequestId;
    return nextRequestId;
  }, []);

  const invalidateAuthRequest = useCallback(() => {
    authRequestIdRef.current += 1;
  }, []);

  const isAuthRequestActive = useCallback(
    (requestId: number) => authRequestIdRef.current === requestId,
    []
  );

  const ensureEmployeeSessionFromIdentity = useCallback(
    async (nextIdentity: IdentityInput, requestId: number) => {
      if (!isAuthRequestActive(requestId)) return;
      setAuthBusy("sync");
      const syncResult = await postEmployeeSync({
        identity: nextIdentity,
        forceRefresh: false,
      });
      if (!isAuthRequestActive(requestId)) return;
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
      isAuthRequestActive,
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
    const requestId = beginAuthRequest();
    const fallbackTimer = setTimeout(() => {
      if (!isAuthRequestActive(requestId)) return;
      invalidateAuthRequest();
      setAuthBusy("idle");
      setAuthNoticeText(null);
      setAuthErrorText(text.errorAuthRequestStalled);
    }, AUTH_REQUEST_FALLBACK_MS);
    const payload = identityPayload;
    setAuthBusy("init");
    setAuthErrorText(null);
    setAuthNoticeText(null);
    try {
      const existing = await upsertEmployeeSession(payload).catch(() => null);
      if (!isAuthRequestActive(requestId)) return;
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
      if (!isAuthRequestActive(requestId)) return;
      if (initResult.linked || initResult.nextStep === "fetch") {
        await ensureEmployeeSessionFromIdentity(payload, requestId);
        return;
      }
      setAuthPendingSign(true);
      saveSurveyIdentity(payload);
      setAuthNoticeText(text.noticeAuthRequested);
    } catch (error) {
      if (!isAuthRequestActive(requestId)) return;
      setAuthErrorText(error instanceof Error ? error.message : "auth_request_failed");
    } finally {
      clearTimeout(fallbackTimer);
      if (isAuthRequestActive(requestId)) {
        setAuthBusy("idle");
      }
    }
  }, [
    beginAuthRequest,
    ensureEmployeeSessionFromIdentity,
    identityPayload,
    invalidateAuthRequest,
    isAuthRequestActive,
    saveSurveyIdentity,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
    text.errorAuthRequestStalled,
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
    const requestId = beginAuthRequest();
    const fallbackTimer = setTimeout(() => {
      if (!isAuthRequestActive(requestId)) return;
      invalidateAuthRequest();
      setAuthBusy("idle");
      setAuthNoticeText(text.noticeNeedResend);
      setAuthErrorText(text.errorAuthConfirmStalled);
    }, AUTH_REQUEST_FALLBACK_MS);
    const payload = identityPayload;
    setAuthBusy("sign");
    setAuthErrorText(null);
    setAuthNoticeText(null);
    try {
      const signResult = await requestNhisSign();
      if (!isAuthRequestActive(requestId)) return;
      if (!signResult.linked && !signResult.reused) {
        setAuthPendingSign(true);
        setAuthNoticeText(text.noticeNeedResend);
        return;
      }
      await ensureEmployeeSessionFromIdentity(payload, requestId);
    } catch (error) {
      if (!isAuthRequestActive(requestId)) return;
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
      clearTimeout(fallbackTimer);
      if (isAuthRequestActive(requestId)) {
        setAuthBusy("idle");
      }
    }
  }, [
    beginAuthRequest,
    ensureEmployeeSessionFromIdentity,
    identityPayload,
    invalidateAuthRequest,
    isAuthRequestActive,
    setAuthBusy,
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    text.errorAuthConfirmStalled,
    text.errorInvalidIdentity,
    text.noticeNeedResend,
    validIdentity,
  ]);

  return {
    handleStartKakaoAuth,
    handleConfirmKakaoAuth,
  };
}
