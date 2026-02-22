"use client";

import Image from "next/image";
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
  const isSessionExpired = sessionExpired || actionErrorCode === NHIS_ERR_CODE_LOGIN_SESSION_EXPIRED;
  const showIdentityForm = primaryFlow.kind === "init";

  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{primaryFlow.title}</h2>
      </div>
      <p className={styles.sectionDescription}>{primaryFlow.guide}</p>

      {showIdentityForm ? (
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
              onChange={(event) => setResNo(event.target.value.replace(/\D/g, ""))}
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
              onChange={(event) => setMobileNo(event.target.value.replace(/\D/g, ""))}
              className={styles.input}
              placeholder={HEALTH_LINK_COPY.auth.phonePlaceholder}
              maxLength={11}
              disabled={!canRequest}
            />
          </label>
        </div>
      ) : (
        <div className={styles.nextPanel}>
          <p className={styles.nextStepText}>{HEALTH_LINK_COPY.auth.pendingTitle}</p>
          <p className={styles.nextGuideText}>{HEALTH_LINK_COPY.auth.pendingDescription}</p>
        </div>
      )}

      <div className={styles.nextPanel}>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={primaryDisabled}
          className={styles.nextButton}
        >
          <SpinnerLabel loading={primaryLoading} label={primaryButtonLabel} />
        </button>
        <button
          type="button"
          onClick={onUnlink}
          disabled={!loggedIn}
          className={styles.unlinkButton}
        >
          {HEALTH_LINK_COPY.action.unlink}
        </button>
      </div>

      <div className={styles.noticeStack} aria-live="polite">
        {statusError ? (
          <div className={styles.noticeError}>
            {parseErrorMessage(statusError, HEALTH_LINK_COPY.auth.statusLoadFallback)}
          </div>
        ) : null}
        {actionNotice ? <div className={styles.noticeSuccess}>{actionNotice}</div> : null}
        {isSessionExpired ? (
          <div className={styles.noticeWarn}>
            <strong>{HEALTH_LINK_COPY.result.sessionExpiredTitle}</strong>
            <div className={styles.noticeLine}>
              {HEALTH_LINK_COPY.result.sessionExpiredGuide}
            </div>
          </div>
        ) : null}
        {actionError && !isSessionExpired ? (
          <div className={styles.noticeError}>{actionError}</div>
        ) : null}

        {showHealthInPrereqGuide ? (
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
        ) : null}
      </div>
    </article>
  );
}
