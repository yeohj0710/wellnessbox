"use client";

import Image from "next/image";
import { HealthLinkStatusMeta } from "./HealthLinkStatusMeta";
import { SpinnerLabel, StepStrip } from "./HealthLinkCommon";
import { HEALTH_LINK_COPY } from "../copy";
import type { NhisStatusResponse } from "../types";
import type { PrimaryFlow } from "../ui-types";
import { parseErrorMessage } from "../utils";
import styles from "../HealthLinkClient.module.css";

type HealthLinkAuthSectionProps = {
  loggedIn: boolean;
  status: NhisStatusResponse["status"];
  statusLinked: boolean;
  statusLoading: boolean;
  statusError: string | null;
  actionNotice: string | null;
  actionError: string | null;
  showHealthInPrereqGuide: boolean;
  currentStep: number;
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
  forceRefreshRemainingSeconds: number;
  forceRefreshAvailableAt: string | null;
  onRefreshStatus: () => void;
  onPrimaryAction: () => void;
  onUnlink: () => void;
};

export function HealthLinkAuthSection({
  loggedIn,
  status,
  statusLinked,
  statusLoading,
  statusError,
  actionNotice,
  actionError,
  showHealthInPrereqGuide,
  currentStep,
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
  forceRefreshRemainingSeconds,
  forceRefreshAvailableAt,
  onRefreshStatus,
  onPrimaryAction,
  onUnlink,
}: HealthLinkAuthSectionProps) {
  return (
    <article className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>1. {HEALTH_LINK_COPY.auth.title}</h2>
        <button
          type="button"
          onClick={onRefreshStatus}
          disabled={!loggedIn || statusLoading}
          className={styles.ghostButton}
        >
          <SpinnerLabel loading={statusLoading} label={HEALTH_LINK_COPY.action.refreshStatus} />
        </button>
      </div>

      <StepStrip activeStep={primaryFlow.step} completedStep={currentStep} />

      <div className={styles.formGrid}>
        <div className={styles.kakaoOnly}>
          <Image src="/kakao.svg" width={18} height={18} alt="Kakao" />
          <div>
            <strong>{HEALTH_LINK_COPY.auth.channelTitle}</strong>
            <p>{HEALTH_LINK_COPY.auth.channelDescription}</p>
          </div>
        </div>

        <label className={styles.field}>
          <span>{HEALTH_LINK_COPY.auth.nameLabel}</span>
          <input
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
            value={mobileNo}
            onChange={(event) => setMobileNo(event.target.value.replace(/\D/g, ""))}
            className={styles.input}
            placeholder={HEALTH_LINK_COPY.auth.phonePlaceholder}
            maxLength={11}
            disabled={!canRequest}
          />
        </label>
      </div>

      <div className={styles.nextPanel}>
        <p className={styles.nextStepText}>
          {HEALTH_LINK_COPY.auth.currentStepPrefix} {primaryFlow.step}/3: {primaryFlow.title}
        </p>
        <p className={styles.nextGuideText}>{primaryFlow.guide}</p>
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
          disabled={!canRequest}
          className={styles.unlinkButton}
        >
          {HEALTH_LINK_COPY.action.unlink}
        </button>
      </div>

      <div className={styles.noticeStack}>
        {statusError ? (
          <div className={styles.noticeError}>
            {parseErrorMessage(statusError, HEALTH_LINK_COPY.auth.statusLoadFallback)}
          </div>
        ) : null}
        {actionNotice ? <div className={styles.noticeSuccess}>{actionNotice}</div> : null}
        {actionError ? <div className={styles.noticeError}>{actionError}</div> : null}

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

      <HealthLinkStatusMeta
        status={status}
        statusLinked={statusLinked}
        forceRefreshRemainingSeconds={forceRefreshRemainingSeconds}
        forceRefreshAvailableAt={forceRefreshAvailableAt}
      />
    </article>
  );
}
