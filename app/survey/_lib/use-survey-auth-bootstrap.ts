import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  fetchEmployeeSession,
  upsertEmployeeSession,
} from "@/app/(features)/employee-report/_lib/api";
import type {
  EmployeeSessionGetResponse,
  IdentityInput,
} from "@/app/(features)/employee-report/_lib/client-types";
import { readStoredIdentityWithSource } from "@/app/(features)/employee-report/_lib/client-utils";
import { emitAuthSyncEvent, subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import {
  isValidIdentityInput,
  normalizeDigits,
  toIdentityPayload,
} from "./survey-page-auto-compute";

type SurveyAuthBusyState = "idle" | "session" | "init" | "sign" | "sync";

type SurveyAuthBootstrapText = {
  noticeAuthBySession: string;
  noticeAuthByStoredIdentity: string;
};

type UseSurveyAuthBootstrapInput = {
  hydrated: boolean;
  authBusy: SurveyAuthBusyState;
  authBootstrappedRef: MutableRefObject<boolean>;
  refreshLoginStatus: () => Promise<void>;
  saveSurveyIdentity: (identity: IdentityInput) => void;
  setIdentity: Dispatch<SetStateAction<IdentityInput>>;
  setAuthBusy: Dispatch<SetStateAction<SurveyAuthBusyState>>;
  setAuthVerified: Dispatch<SetStateAction<boolean>>;
  setIdentityEditable: Dispatch<SetStateAction<boolean>>;
  setAuthPendingSign: Dispatch<SetStateAction<boolean>>;
  setAuthErrorText: Dispatch<SetStateAction<string | null>>;
  setAuthNoticeText: Dispatch<SetStateAction<string | null>>;
  text: SurveyAuthBootstrapText;
};

function normalizeIdentityInput(input: Partial<IdentityInput>): IdentityInput {
  return {
    name: input.name ?? "",
    birthDate: normalizeDigits(input.birthDate ?? ""),
    phone: normalizeDigits(input.phone ?? ""),
  };
}

function toSessionIdentity(
  employee: EmployeeSessionGetResponse["employee"] | undefined
): IdentityInput | null {
  if (!employee) return null;
  return normalizeIdentityInput({
    name: employee.name,
    birthDate: employee.birthDate,
    phone: employee.phoneNormalized,
  });
}

export function useSurveyAuthBootstrap({
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
  text,
}: UseSurveyAuthBootstrapInput) {
  const applyAuthenticatedSession = useCallback(
    (nextIdentity: IdentityInput | null, noticeText?: string | null) => {
      if (nextIdentity) {
        setIdentity(nextIdentity);
        saveSurveyIdentity(nextIdentity);
      }
      setAuthVerified(true);
      setIdentityEditable(false);
      setAuthPendingSign(false);
      setAuthErrorText(null);
      if (typeof noticeText !== "undefined") {
        setAuthNoticeText(noticeText);
      }
    },
    [
      saveSurveyIdentity,
      setAuthErrorText,
      setAuthNoticeText,
      setAuthPendingSign,
      setAuthVerified,
      setIdentity,
      setIdentityEditable,
    ]
  );

  const applySignedOutSession = useCallback(() => {
    setAuthVerified(false);
    setIdentityEditable(true);
    setAuthPendingSign(false);
    setAuthErrorText(null);
    setAuthNoticeText(null);
  }, [
    setAuthErrorText,
    setAuthNoticeText,
    setAuthPendingSign,
    setAuthVerified,
    setIdentityEditable,
  ]);

  useEffect(() => {
    if (!hydrated || authBootstrappedRef.current) return;
    authBootstrappedRef.current = true;

    let bootIdentity: IdentityInput | null = null;
    const stored = readStoredIdentityWithSource().identity;
    if (stored) {
      bootIdentity = normalizeIdentityInput(stored);
      setIdentity(bootIdentity);
    }

    setAuthBusy("session");
    fetchEmployeeSession()
      .then(async (session) => {
        if (session.authenticated) {
          applyAuthenticatedSession(
            toSessionIdentity(session.employee),
            text.noticeAuthBySession
          );
          return;
        }

        const storedPayload = toIdentityPayload(
          bootIdentity ?? { name: "", birthDate: "", phone: "" }
        );
        if (!isValidIdentityInput(storedPayload)) return;

        const loginResult = await upsertEmployeeSession(storedPayload).catch(() => null);
        if (!loginResult?.found) return;

        emitAuthSyncEvent({
          scope: "b2b-employee-session",
          reason: "survey-session-restored",
        });
        applyAuthenticatedSession(storedPayload, text.noticeAuthByStoredIdentity);
      })
      .catch(() => null)
      .finally(() => {
        setAuthBusy("idle");
      });
  }, [
    applyAuthenticatedSession,
    authBootstrappedRef,
    hydrated,
    saveSurveyIdentity,
    setAuthBusy,
    setIdentity,
    text.noticeAuthBySession,
    text.noticeAuthByStoredIdentity,
  ]);

  useEffect(() => {
    if (!hydrated) return;

    const unsubscribe = subscribeAuthSyncEvent(
      () => {
        void refreshLoginStatus();
        if (authBusy !== "idle") return;
        setAuthBusy("session");
        fetchEmployeeSession()
          .then((session) => {
            if (!session.authenticated) {
              applySignedOutSession();
              return;
            }
            applyAuthenticatedSession(toSessionIdentity(session.employee));
          })
          .catch(() => null)
          .finally(() => {
            setAuthBusy("idle");
          });
      },
      { scopes: ["b2b-employee-session", "user-session"] }
    );

    return unsubscribe;
  }, [
    applyAuthenticatedSession,
    applySignedOutSession,
    authBusy,
    hydrated,
    refreshLoginStatus,
    setAuthBusy,
  ]);
}
