"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import KakaoLoginButton from "@/components/common/kakaoLoginButton";
import { useToast } from "@/components/common/toastContext.client";
import { NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED } from "../constants";
import { SpinnerLabel } from "./HealthLinkCommon";
import { HEALTH_LINK_COPY } from "../copy";
import type { PrimaryFlow } from "../ui-types";
import { parseErrorMessage } from "../utils";
import styles from "../HealthLinkClient.module.css";

type HealthLinkAuthSectionProps = {
  loggedIn: boolean;
  statusError: string | null;
  actionNotice: string | null;
  actionError: string | null;
  actionErrorCode: string | null;
  sessionExpired: boolean;
  showHealthInPrereqGuide: boolean;
  primaryFlow: PrimaryFlow;
  canRequest: boolean;
  primaryDisabled: boolean;
  primaryLoading: boolean;
  primaryButtonLabel: string;
  resNm: string;
  setResNm: (value: string) => void;
  resNo: string;
  setResNo: (value: string) => void;
  mobileNo: string;
  setMobileNo: (value: string) => void;
  onPrimaryAction: () => void;
  onUnlink: () => void;
};

export function HealthLinkAuthSection({
  loggedIn,
  statusError,
  actionNotice,
  actionError,
  actionErrorCode,
  sessionExpired,
  showHealthInPrereqGuide,
  primaryFlow,
  canRequest,
  primaryDisabled,
  primaryLoading,
  primaryButtonLabel,
  resNm,
  setResNm,
  resNo,
  setResNo,
  mobileNo,
  setMobileNo,
  onPrimaryAction,
  onUnlink,
}: HealthLinkAuthSectionProps) {
  const { showToast } = useToast();
  const lastStatusErrorRef = useRef<string | null>(null);
  const lastActionNoticeRef = useRef<string | null>(null);
  const lastActionErrorRef = useRef<string | null>(null);
  const sessionExpiredNotifiedRef = useRef(false);
  const isSessionExpired =
    sessionExpired || actionErrorCode === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED;
  const showIdentityForm = primaryFlow.kind === "init";
  const requiredTitle = showIdentityForm
    ? HEALTH_LINK_COPY.auth.requiredInitTitle
    : HEALTH_LINK_COPY.auth.requiredSignTitle;
  const requiredDescription = showIdentityForm
    ? HEALTH_LINK_COPY.auth.requiredInitDescription
    : HEALTH_LINK_COPY.auth.requiredSignDescription;
  const mandatoryActionHint = showIdentityForm
    ? HEALTH_LINK_COPY.auth.requiredActionHintInit
    : HEALTH_LINK_COPY.auth.requiredActionHintSign;
  const showOptionalLogin = !loggedIn && showIdentityForm;

  useEffect(() => {
    const message = statusError
      ? parseErrorMessage(statusError, HEALTH_LINK_COPY.auth.statusLoadFallback)
      : "";
    if (!message || lastStatusErrorRef.current === message) return;
    lastStatusErrorRef.current = message;
    showToast(message, { type: "error", duration: 4500 });
  }, [showToast, statusError]);

  useEffect(() => {
    const message = actionNotice?.trim() ?? "";
    if (!message || lastActionNoticeRef.current === message) return;
    lastActionNoticeRef.current = message;
    showToast(message, { type: "success", duration: 3200 });
  }, [actionNotice, showToast]);

  useEffect(() => {
    if (isSessionExpired) {
      if (sessionExpiredNotifiedRef.current) return;
      sessionExpiredNotifiedRef.current = true;
      showToast(HEALTH_LINK_COPY.result.sessionExpiredGuide, {
        type: "error",
        duration: 5200,
      });
      return;
    }
    sessionExpiredNotifiedRef.current = false;
  }, [isSessionExpired, showToast]);

  useEffect(() => {
    if (isSessionExpired) return;
    const message = actionError?.trim() ?? "";
    if (!message || lastActionErrorRef.current === message) return;
    lastActionErrorRef.current = message;
    showToast(message, { type: "error", duration: 4800 });
  }, [actionError, isSessionExpired, showToast]);

  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{primaryFlow.title}</h2>
      </div>
      <p className={styles.sectionDescription}>{primaryFlow.guide}</p>
      <div className={styles.requiredCard}>
        <strong>{requiredTitle}</strong>
        <p>{requiredDescription}</p>
      </div>

      {showIdentityForm ? (
        <>
          <div className={styles.formGrid}>
            <div className={styles.kakaoOnly}>
              <Image src="/kakao.svg" width={18} height={18} alt="카카오" />
              <div>
                <strong>{HEALTH_LINK_COPY.auth.channelTitle}</strong>
                <p>{HEALTH_LINK_COPY.auth.channelDescription}</p>
              </div>
            </div>

            <label className={styles.field}>
              <span>{HEALTH_LINK_COPY.auth.nameLabel}</span>
              <input
                type="text"
                name="resNm"
                autoComplete="name"
                value={resNm}
                onChange={(event) => setResNm(event.target.value)}
                className={styles.input}
                placeholder={HEALTH_LINK_COPY.auth.namePlaceholder}
                disabled={!canRequest}
              />
            </label>

            <label className={styles.field}>
              <span>{HEALTH_LINK_COPY.auth.birthLabel}</span>
              <input
                type="text"
                name="resNo"
                autoComplete="bday"
                inputMode="numeric"
                spellCheck={false}
                value={resNo}
                onChange={(event) =>
                  setResNo(event.target.value.replace(/\D/g, ""))
                }
                className={styles.input}
                placeholder={HEALTH_LINK_COPY.auth.birthPlaceholder}
                maxLength={8}
                disabled={!canRequest}
              />
            </label>

            <label className={styles.field}>
              <span>{HEALTH_LINK_COPY.auth.phoneLabel}</span>
              <input
                type="tel"
                name="mobileNo"
                autoComplete="tel-national"
                inputMode="numeric"
                spellCheck={false}
                value={mobileNo}
                onChange={(event) =>
                  setMobileNo(event.target.value.replace(/\D/g, ""))
                }
                className={styles.input}
                placeholder={HEALTH_LINK_COPY.auth.phonePlaceholder}
                maxLength={11}
                disabled={!canRequest}
              />
            </label>
          </div>

          {showOptionalLogin ? (
            <details className={styles.optionalLoginDetails}>
              <summary>{HEALTH_LINK_COPY.auth.optionalLoginSummary}</summary>
              <div className={styles.optionalLoginBody}>
                <p>{HEALTH_LINK_COPY.auth.optionalLoginDescription}</p>
                <p>{HEALTH_LINK_COPY.auth.optionalLoginHint}</p>
                <KakaoLoginButton
                  fullWidth
                  className={styles.optionalLoginButton}
                />
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <div className={styles.nextPanel}>
          <p className={styles.nextStepText}>
            {HEALTH_LINK_COPY.auth.pendingTitle}
          </p>
          <p className={styles.nextGuideText}>
            {HEALTH_LINK_COPY.auth.pendingDescription}
          </p>
        </div>
      )}

      <div className={styles.nextPanel}>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={primaryDisabled}
          aria-busy={primaryLoading}
          className={styles.nextButton}
        >
          <SpinnerLabel loading={primaryLoading} label={primaryButtonLabel} />
        </button>
        <button
          type="button"
          onClick={onUnlink}
          disabled={!canRequest}
          className={styles.unlinkButton}
        >
          {HEALTH_LINK_COPY.action.unlink}
        </button>
        <p className={styles.mandatoryHint}>{mandatoryActionHint}</p>
      </div>

      {showHealthInPrereqGuide ? (
        <div className={styles.noticeStack} aria-live="polite" role="status">
          <div className={styles.prereqCard}>
            <strong>{HEALTH_LINK_COPY.auth.prerequisiteTitle}</strong>
            <p>{HEALTH_LINK_COPY.auth.prerequisiteDescription}</p>
            <a
              href="https://www.nhis.or.kr/nhis/index.do"
              target="_blank"
              rel="noreferrer"
              className={styles.prereqLink}
            >
              {HEALTH_LINK_COPY.auth.prerequisiteLinkLabel}
            </a>
          </div>
        </div>
      ) : null}
    </article>
  );
}
