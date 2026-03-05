"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPublicSurveyQuestionList,
  buildWellnessAnalysisInputFromSurvey,
  isSurveyQuestionAnswered,
  normalizeSurveyAnswersByTemplate,
  resolveGroupFieldValues,
  resolveSelectedSectionsFromC27,
  sanitizeSurveyAnswerValue,
  toAnswerRecord,
  toInputValue,
  toMultiOtherTextByValue,
  toMultiValues,
  toggleSurveyMultiValue,
  updateSurveyMultiOtherText,
  validateSurveyQuestionAnswer,
  type PublicSurveyAnswers,
  type PublicSurveyQuestionNode,
} from "@/lib/b2b/public-survey";
import { computeWellnessResult, type WellnessComputedResult } from "@/lib/wellness/analysis";
import { loadWellnessTemplateForB2b } from "@/lib/wellness/data-loader";
import type { WellnessSurveyQuestionForTemplate } from "@/lib/wellness/data-template-types";
import {
  deleteEmployeeSession,
  fetchEmployeeSession,
  postEmployeeSync,
  requestNhisInit,
  requestNhisSign,
  upsertEmployeeSession,
} from "@/app/(features)/employee-report/_lib/api";
import type { IdentityInput } from "@/app/(features)/employee-report/_lib/client-types";
import {
  clearStoredIdentity,
  readStoredIdentityWithSource,
  saveStoredIdentity,
} from "@/app/(features)/employee-report/_lib/client-utils";
import { emitAuthSyncEvent, subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import { getLoginStatus } from "@/lib/useLoginStatus";
import SurveyCalculatingPanel from "./_components/SurveyCalculatingPanel";
import SurveyIntroPanel from "./_components/SurveyIntroPanel";
import SurveyResultPanel from "./_components/SurveyResultPanel";
import SurveySectionPanel from "./_components/SurveySectionPanel";
import SurveySubmittedPanel from "./_components/SurveySubmittedPanel";

const STORAGE_KEY = "b2b-public-survey-state.v4";
const BLOCK_SURVEY_START_TEMPORARILY = false;

const TEXT = {
  introBadge: "웰니스 리포트 사전 설문",
  introTitle: "\uC6F0\uB2C8\uC2A4\uBC15\uC2A4 \uC628\uB77C\uC778 \uAC74\uAC15 \uC124\uBB38",
  introDesc1:
    "\uD604\uC7AC \uAC74\uAC15 \uC0C1\uD0DC\uC640 \uC0DD\uD65C \uC2B5\uAD00\uC744 \uAC04\uD3B8\uD558\uAC8C \uD655\uC778\uD574 \uBCF4\uC138\uC694.",
  introDesc2:
    "\uC608\uC0C1 \uC18C\uC694 \uC2DC\uAC04\uC740 \uC57D 5~7\uBD84\uC774\uBA70, \uC785\uB825\uD55C \uB0B4\uC6A9\uC740 \uC790\uB3D9\uC73C\uB85C \uC800\uC7A5\uB429\uB2C8\uB2E4.",
  preAuthTitle: "\uC124\uBB38 \uC2DC\uC791 \uC804 \uCE74\uCE74\uC624 \uBCF8\uC778\uC778\uC99D",
  preAuthDesc:
    "\uC784\uC9C1\uC6D0 \uB9AC\uD3EC\uD2B8 \uB370\uC774\uD130 \uD1B5\uD569\uC744 \uC704\uD574 \uBCF8\uC778\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.",
  namePlaceholder: "\uC774\uB984",
  birthPlaceholder: "\uC0DD\uB144\uC6D4\uC77C 8\uC790\uB9AC",
  phonePlaceholder: "\uD734\uB300\uD3F0 \uBC88\uD638",
  sendAuth: "\uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uC778\uC99D \uBCF4\uB0B4\uAE30",
  resendAuth: "\uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uC778\uC99D \uB2E4\uC2DC \uBCF4\uB0B4\uAE30",
  checkAuth: "\uCE74\uCE74\uC624\uD1A1 \uC778\uC99D \uC644\uB8CC \uD6C4 \uD655\uC778",
  authDone: "\uC778\uC99D \uC644\uB8CC",
  authCheckingTitle: "\uC778\uC99D \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4",
  authCheckingDesc:
    "\uC774\uC804 \uC778\uC99D \uC815\uBCF4\uB97C \uC870\uD68C\uD558\uACE0 \uC788\uC5B4\uC694. \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694.",
  authLockedHint:
    "\uB2E4\uB978 \uC0AC\uB78C\uC73C\uB85C \uC9C4\uD589\uD558\uB824\uBA74 \uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC815\uBCF4\uB97C \uBCC0\uACBD\uD574 \uC8FC\uC138\uC694.",
  switchIdentity: "\uB2E4\uB978 \uC0AC\uB78C\uC73C\uB85C \uC124\uBB38 \uC9C4\uD589",
  startSurvey: "\uC124\uBB38 \uC2DC\uC791\uD558\uAE30",
  needAuthNotice:
    "\uBCF8\uC778\uC778\uC99D \uC644\uB8CC \uD6C4 \uC124\uBB38\uC744 \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  completedRestartHint: "완료된 설문 이력이 있어도 다시 시작하면 문항 선택값이 초기화되고 처음부터 진행됩니다.",
  busyRequest: "\uC694\uCCAD \uC911...",
  busyChecking: "\uD655\uC778 \uC911...",
  errorInvalidIdentity:
    "\uC774\uB984, \uC0DD\uB144\uC6D4\uC77C(8\uC790\uB9AC), \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC815\uD655\uD788 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
  noticeAuthBySession:
    "\uC774\uC804 \uC778\uC99D \uC138\uC158\uC744 \uD655\uC778\uD588\uC2B5\uB2C8\uB2E4. \uC124\uBB38\uC744 \uC774\uC5B4\uC11C \uC9C4\uD589\uD574 \uC8FC\uC138\uC694.",
  noticeAuthByStoredIdentity:
    "\uC774\uC804\uC5D0 \uC778\uC99D\uD55C \uC815\uBCF4\uAC00 \uD655\uC778\uB418\uC5B4 \uBC14\uB85C \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  noticeAuthRequested:
    "\uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uC778\uC99D\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4. \uCE74\uCE74\uC624\uD1A1\uC5D0\uC11C \uC778\uC99D \uC644\uB8CC \uD6C4 \uD655\uC778\uC744 \uB20C\uB7EC \uC8FC\uC138\uC694.",
  noticeAuthComplete:
    "\uBCF8\uC778\uC778\uC99D \uBC0F \uB370\uC774\uD130 \uC5F0\uB3D9\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC124\uBB38\uC744 \uC2DC\uC791\uD574 \uC8FC\uC138\uC694.",
  noticeNeedResend:
    "\uC778\uC99D \uC694\uCCAD\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uC778\uC99D\uC744 \uB2E4\uC2DC \uBCF4\uB0B4\uC8FC\uC138\uC694.",
  noticeSwitchedIdentity:
    "\uB2E4\uB978 \uC0AC\uB78C \uC815\uBCF4\uB85C \uC9C4\uD589\uD560 \uC218 \uC788\uB3C4\uB85D \uC778\uC99D \uC138\uC158\uC744 \uCD08\uAE30\uD654\uD588\uC2B5\uB2C8\uB2E4.",
  renewalTitle: "\uD604\uC7AC \uC124\uBB38 \uB9AC\uB274\uC5BC \uC911\uC785\uB2C8\uB2E4",
  renewalDesc1:
    "\uC77C\uBC18 \uC0AC\uC6A9\uC790\uB294 \uC544\uC9C1 \uC2DC\uC791\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  renewalDesc2:
    "\uC11C\uBE44\uC2A4 \uC810\uAC80 \uC911\uC774\uBA70 \uC774\uC6A9 \uAC00\uB2A5 \uC2DC\uC810\uC740 \uBCC4\uB3C4 \uACF5\uC9C0\uB85C \uC548\uB0B4\uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4.",
  close: "\uB2EB\uAE30",
  confirm: "\uD655\uC778",
  resetAsk: "\uCC98\uC74C\uBD80\uD130 \uB2E4\uC2DC \uC2DC\uC791\uD560\uAE4C\uC694?",
  resetDesc:
    "\uC9C0\uAE08\uAE4C\uC9C0 \uC785\uB825\uD55C \uC124\uBB38 \uB2F5\uBCC0\uC774 \uBAA8\uB450 \uCD08\uAE30\uD654\uB429\uB2C8\uB2E4.",
  cancel: "\uCDE8\uC18C",
  reset: "\uB2E4\uC2DC \uC2DC\uC791",
  progressBarLabel: "\uC9C4\uD589\uB960",
  sectionGuide:
    "\uD604\uC7AC \uC139\uC158 \uBB38\uD56D\uC5D0 \uB2F5\uD558\uBA74 \uC790\uB3D9\uC73C\uB85C \uB2E4\uC74C \uBB38\uD56D\uC73C\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.",
  restart: "\uCC98\uC74C\uBD80\uD130 \uB2E4\uC2DC \uC2DC\uC791",
  commonSection: "\uACF5\uD1B5 \uBB38\uD56D",
  commonBadge: "\uACF5\uD1B5 \uC124\uBB38",
  requiredBadge: "\uD544\uC218",
  optionalBadge: "\uC120\uD0DD",
  optionalHint:
    "\uD574\uB2F9 \uC0AC\uD56D\uC774 \uC5C6\uC73C\uBA74 \uC120\uD0DD\uD558\uC9C0 \uC54A\uACE0 \uB2E4\uC74C\uC73C\uB85C \uB118\uC5B4\uAC00\uB3C4 \uB429\uB2C8\uB2E4.",
  sectionCounterPrefix: "\uC139\uC158 \uB0B4 \uBB38\uD56D",
  prevQuestion: "\uC774\uC804 \uBB38\uD56D",
  prevSection: "\uC774\uC804 \uC139\uC158",
  nextQuestion: "\uB2E4\uC74C \uBB38\uD56D",
  nextSection: "\uB2E4\uC74C \uC139\uC158",
  sectionTransitionTitle: "\uC120\uD0DD\uD55C \uBD84\uC57C \uBB38\uD56D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
  sectionTransitionDesc: "\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694.",
  resultCheck: "\uACB0\uACFC \uD655\uC778",
  editSurvey: "\uC124\uBB38 \uB2F5\uC548 \uC218\uC815",
  resultTitle: "\uC124\uBB38 \uACB0\uACFC",
  viewEmployeeReport: "\uB0B4 \uAC74\uAC15 \uB808\uD3EC\uD2B8 \uBCF4\uAE30",
  scoreHealth: "\uAC74\uAC15\uC810\uC218",
  scoreRisk: "\uC0DD\uD65C\uC2B5\uAD00 \uC704\uD5D8\uB3C4",
  scoreNeed: "\uAC74\uAC15\uAD00\uB9AC \uD544\uC694\uB3C4 \uD3C9\uADE0",
  submittedTitle: "설문이 제출되었습니다.",
  submittedDesc:
    "제출하신 내용은 정상 저장되었습니다. 필요하면 답안을 수정하거나 처음부터 다시 시작할 수 있습니다.",
};

const CALCULATING_MESSAGES = [
  "\uC785\uB825 \uC815\uBCF4\uB97C \uC815\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
  "\uC0DD\uD65C\uC2B5\uAD00 \uC704\uD5D8\uB3C4\uB97C \uACC4\uC0B0\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
  "\uAC74\uAC15\uAD00\uB9AC \uD544\uC694\uB3C4\uB97C \uACC4\uC0B0\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
  "\uACB0\uACFC\uB97C \uC900\uBE44\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.",
];

type SurveyPhase = "intro" | "survey" | "calculating" | "result";
type PersistedSurveyPhase = Exclude<SurveyPhase, "calculating">;

type PersistedSurveyState = {
  phase: PersistedSurveyPhase;
  currentSectionIndex: number;
  focusedQuestionBySection?: Record<string, string>;
  confirmedQuestionKeys?: string[];
  completedSectionKeys?: string[];
  updatedAt?: string;
  periodKey?: string;
  answers: PublicSurveyAnswers;
  selectedSections: string[];
};

type SurveySectionGroup = {
  key: string;
  title: string;
  questions: PublicSurveyQuestionNode[];
};

type EmployeeSurveyResponsePayload = {
  id: string;
  periodKey: string | null;
  selectedSections: string[];
  answersJson: unknown;
  submittedAt?: string | null;
  updatedAt: string;
};

type EmployeeSurveyGetResponse = {
  ok: boolean;
  periodKey?: string;
  response?: EmployeeSurveyResponsePayload | null;
};

type EmployeeSurveyPutResponse = {
  ok: boolean;
  response?: {
    id: string;
    periodKey: string | null;
    selectedSections: string[];
    submittedAt: string | null;
    updatedAt: string;
  };
};

async function requestSurveyJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "request_failed");
  }
  return data;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toIdentityPayload(identity: IdentityInput): IdentityInput {
  return {
    name: identity.name.trim(),
    birthDate: normalizeDigits(identity.birthDate),
    phone: normalizeDigits(identity.phone),
  };
}

function isValidIdentityInput(identity: IdentityInput) {
  const normalized = toIdentityPayload(identity);
  return (
    normalized.name.length > 0 &&
    /^\d{8}$/.test(normalized.birthDate) &&
    /^\d{10,11}$/.test(normalized.phone)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDisplayQuestionText(question: WellnessSurveyQuestionForTemplate) {
  let text = (question.text ?? "")
    .replace(/귀하께서는/g, "")
    .replace(/귀하께서/g, "")
    .replace(/귀하가/g, "")
    .replace(/귀하의/g, "")
    .replace(/귀하는/g, "")
    .replace(/귀하\b/g, "")
    .replace(/\s*\uB9CC\s*\(\s*\)\s*\uC138/gi, "")
    .replace(/\uB9CC\s*\uB098\uC774/g, "\uB098\uC774")
    .replace(/\(\s*\)/g, "")
    .replace(/\uD574\uC8FC\uC2ED\uC2DC\uC624/g, "\uD574 \uC8FC\uC138\uC694")
    .replace(/\uAE30\uC7AC\uD574/g, "\uC785\uB825\uD574")
    .replace(/^\s*\uC5EC\uC131\uC77C\s*\uACBD\uC6B0/g, "\uC5EC\uC131\uC774\uB77C\uBA74")
    .replace(/^\s*\uB0A8\uC131\uC77C\s*\uACBD\uC6B0/g, "\uB0A8\uC131\uC774\uB77C\uBA74")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/^\s*[\uC758\uAC00\uB294]\s+/, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  if (question.type === "group" && (question.fields?.length ?? 0) > 0) {
    const trailingUnits = (question.fields ?? [])
      .map((field) => {
        const label = (field.label ?? "").trim();
        if (!label) return "";
        const unit = (field.unit ?? "").trim();
        if (!unit) return escapeRegExp(label);
        return `${escapeRegExp(label)}\\s*\\(?\\s*${escapeRegExp(unit)}\\s*\\)?`;
      })
      .filter(Boolean);
    if (trailingUnits.length > 0) {
      const trailingPattern = new RegExp(
        `(?:\\s*[:,-]?\\s*)?(?:${trailingUnits.join("\\s+")})\\s*$`,
        "i"
      );
      text = text.replace(trailingPattern, "").trim();
    }
  }

  return text.replace(/\s+[,.]$/g, "").trim();
}

function resolveProgressMessage(percent: number) {
  if (percent <= 0) return "\uC124\uBB38\uC744 \uC2DC\uC791\uD574 \uC8FC\uC138\uC694.";
  if (percent < 25) return "\uC88B\uC740 \uCD9C\uBC1C\uC785\uB2C8\uB2E4.";
  if (percent < 50) return "\uCC28\uADFC\uCC28\uADFC \uC798 \uC9C4\uD589 \uC911\uC785\uB2C8\uB2E4.";
  if (percent < 75) return "\uC808\uBC18 \uC774\uC0C1 \uC9C4\uD589\uB410\uC2B5\uB2C8\uB2E4.";
  if (percent < 100) return "\uAC70\uC758 \uC644\uB8CC \uB2E8\uACC4\uC785\uB2C8\uB2E4.";
  return "\uC124\uBB38\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.";
}

function isOptionalSelectionQuestion(question: WellnessSurveyQuestionForTemplate) {
  if (question.type !== "single" && question.type !== "multi") return false;
  return !question.required;
}

function isQuestionEffectivelyRequired(question: WellnessSurveyQuestionForTemplate) {
  return question.required;
}

function normalizeHintTextForMatch(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

function isOptionalHintLikeText(text: string | undefined) {
  if (!text) return false;
  const normalized = normalizeHintTextForMatch(text);
  const baseHint = normalizeHintTextForMatch(TEXT.optionalHint);
  if (normalized === baseHint) return true;
  if (normalized.includes("선택하지않고다음")) return true;
  return (
    normalized.includes("해당") &&
    normalized.includes("없") &&
    normalized.includes("선택") &&
    normalized.includes("다음")
  );
}

function isNoneLikeOption(option: { label?: string | null; value?: string | null }) {
  const normalized = `${option.label ?? ""}${option.value ?? ""}`.replace(/\s+/g, "").toLowerCase();
  return (
    normalized === "\uC5C6\uC74C" ||
    normalized.includes("\uD574\uB2F9\uC5C6\uC74C") ||
    normalized === "none"
  );
}

type NumericRangeRule = {
  min: number;
  max: number;
  label: string;
};

function parseFiniteNumber(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveNumberRangeForQuestion(question: WellnessSurveyQuestionForTemplate): NumericRangeRule | null {
  const key = (question.key ?? "").toLowerCase();
  const text = `${question.text ?? ""} ${question.placeholder ?? ""}`.toLowerCase();
  if (key === "c02" || text.includes("나이")) return { min: 0, max: 120, label: "나이" };
  if (text.includes("몸무게") || text.includes("체중") || text.includes("kg")) {
    return { min: 20, max: 250, label: "몸무게" };
  }
  if (text.includes("키") || text.includes("cm")) return { min: 50, max: 250, label: "키" };
  return null;
}

function resolveNumberRangeForGroupField(field: {
  id?: string | null;
  label?: string | null;
  unit?: string | null;
}): NumericRangeRule | null {
  const id = (field.id ?? "").toLowerCase();
  const label = (field.label ?? "").toLowerCase();
  const unit = (field.unit ?? "").toLowerCase();
  if (id.includes("age") || label.includes("나이")) return { min: 0, max: 120, label: "나이" };
  if (id.includes("weight") || label.includes("몸무게") || label.includes("체중") || unit === "kg") {
    return { min: 20, max: 250, label: "몸무게" };
  }
  if (id.includes("height") || label.includes("키") || unit === "cm") {
    return { min: 50, max: 250, label: "키" };
  }
  return null;
}

function buildOutOfRangeWarning(rule: NumericRangeRule, value: string): string | null {
  const parsed = parseFiniteNumber(value);
  if (parsed == null) return null;
  if (parsed < rule.min || parsed > rule.max) {
    return `적절하지 않은 값입니다. ${rule.label}는 ${rule.min}~${rule.max} 범위로 입력해 주세요.`;
  }
  return null;
}

function resolveQuestionNumericWarning(
  question: WellnessSurveyQuestionForTemplate,
  answer: unknown
): string | null {
  if (question.type === "number") {
    const rule = resolveNumberRangeForQuestion(question);
    if (!rule) return null;
    return buildOutOfRangeWarning(rule, toInputValue(answer));
  }

  if (question.type === "group") {
    const fields = question.fields ?? [];
    const values = resolveGroupFieldValues(question, answer);
    for (const field of fields) {
      if (field.type !== "number") continue;
      const rule = resolveNumberRangeForGroupField(field);
      if (!rule) continue;
      const warning = buildOutOfRangeWarning(rule, values[field.id] ?? "");
      if (warning) return warning;
    }
  }

  return null;
}

function resolveOptionLayout(options: Array<{ label?: string | null }>) {
  const count = options.length;
  const lengths = options.map((option) => (option.label ?? "").replace(/\s+/g, "").length);
  const maxLabelLength = lengths.length > 0 ? Math.max(...lengths) : 0;
  const avgLabelLength =
    lengths.length > 0
      ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length)
      : 0;
  const shortLabelRatio =
    lengths.length > 0 ? lengths.filter((len) => len <= 7).length / lengths.length : 0;

  if (count <= 1) return { gridClass: "grid-cols-1", compact: false };
  if (count === 2) return { gridClass: "grid-cols-2", compact: false };

  const canUseThreeColsOnMobile =
    count >= 12 && shortLabelRatio >= 0.65 && avgLabelLength <= 8;
  if (canUseThreeColsOnMobile) {
    if (count >= 12) return { gridClass: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5", compact: true };
    if (count >= 9) return { gridClass: "grid-cols-3 sm:grid-cols-4", compact: true };
    return { gridClass: "grid-cols-3 sm:grid-cols-3 lg:grid-cols-4", compact: true };
  }

  if (count <= 6) return { gridClass: "grid-cols-2 sm:grid-cols-3", compact: false };
  return { gridClass: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", compact: count >= 10 && maxLabelLength <= 10 };
}

function buildSurveySections(
  list: PublicSurveyQuestionNode[],
  selectedSections: string[],
  sectionTitleMap: Map<string, string>
) {
  const groups: SurveySectionGroup[] = [];
  const used = new Set<string>();

  const common = list.filter((item) => item.sectionKey === null);
  if (common.length > 0) {
    groups.push({ key: "common", title: TEXT.commonSection, questions: common });
    used.add("common");
  }

  for (const sectionKey of selectedSections) {
    const questions = list.filter((item) => item.sectionKey === sectionKey);
    if (questions.length === 0) continue;
    groups.push({
      key: sectionKey,
      title: sectionTitleMap.get(sectionKey) || sectionKey,
      questions,
    });
    used.add(sectionKey);
  }

  for (const item of list) {
    if (!item.sectionKey || used.has(item.sectionKey)) continue;
    const questions = list.filter((node) => node.sectionKey === item.sectionKey);
    if (questions.length === 0) continue;
    groups.push({
      key: item.sectionKey,
      title: sectionTitleMap.get(item.sectionKey) || item.sectionKey,
      questions,
    });
    used.add(item.sectionKey);
  }
  return groups;
}

function getFocusedIndex(
  section: SurveySectionGroup | null,
  focusedKey: string | undefined,
  answers: PublicSurveyAnswers
) {
  if (!section || section.questions.length === 0) return -1;
  if (focusedKey) {
    const idx = section.questions.findIndex((item) => item.question.key === focusedKey);
    if (idx >= 0) return idx;
  }
  const firstUnanswered = section.questions.findIndex(
    (item) => !isSurveyQuestionAnswered(item.question, answers[item.question.key])
  );
  return firstUnanswered >= 0 ? firstUnanswered : 0;
}

type SurveyOptionLike = { value?: string | null; label?: string | null };

const BMI_SOURCE_GROUP_KEY = "C03";
const DUPLICATE_SOURCE_COMMON_KEYS = {
  gender: "C01",
  age: "C02",
  femaleStatus: "C04",
  caffeine: "C18",
  alcoholFrequency: "C19",
  alcoholAmount: "C20",
  smoking: "C21",
  sleepDuration: "C23",
  sleepQuality: "C24",
  stress: "C26",
} as const;

const EXPLICIT_DUPLICATE_SOURCE_BY_QUESTION_KEY: Record<string, string> = {
  S02_Q01: DUPLICATE_SOURCE_COMMON_KEYS.caffeine,
  S02_Q02: DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration,
  S10_Q07: DUPLICATE_SOURCE_COMMON_KEYS.sleepQuality,
  S10_Q08: DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration,
  S19_Q09: DUPLICATE_SOURCE_COMMON_KEYS.femaleStatus,
  S23_Q01: DUPLICATE_SOURCE_COMMON_KEYS.gender,
};

type AutoSurveyResolution = {
  answers: PublicSurveyAnswers;
  hiddenQuestionKeys: Set<string>;
};

function normalizeMatchText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeQuestionTextForMatching(question: WellnessSurveyQuestionForTemplate) {
  return normalizeMatchText(`${question.text ?? ""} ${question.helpText ?? ""}`);
}

function optionMatchTokens(option: WellnessSurveyQuestionForTemplate["options"][number]) {
  return [option.value, option.label, ...(option.aliases ?? [])]
    .map((value) => normalizeMatchText(String(value ?? "")))
    .filter(Boolean);
}

function hasTokenMatch(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return false;
  return a.includes(b) || b.includes(a);
}

function resolveOptionValueByTokens(
  question: WellnessSurveyQuestionForTemplate,
  tokens: string[]
): string | null {
  if (!tokens.length) return null;
  const normalizedTokens = tokens.map(normalizeMatchText).filter(Boolean);
  if (normalizedTokens.length === 0) return null;
  for (const option of question.options ?? []) {
    const keys = optionMatchTokens(option);
    if (keys.some((key) => normalizedTokens.some((token) => hasTokenMatch(token, key)))) {
      return option.value;
    }
  }
  return null;
}

function collectAnswerTokensForMapping(
  sourceQuestion: WellnessSurveyQuestionForTemplate,
  sourceRawValue: unknown
) {
  const tokens = new Set<string>();
  const addToken = (value: unknown) => {
    const normalized = normalizeMatchText(String(value ?? ""));
    if (normalized) tokens.add(normalized);
  };

  addToken(toInputValue(sourceRawValue));
  for (const value of toMultiValues(sourceRawValue)) {
    addToken(value);
  }

  const record = toAnswerRecord(sourceRawValue);
  if (record) {
    if (typeof record.answerValue === "string") addToken(record.answerValue);
    if (typeof record.answerText === "string") addToken(record.answerText);
  }

  const selectedValues = toMultiValues(sourceRawValue);
  const scalar = toInputValue(sourceRawValue).trim();
  if (scalar && selectedValues.length === 0) selectedValues.push(scalar);
  for (const selected of selectedValues) {
    const option = (sourceQuestion.options ?? []).find((item) => item.value === selected);
    if (!option) continue;
    addToken(option.value);
    addToken(option.label);
    for (const alias of option.aliases ?? []) addToken(alias);
  }

  return [...tokens];
}

function resolveAgeThresholdFromQuestion(question: WellnessSurveyQuestionForTemplate): number | null {
  const source = `${question.text ?? ""} ${question.helpText ?? ""}`;
  const matched = source.match(/만\s*(\d{1,3})\s*세\s*이상/i);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveBinaryOptionValues(question: WellnessSurveyQuestionForTemplate) {
  const options = question.options ?? [];
  if (options.length === 0) return { yesValue: null as string | null, noValue: null as string | null };
  const yesKeywords = ["예", "네", "있", "해당", "맞", "yes", "true"];
  const noKeywords = ["아니", "없", "해당없", "no", "false"];
  const findByKeywords = (keywords: string[]) =>
    options.find((option) => {
      const source = normalizeMatchText([option.value, option.label, ...(option.aliases ?? [])].join(" "));
      return keywords.some((keyword) => source.includes(normalizeMatchText(keyword)));
    })?.value ?? null;

  const yesValue = findByKeywords(yesKeywords) ?? options[0]?.value ?? null;
  const fallbackNo = options.find((option) => option.value !== yesValue)?.value ?? null;
  const noValue = findByKeywords(noKeywords) ?? fallbackNo;
  return { yesValue, noValue };
}

function resolveDuplicateCommonSourceKey(node: PublicSurveyQuestionNode): string | null {
  if (!node.sectionKey) return null;
  const explicit = EXPLICIT_DUPLICATE_SOURCE_BY_QUESTION_KEY[node.question.key];
  if (explicit) return explicit;

  const text = normalizeQuestionTextForMatching(node.question);
  if (!text) return null;

  if (text.includes("흡연") || text.includes("전자담배") || text.includes("담배")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.smoking;
  }
  if (text.includes("스트레스")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.stress;
  }
  if (text.includes("성별")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.gender;
  }
  if (text.includes("카페인") || text.includes("커피")) {
    return DUPLICATE_SOURCE_COMMON_KEYS.caffeine;
  }
  if (text.includes("음주") || text.includes("술")) {
    if (text.includes("음주량") || text.includes("1회") || text.includes("한번") || text.includes("몇잔")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.alcoholAmount;
    }
    if (text.includes("빈도") || text.includes("횟수") || text.includes("자주")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.alcoholFrequency;
    }
  }
  if (text.includes("수면") || text.includes("잠")) {
    if (text.includes("질") || text.includes("숙면") || text.includes("개운")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.sleepQuality;
    }
    if (text.includes("시간") || text.includes("68")) {
      return DUPLICATE_SOURCE_COMMON_KEYS.sleepDuration;
    }
  }
  if (resolveAgeThresholdFromQuestion(node.question) != null) {
    return DUPLICATE_SOURCE_COMMON_KEYS.age;
  }
  return null;
}

function isSameAnswerValue(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function mapSourceAnswerToTargetQuestion(input: {
  sourceQuestion: WellnessSurveyQuestionForTemplate;
  sourceRawValue: unknown;
  targetQuestion: WellnessSurveyQuestionForTemplate;
  maxSelectedSections: number;
}): unknown | null {
  const { sourceQuestion, sourceRawValue, targetQuestion, maxSelectedSections } = input;
  if (!isSurveyQuestionAnswered(sourceQuestion, sourceRawValue)) return null;

  if (targetQuestion.type === "single") {
    const tokens = collectAnswerTokensForMapping(sourceQuestion, sourceRawValue);
    const matchedValue = resolveOptionValueByTokens(targetQuestion, tokens);
    if (!matchedValue) return null;
    const sanitized = sanitizeSurveyAnswerValue(targetQuestion, matchedValue, maxSelectedSections);
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  if (targetQuestion.type === "multi") {
    const tokens = collectAnswerTokensForMapping(sourceQuestion, sourceRawValue);
    const selectedValues = Array.from(
      new Set(
        tokens
          .map((token) => resolveOptionValueByTokens(targetQuestion, [token]))
          .filter((value): value is string => Boolean(value))
      )
    );
    if (selectedValues.length === 0) return null;
    const sanitized = sanitizeSurveyAnswerValue(targetQuestion, selectedValues, maxSelectedSections);
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  if (targetQuestion.type === "number" || targetQuestion.type === "text") {
    const scalar = toInputValue(sourceRawValue).trim();
    if (!scalar) return null;
    const sanitized = sanitizeSurveyAnswerValue(targetQuestion, scalar, maxSelectedSections);
    return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
  }

  return null;
}

function resolveAgeDerivedAnswerForQuestion(input: {
  sourceRawValue: unknown;
  targetQuestion: WellnessSurveyQuestionForTemplate;
  maxSelectedSections: number;
}): unknown | null {
  const { sourceRawValue, targetQuestion, maxSelectedSections } = input;
  if (targetQuestion.type !== "single") return null;
  const threshold = resolveAgeThresholdFromQuestion(targetQuestion);
  if (threshold == null) return null;
  const age = toPositiveNumber(toInputValue(sourceRawValue));
  if (age == null) return null;
  const { yesValue, noValue } = resolveBinaryOptionValues(targetQuestion);
  const targetValue = age >= threshold ? yesValue : noValue;
  if (!targetValue) return null;
  const sanitized = sanitizeSurveyAnswerValue(targetQuestion, targetValue, maxSelectedSections);
  return isSurveyQuestionAnswered(targetQuestion, sanitized) ? sanitized : null;
}

function resolveAutoDuplicateSurveyState(input: {
  answers: PublicSurveyAnswers;
  questionList: PublicSurveyQuestionNode[];
  maxSelectedSections: number;
}): AutoSurveyResolution {
  const questionMap = new Map(input.questionList.map((node) => [node.question.key, node.question]));
  const hiddenQuestionKeys = new Set<string>();
  let nextAnswers = input.answers;

  for (const node of input.questionList) {
    if (!node.sectionKey) continue;
    const sourceCommonKey = resolveDuplicateCommonSourceKey(node);
    if (!sourceCommonKey) continue;

    const sourceQuestion = questionMap.get(sourceCommonKey);
    if (!sourceQuestion) continue;
    const sourceRawValue = input.answers[sourceCommonKey];
    if (!isSurveyQuestionAnswered(sourceQuestion, sourceRawValue)) continue;

    const derivedAnswer =
      sourceCommonKey === DUPLICATE_SOURCE_COMMON_KEYS.age
        ? resolveAgeDerivedAnswerForQuestion({
            sourceRawValue,
            targetQuestion: node.question,
            maxSelectedSections: input.maxSelectedSections,
          })
        : mapSourceAnswerToTargetQuestion({
            sourceQuestion,
            sourceRawValue,
            targetQuestion: node.question,
            maxSelectedSections: input.maxSelectedSections,
          });
    if (derivedAnswer == null) continue;

    hiddenQuestionKeys.add(node.question.key);
    if (isSameAnswerValue(input.answers[node.question.key], derivedAnswer)) continue;
    if (nextAnswers === input.answers) nextAnswers = { ...input.answers };
    nextAnswers[node.question.key] = derivedAnswer;
  }

  return { answers: nextAnswers, hiddenQuestionKeys };
}

function resolveAutoComputedSurveyState(input: {
  answers: PublicSurveyAnswers;
  questionList: PublicSurveyQuestionNode[];
  maxSelectedSections: number;
}): AutoSurveyResolution {
  const duplicateState = resolveAutoDuplicateSurveyState(input);
  const answersWithBmi = mergeAutoDerivedBmiAnswers(duplicateState.answers, input.questionList);
  const hiddenQuestionKeys = new Set(duplicateState.hiddenQuestionKeys);
  for (const node of input.questionList) {
    if (!isAutoDerivedBmiQuestion(node)) continue;
    hiddenQuestionKeys.add(node.question.key);
  }
  return { answers: answersWithBmi, hiddenQuestionKeys };
}

function toPositiveNumber(raw: string | undefined): number | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function resolveBmiFromAnswers(
  answers: PublicSurveyAnswers,
  questionList: PublicSurveyQuestionNode[]
): number | null {
  const bmiSourceQuestion = questionList.find(
    (node) => node.question.key === BMI_SOURCE_GROUP_KEY && node.question.type === "group"
  )?.question;
  if (!bmiSourceQuestion) return null;

  const fields = resolveGroupFieldValues(bmiSourceQuestion, answers[BMI_SOURCE_GROUP_KEY]);
  const heightCm = toPositiveNumber(fields.heightCm);
  const weightKg = toPositiveNumber(fields.weightKg);
  if (heightCm == null || weightKg == null) return null;
  const heightMeter = heightCm > 3 ? heightCm / 100 : heightCm;
  if (!Number.isFinite(heightMeter) || heightMeter <= 0) return null;
  const bmi = weightKg / (heightMeter * heightMeter);
  return Number.isFinite(bmi) && bmi > 0 ? bmi : null;
}

function isAutoDerivedBmiQuestion(node: PublicSurveyQuestionNode) {
  if (node.question.type !== "single") return false;
  const source = [
    node.question.text ?? "",
    node.question.helpText ?? "",
    ...(node.question.options ?? []).map((option) => `${option.label ?? ""} ${option.value ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
  return source.includes("bmi") || source.includes("체질량지수");
}

function pickOptionValue(options: SurveyOptionLike[], code: string, fallbackIndex: number): string | null {
  const codeUpper = code.toUpperCase();
  const byCode = options.find((option) => (option.value ?? "").trim().toUpperCase() === codeUpper);
  if (byCode?.value) return byCode.value;
  const fallback = options[Math.max(0, Math.min(fallbackIndex, options.length - 1))];
  return fallback?.value ?? null;
}

function resolveAutoDerivedBmiAnswer(options: SurveyOptionLike[], bmi: number | null): string | null {
  if (options.length === 0) return null;
  const high = pickOptionValue(options, "A", 0);
  const normal = pickOptionValue(options, "B", 1);
  const low = pickOptionValue(options, "C", 2);
  const unknown = pickOptionValue(options, "D", options.length - 1) ?? low ?? normal ?? high;
  const hasFourChoiceScale = options.some((option) => (option.value ?? "").trim().toUpperCase() === "D");
  if (bmi == null) return unknown;
  if (hasFourChoiceScale) {
    if (bmi >= 25) return high;
    if (bmi > 18.5) return normal ?? high;
    return low ?? normal ?? high;
  }
  if (bmi >= 25) return high;
  return normal ?? high;
}

function mergeAutoDerivedBmiAnswers(
  inputAnswers: PublicSurveyAnswers,
  questionList: PublicSurveyQuestionNode[]
): PublicSurveyAnswers {
  const bmi = resolveBmiFromAnswers(inputAnswers, questionList);
  let nextAnswers = inputAnswers;
  for (const node of questionList) {
    if (!isAutoDerivedBmiQuestion(node)) continue;
    const derivedValue = resolveAutoDerivedBmiAnswer(node.question.options ?? [], bmi);
    if (!derivedValue) continue;
    if (toInputValue(inputAnswers[node.question.key]) === derivedValue) continue;
    if (nextAnswers === inputAnswers) nextAnswers = { ...inputAnswers };
    nextAnswers[node.question.key] = derivedValue;
  }
  return nextAnswers;
}

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
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const restoredRef = useRef(false);
  const authBootstrappedRef = useRef(false);
  const restoredSnapshotUpdatedAtRef = useRef(0);
  const remoteSurveyBootstrappedRef = useRef(false);
  const lastRemoteSavedSignatureRef = useRef("");
  const questionRefs = useRef<Record<string, HTMLElement | null>>({});
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

  const pruneAnswersByVisibility = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) => {
      const visibleKeys = new Set(
        buildPublicSurveyQuestionList(template, inputAnswers, selectedSections, {
          deriveSelectedSections: false,
        }).map((item) => item.question.key)
      );
      const pruned: PublicSurveyAnswers = {};
      for (const [questionKey, rawValue] of Object.entries(inputAnswers)) {
        if (!visibleKeys.has(questionKey)) continue;
        pruned[questionKey] = rawValue;
      }
      return pruned;
    },
    [template]
  );

  const buildVisibleQuestionList = useCallback(
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) => {
      const rawList = buildPublicSurveyQuestionList(template, inputAnswers, selectedSections, {
        deriveSelectedSections: false,
      });
      const autoComputed = resolveAutoComputedSurveyState({
        answers: inputAnswers,
        questionList: rawList,
        maxSelectedSections,
      });
      return rawList.filter((item) => !autoComputed.hiddenQuestionKeys.has(item.question.key));
    },
    [maxSelectedSections, template]
  );

  const questionListRaw = useMemo(
    () =>
      buildPublicSurveyQuestionList(template, answers, selectedSectionsCommitted, {
        deriveSelectedSections: false,
      }),
    [answers, selectedSectionsCommitted, template]
  );
  const autoComputedState = useMemo(
    () =>
      resolveAutoComputedSurveyState({
        answers,
        questionList: questionListRaw,
        maxSelectedSections,
      }),
    [answers, maxSelectedSections, questionListRaw]
  );
  const questionList = useMemo(
    () =>
      questionListRaw.filter(
        (item) => !autoComputedState.hiddenQuestionKeys.has(item.question.key)
      ),
    [autoComputedState, questionListRaw]
  );

  useEffect(() => {
    if (questionListRaw.length === 0) return;
    setAnswers((prev) =>
      resolveAutoComputedSurveyState({
        answers: prev,
        questionList: questionListRaw,
        maxSelectedSections,
      }).answers
    );
  }, [maxSelectedSections, questionListRaw]);

  const surveySections = useMemo(
    () => buildSurveySections(questionList, selectedSectionsCommitted, sectionTitleMap),
    [questionList, selectedSectionsCommitted, sectionTitleMap]
  );
  const visibleSectionKeySet = useMemo(
    () => new Set(surveySections.map((section) => section.key)),
    [surveySections]
  );
  const completedSectionKeySet = useMemo(
    () => new Set(completedSectionKeys.filter((key) => visibleSectionKeySet.has(key))),
    [completedSectionKeys, visibleSectionKeySet]
  );
  const visibleQuestionKeySet = useMemo(
    () => new Set(questionList.map((item) => item.question.key)),
    [questionList]
  );
  const currentSection = surveySections[currentSectionIndex] ?? null;
  const focusedIndex = getFocusedIndex(
    currentSection,
    focusedQuestionBySection[currentSection?.key ?? ""],
    answers
  );
  const focusedQuestionKey =
    currentSection && focusedIndex >= 0 ? currentSection.questions[focusedIndex].question.key : null;
  const progressTotalCount = questionList.length;
  const progressDoneCount = useMemo(() => {
    if (questionList.length === 0) return 0;
    let done = 0;
    for (const section of surveySections) {
      const requiredQuestions = section.questions.filter((item) =>
        isQuestionEffectivelyRequired(item.question)
      );
      const hasAllRequiredAnswers = requiredQuestions.every((item) =>
        isSurveyQuestionAnswered(item.question, answers[item.question.key])
      );
      const canTreatSectionAsCompleted =
        completedSectionKeySet.has(section.key) && hasAllRequiredAnswers;

      if (canTreatSectionAsCompleted) {
        done += section.questions.length;
        continue;
      }
      for (const item of section.questions) {
        if (isSurveyQuestionAnswered(item.question, answers[item.question.key])) {
          done += 1;
        }
      }
    }
    return Math.min(done, questionList.length);
  }, [answers, completedSectionKeySet, questionList.length, surveySections]);
  const progressDisplayDoneCount = useMemo(
    () => Math.min(progressDoneCount, progressTotalCount),
    [progressDoneCount, progressTotalCount]
  );
  const progressPercent = useMemo(() => {
    if (progressTotalCount === 0) return 0;
    return Math.round((progressDisplayDoneCount / progressTotalCount) * 100);
  }, [progressDisplayDoneCount, progressTotalCount]);
  const identityPayload = useMemo(() => toIdentityPayload(identity), [identity]);
  const validIdentity = useMemo(() => isValidIdentityInput(identityPayload), [identityPayload]);
  const identityLocked = authVerified && !identityEditable;
  const authInitializing = !hydrated || authBusy === "session";

  const refreshLoginStatus = useCallback(async () => {
    try {
      const status = await getLoginStatus();
      setIsAdminLoggedIn(status.isAdminLoggedIn);
    } catch {
      setIsAdminLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)));
  }, [visibleSectionKeySet]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshLoginStatus();
  }, [hydrated, refreshLoginStatus]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase !== "result") return;
    void refreshLoginStatus();
  }, [hydrated, phase, refreshLoginStatus]);

  useEffect(() => {
    if (surveySections.length === 0) {
      lastVisitedSectionIndexRef.current = 0;
      return;
    }
    const clampedCurrent = Math.max(0, Math.min(currentSectionIndex, surveySections.length - 1));
    const clampedPrevious = Math.max(
      0,
      Math.min(lastVisitedSectionIndexRef.current, surveySections.length - 1)
    );
    if (clampedCurrent > clampedPrevious) {
      const sectionKeysToComplete = surveySections
        .slice(clampedPrevious, clampedCurrent)
        .map((section) => section.key);
      if (sectionKeysToComplete.length > 0) {
        setCompletedSectionKeys((prev) => {
          const next = new Set(prev);
          for (const key of sectionKeysToComplete) next.add(key);
          return [...next];
        });
      }
    }
    lastVisitedSectionIndexRef.current = clampedCurrent;
  }, [currentSectionIndex, surveySections]);

  const scrollToQuestion = useCallback(
    (questionKey: string, options?: { align?: "comfort" | "center" }) => {
      const align = options?.align ?? "comfort";
      const run = (attempt: number) => {
        window.requestAnimationFrame(() => {
          const node = questionRefs.current[questionKey];
          if (!node) {
            if (attempt < 12) window.setTimeout(() => run(attempt + 1), 40);
            return;
          }

          const isMobileViewport = window.innerWidth < 640;
          const topPadding = isMobileViewport ? 84 : 116;
          const bottomPadding = isMobileViewport ? 104 : 170;
          const rect = node.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const safeTop = isMobileViewport ? 76 : 108;
          const safeBottom = isMobileViewport ? 92 : 148;
          const safeHeight = Math.max(1, viewportHeight - safeTop - safeBottom);

          if (align === "center") {
            const centeredOffset = safeTop + (safeHeight - Math.min(rect.height, safeHeight)) / 2;
            const targetTop = window.scrollY + rect.top - centeredOffset;
            if (Math.abs(targetTop - window.scrollY) > 6) {
              window.scrollTo({
                top: Math.max(0, targetTop),
                behavior: "smooth",
              });
            }
          } else {
            const inComfortZone =
              rect.top >= topPadding && rect.bottom <= viewportHeight - bottomPadding;
            if (inComfortZone) {
              const focusable = node.querySelector<HTMLElement>("input,button,select,textarea");
              focusable?.focus({ preventScroll: true });
              return;
            }
            const targetTop = window.scrollY + rect.top - topPadding;
            window.scrollTo({
              top: Math.max(0, targetTop),
              behavior: "smooth",
            });
          }

          const focusable = node.querySelector<HTMLElement>("input,button,select,textarea");
          focusable?.focus({ preventScroll: true });
        });
      };
      run(0);
    },
    []
  );

  const moveToSection = useCallback(
    (nextIndex: number) => {
      if (isSectionTransitioning) return;
      if (surveySections.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, surveySections.length - 1));
      const target = surveySections[clamped];
      if (!target) return;
      const saved = focusedQuestionBySection[target.key];
      const firstUnanswered = target.questions.findIndex(
        (q) => !isSurveyQuestionAnswered(q.question, answers[q.question.key])
      );
      const fallback = target.questions[firstUnanswered >= 0 ? firstUnanswered : 0]?.question.key ?? "";
      const nextKey = saved && target.questions.some((q) => q.question.key === saved) ? saved : fallback;
      setCurrentSectionIndex(clamped);
      if (nextKey) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [target.key]: nextKey }));
        scrollToQuestion(nextKey);
      }
      setErrorText(null);
      setErrorQuestionKey(null);
    },
    [answers, focusedQuestionBySection, isSectionTransitioning, scrollToQuestion, surveySections]
  );

  useEffect(() => {
    return () => {
      if (renewalHoldTimerRef.current != null) window.clearTimeout(renewalHoldTimerRef.current);
      if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
      if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
      if (saveDraftTimerRef.current != null) window.clearTimeout(saveDraftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentSectionIndex((prev) => {
      if (surveySections.length === 0) return 0;
      return Math.max(0, Math.min(prev, surveySections.length - 1));
    });
  }, [surveySections.length]);

  useEffect(() => {
    if (!currentSection || currentSection.questions.length === 0) return;
    const existing = focusedQuestionBySection[currentSection.key];
    if (existing && currentSection.questions.some((q) => q.question.key === existing)) return;
    setFocusedQuestionBySection((prev) => ({
      ...prev,
      [currentSection.key]: currentSection.questions[0].question.key,
    }));
  }, [currentSection, focusedQuestionBySection]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedSurveyState> & { currentIndex?: number };
      const parsedUpdatedAtMs =
        typeof parsed.updatedAt === "string" ? new Date(parsed.updatedAt).getTime() : 0;
      restoredSnapshotUpdatedAtRef.current = Number.isFinite(parsedUpdatedAtMs)
        ? parsedUpdatedAtMs
        : 0;
      const loadedAnswers =
        parsed.answers && typeof parsed.answers === "object"
          ? normalizeSurveyAnswersByTemplate(template, parsed.answers as PublicSurveyAnswers)
          : {};
      const seededSections = Array.isArray(parsed.selectedSections)
        ? parsed.selectedSections.filter((value): value is string => typeof value === "string")
        : [];
      const nextSelectedSections =
        seededSections.length > 0
          ? resolveSelectedSectionsFromC27(template, {}, seededSections)
          : resolveSelectedSectionsFromC27(template, loadedAnswers, []);
      const prunedAnswers = pruneAnswersByVisibility(loadedAnswers, nextSelectedSections);
      const restoredList = buildVisibleQuestionList(prunedAnswers, nextSelectedSections);
      const restoredKeySet = new Set(restoredList.map((item) => item.question.key));
      const restoredSections = buildSurveySections(restoredList, nextSelectedSections, sectionTitleMap);

      setAnswers(prunedAnswers);
      setSelectedSectionsCommitted(nextSelectedSections);
      setSurveyPeriodKey(typeof parsed.periodKey === "string" ? parsed.periodKey : null);
      const requested =
        typeof parsed.currentSectionIndex === "number"
          ? parsed.currentSectionIndex
          : typeof parsed.currentIndex === "number"
            ? parsed.currentIndex
            : 0;
      const clamped =
        restoredSections.length > 0 ? Math.max(0, Math.min(requested, restoredSections.length - 1)) : 0;
      setCurrentSectionIndex(clamped);
      lastVisitedSectionIndexRef.current = clamped;

      if (parsed.focusedQuestionBySection && typeof parsed.focusedQuestionBySection === "object") {
        const map = parsed.focusedQuestionBySection as Record<string, string>;
        const sanitized: Record<string, string> = {};
        for (const section of restoredSections) {
          const key = map[section.key];
          if (!key) continue;
          if (!section.questions.some((q) => q.question.key === key)) continue;
          sanitized[section.key] = key;
        }
        setFocusedQuestionBySection(sanitized);
      }

      if (Array.isArray(parsed.confirmedQuestionKeys)) {
        setConfirmedQuestionKeys(
          parsed.confirmedQuestionKeys
            .filter((key): key is string => typeof key === "string")
            .filter((key) => restoredKeySet.has(key))
        );
      }
      if (Array.isArray(parsed.completedSectionKeys)) {
        const restoredSectionKeySet = new Set(restoredSections.map((section) => section.key));
        setCompletedSectionKeys(
          parsed.completedSectionKeys
            .filter((key): key is string => typeof key === "string")
            .filter((key) => restoredSectionKeySet.has(key))
        );
      }
      setHasCompletedSubmission(parsed.phase === "result");
      if (parsed.phase === "result") {
        const input = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: prunedAnswers,
          selectedSections: nextSelectedSections,
        });
        setResult(computeWellnessResult(input));
        setPhase("result");
      } else if (parsed.phase === "survey") {
        setPhase("survey");
      }
    } catch {
      setPhase("intro");
    } finally {
      setHydrated(true);
    }
  }, [buildVisibleQuestionList, pruneAnswersByVisibility, sectionTitleMap, template]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "intro" && Object.keys(answers).length === 0 && selectedSectionsCommitted.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const snapshot: PersistedSurveyState = {
      phase: phase === "calculating" ? "survey" : phase,
      currentSectionIndex,
      focusedQuestionBySection,
      confirmedQuestionKeys,
      completedSectionKeys,
      updatedAt: new Date().toISOString(),
      periodKey: surveyPeriodKey ?? undefined,
      answers,
      selectedSections: selectedSectionsCommitted,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    answers,
    completedSectionKeys,
    confirmedQuestionKeys,
    currentSectionIndex,
    focusedQuestionBySection,
    hydrated,
    phase,
    selectedSectionsCommitted,
    surveyPeriodKey,
  ]);

  function saveSurveyIdentity(input: IdentityInput) {
    saveStoredIdentity(toIdentityPayload(input));
  }

  function applyRemoteSurveySnapshot(input: {
    response: EmployeeSurveyResponsePayload;
    periodKey: string | null;
  }) {
    const normalizedAnswers = normalizeSurveyAnswersByTemplate(
      template,
      (input.response.answersJson ?? {}) as PublicSurveyAnswers
    );
    const derivedSelectedSections = resolveSelectedSectionsFromC27(
      template,
      normalizedAnswers,
      input.response.selectedSections ?? []
    );
    const prunedAnswers = pruneAnswersByVisibility(normalizedAnswers, derivedSelectedSections);
    const nextQuestionList = buildVisibleQuestionList(prunedAnswers, derivedSelectedSections);
    const nextSections = buildSurveySections(
      nextQuestionList,
      derivedSelectedSections,
      sectionTitleMap
    );
    let nextSectionIndex = 0;
    for (let idx = 0; idx < nextSections.length; idx += 1) {
      const hasUnanswered = nextSections[idx].questions.some(
        (item) => !isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key])
      );
      if (hasUnanswered) {
        nextSectionIndex = idx;
        break;
      }
      if (idx === nextSections.length - 1) nextSectionIndex = idx;
    }
    const targetSection = nextSections[nextSectionIndex] ?? null;
    const targetQuestionIndex = getFocusedIndex(targetSection, undefined, prunedAnswers);
    const targetQuestionKey =
      targetSection && targetQuestionIndex >= 0
        ? targetSection.questions[targetQuestionIndex].question.key
        : "";
    const answeredQuestionKeys = nextQuestionList
      .filter((item) => isSurveyQuestionAnswered(item.question, prunedAnswers[item.question.key]))
      .map((item) => item.question.key);
    const completedKeysFromSnapshot = input.response.submittedAt
      ? nextSections.map((section) => section.key)
      : nextSections.slice(0, nextSectionIndex).map((section) => section.key);

    setAnswers(prunedAnswers);
    setSelectedSectionsCommitted(derivedSelectedSections);
    setCurrentSectionIndex(nextSectionIndex);
    setFocusedQuestionBySection(
      targetSection && targetQuestionKey ? { [targetSection.key]: targetQuestionKey } : {}
    );
    setHasCompletedSubmission(Boolean(input.response.submittedAt));
    setConfirmedQuestionKeys(answeredQuestionKeys);
    setCompletedSectionKeys(completedKeysFromSnapshot);
    lastVisitedSectionIndexRef.current = nextSectionIndex;
    setSurveyPeriodKey(input.periodKey);
    if (input.response.submittedAt) {
      setResult(
        computeWellnessResult(
          buildWellnessAnalysisInputFromSurvey({
            template,
            answers: prunedAnswers,
            selectedSections: derivedSelectedSections,
          })
        )
      );
    }
    const updatedMs = new Date(input.response.updatedAt).getTime();
    restoredSnapshotUpdatedAtRef.current = Number.isFinite(updatedMs) ? updatedMs : Date.now();
  }

  async function persistSurveySnapshot(input: {
    answers: PublicSurveyAnswers;
    selectedSections: string[];
    finalize: boolean;
    periodKey?: string | null;
  }) {
    const rawQuestionList = buildPublicSurveyQuestionList(template, input.answers, input.selectedSections, {
      deriveSelectedSections: false,
    });
    const autoComputed = resolveAutoComputedSurveyState({
      answers: input.answers,
      questionList: rawQuestionList,
      maxSelectedSections,
    });
    const payload = {
      periodKey: input.periodKey ?? surveyPeriodKey ?? undefined,
      selectedSections: input.selectedSections,
      answers: autoComputed.answers,
      finalize: input.finalize,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastRemoteSavedSignatureRef.current) return;

    const saved = await requestSurveyJson<EmployeeSurveyPutResponse>(
      "/api/b2b/employee/survey",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    if (saved.response?.periodKey) {
      setSurveyPeriodKey(saved.response.periodKey);
    }
    lastRemoteSavedSignatureRef.current = signature;
  }

  useEffect(() => {
    if (!hydrated || authBootstrappedRef.current) return;
    authBootstrappedRef.current = true;
    let bootIdentity: IdentityInput | null = null;

    const stored = readStoredIdentityWithSource().identity;
    if (stored) {
      bootIdentity = {
        name: stored.name ?? "",
        birthDate: normalizeDigits(stored.birthDate ?? ""),
        phone: normalizeDigits(stored.phone ?? ""),
      };
      setIdentity(bootIdentity);
    }

    setAuthBusy("session");
    fetchEmployeeSession()
      .then(async (session) => {
        if (session.authenticated) {
          if (session.employee) {
            const sessionIdentity = {
              name: session.employee.name,
              birthDate: normalizeDigits(session.employee.birthDate),
              phone: normalizeDigits(session.employee.phoneNormalized),
            };
            setIdentity(sessionIdentity);
            saveSurveyIdentity(sessionIdentity);
          }
          setAuthVerified(true);
          setIdentityEditable(false);
          setAuthPendingSign(false);
          setAuthNoticeText(TEXT.noticeAuthBySession);
          setAuthErrorText(null);
          return;
        }

        const storedPayload = toIdentityPayload(bootIdentity ?? { name: "", birthDate: "", phone: "" });
        if (!isValidIdentityInput(storedPayload)) return;
        const loginResult = await upsertEmployeeSession(storedPayload).catch(() => null);
        if (!loginResult?.found) return;
        saveSurveyIdentity(storedPayload);
        emitAuthSyncEvent({
          scope: "b2b-employee-session",
          reason: "survey-session-restored",
        });
        setAuthVerified(true);
        setIdentityEditable(false);
        setAuthPendingSign(false);
        setAuthNoticeText(TEXT.noticeAuthByStoredIdentity);
        setAuthErrorText(null);
      })
      .catch(() => null)
      .finally(() => {
        setAuthBusy("idle");
      });
  }, [hydrated]);

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
              setAuthVerified(false);
              setIdentityEditable(true);
              setAuthPendingSign(false);
              setAuthErrorText(null);
              setAuthNoticeText(null);
              return;
            }

            if (session.employee) {
              const sessionIdentity = {
                name: session.employee.name,
                birthDate: normalizeDigits(session.employee.birthDate),
                phone: normalizeDigits(session.employee.phoneNormalized),
              };
              setIdentity(sessionIdentity);
              saveSurveyIdentity(sessionIdentity);
            }
            setAuthVerified(true);
            setIdentityEditable(false);
            setAuthPendingSign(false);
            setAuthErrorText(null);
          })
          .catch(() => null)
          .finally(() => {
            setAuthBusy("idle");
          });
      },
      { scopes: ["b2b-employee-session", "user-session"] }
    );
    return unsubscribe;
  }, [authBusy, hydrated, refreshLoginStatus]);

  useEffect(() => {
    if (!hydrated) return;
    if (phase === "survey" && !authVerified) setPhase("intro");
  }, [authVerified, hydrated, phase]);

  useEffect(() => {
    if (!hydrated || !authVerified || remoteSurveyBootstrappedRef.current) return;
    remoteSurveyBootstrappedRef.current = true;

    requestSurveyJson<EmployeeSurveyGetResponse>("/api/b2b/employee/survey")
      .then((remote) => {
        if (remote.periodKey) setSurveyPeriodKey(remote.periodKey);
        if (!remote.response) return;
        const remoteUpdatedMs = new Date(remote.response.updatedAt).getTime();
        const localUpdatedMs = restoredSnapshotUpdatedAtRef.current;
        const hasLocalSnapshot = localUpdatedMs > 0;
        const hasLocalAnswers = Object.keys(answers).length > 0;
        const shouldApplyRemote =
          (!hasLocalAnswers && !hasLocalSnapshot) ||
          (Number.isFinite(remoteUpdatedMs) && remoteUpdatedMs > localUpdatedMs);
        if (!shouldApplyRemote) return;
        applyRemoteSurveySnapshot({
          response: remote.response,
          periodKey: remote.response.periodKey ?? remote.periodKey ?? null,
        });
      })
      .catch(() => null)
      .finally(() => {
        setSurveySyncReady(true);
      });
  }, [answers, authVerified, hydrated]);

  useEffect(() => {
    if (!hydrated || !authVerified || !surveySyncReady) return;
    if (phase !== "survey" && phase !== "result") return;
    if (saveDraftTimerRef.current != null) window.clearTimeout(saveDraftTimerRef.current);
    saveDraftTimerRef.current = window.setTimeout(() => {
      void persistSurveySnapshot({
        answers,
        selectedSections: selectedSectionsCommitted,
        finalize: phase === "result",
        periodKey: surveyPeriodKey,
      }).catch(() => null);
    }, 700);
    return () => {
      if (saveDraftTimerRef.current != null) {
        window.clearTimeout(saveDraftTimerRef.current);
        saveDraftTimerRef.current = null;
      }
    };
  }, [
    answers,
    authVerified,
    hydrated,
    phase,
    selectedSectionsCommitted,
    surveyPeriodKey,
    surveySyncReady,
  ]);

  function applyAnswer(question: WellnessSurveyQuestionForTemplate, rawValue: unknown) {
    setAnswers((prev) => {
      const sanitized = sanitizeSurveyAnswerValue(question, rawValue, maxSelectedSections);
      return pruneAnswersByVisibility({ ...prev, [question.key]: sanitized }, selectedSectionsCommitted);
    });
    if (errorQuestionKey === question.key) {
      setErrorQuestionKey(null);
      setErrorText(null);
    }
    if (phase === "result") {
      setPhase("survey");
      setResult(null);
      setHasCompletedSubmission(false);
    }
  }

  function addConfirmedQuestion(questionKey: string, visibleKeys: Set<string>) {
    setConfirmedQuestionKeys((prev) => {
      const next = new Set(prev);
      next.add(questionKey);
      return [...next].filter((key) => visibleKeys.has(key));
    });
  }

  async function ensureEmployeeSessionFromIdentity(nextIdentity: IdentityInput) {
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
      syncResult.sync?.source === "fresh" ? TEXT.noticeAuthComplete : TEXT.noticeAuthBySession
    );
  }

  async function handleStartKakaoAuth() {
    if (!validIdentity) {
      setAuthErrorText(TEXT.errorInvalidIdentity);
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
        setAuthNoticeText(TEXT.noticeAuthByStoredIdentity);
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
      setAuthNoticeText(TEXT.noticeAuthRequested);
    } catch (error) {
      setAuthErrorText(error instanceof Error ? error.message : "auth_request_failed");
    } finally {
      setAuthBusy("idle");
    }
  }

  async function handleSwitchIdentity() {
    if (authBusy !== "idle") return;
    setAuthBusy("session");
    try {
      await deleteEmployeeSession().catch(() => null);
      setIdentity({ name: "", birthDate: "", phone: "" });
      setAuthVerified(false);
      setIdentityEditable(true);
      setAuthPendingSign(false);
      setAuthErrorText(null);
      setAuthNoticeText(TEXT.noticeSwitchedIdentity);
      setAnswers({});
      setSelectedSectionsCommitted([]);
      setCurrentSectionIndex(0);
      setFocusedQuestionBySection({});
      setConfirmedQuestionKeys([]);
      setCompletedSectionKeys([]);
      setErrorText(null);
      setErrorQuestionKey(null);
      setResult(null);
      setHasCompletedSubmission(false);
      setSurveyPeriodKey(null);
      setSurveySyncReady(false);
      setPhase("intro");
      remoteSurveyBootstrappedRef.current = false;
      restoredSnapshotUpdatedAtRef.current = 0;
      lastRemoteSavedSignatureRef.current = "";
      lastVisitedSectionIndexRef.current = 0;
      window.localStorage.removeItem(STORAGE_KEY);
      clearStoredIdentity();
      emitAuthSyncEvent({
        scope: "b2b-employee-session",
        reason: "survey-session-cleared",
      });
    } finally {
      setAuthBusy("idle");
    }
  }

  async function handleConfirmKakaoAuth() {
    if (!validIdentity) {
      setAuthErrorText(TEXT.errorInvalidIdentity);
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
        setAuthNoticeText(TEXT.noticeNeedResend);
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
        setAuthNoticeText(TEXT.noticeNeedResend);
      } else {
        setAuthErrorText(error instanceof Error ? error.message : "auth_confirm_failed");
      }
    } finally {
      setAuthBusy("idle");
    }
  }

  function startCalculation(finalAnswers: PublicSurveyAnswers, finalSections: string[]) {
    const resolvedAnswers = resolveAutoComputedSurveyState({
      answers: finalAnswers,
      questionList: buildPublicSurveyQuestionList(template, finalAnswers, finalSections, {
        deriveSelectedSections: false,
      }),
      maxSelectedSections,
    }).answers;
    if (resolvedAnswers !== finalAnswers) {
      setAnswers(resolvedAnswers);
    }
    setCompletedSectionKeys((prev) => {
      const next = new Set(prev);
      for (const section of surveySections) {
        next.add(section.key);
      }
      return [...next];
    });
    setPhase("calculating");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
    setResult(null);
    setErrorText(null);
    setErrorQuestionKey(null);
    setCalcPercent(8);
    setCalcMessageIndex(0);
    if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
    if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);

    calcTickerRef.current = window.setInterval(() => {
      setCalcPercent((prev) => (prev >= 92 ? prev : prev + (prev < 70 ? 8 : 4)));
      setCalcMessageIndex((prev) => (prev + 1) % CALCULATING_MESSAGES.length);
    }, 420);

    calcTimeoutRef.current = window.setTimeout(() => {
      try {
        const input = buildWellnessAnalysisInputFromSurvey({
          template,
          answers: resolvedAnswers,
          selectedSections: finalSections,
        });
        setResult(computeWellnessResult(input));
        setCalcPercent(100);
        setHasCompletedSubmission(true);
        setPhase("result");
      } catch {
        setPhase("survey");
        setErrorText("analysis_failed");
      } finally {
        if (calcTickerRef.current != null) window.clearInterval(calcTickerRef.current);
        if (calcTimeoutRef.current != null) window.clearTimeout(calcTimeoutRef.current);
      }
    }, 1700);
  }

  function handleAdvance(params?: { fromQuestionKey?: string; answerOverride?: unknown }) {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;
    const fromQuestionKey = params?.fromQuestionKey;
    const isAutoAdvanceFromAnswer = typeof fromQuestionKey === "string";
    const at =
      fromQuestionKey != null
        ? currentSection.questions.findIndex((item) => item.question.key === fromQuestionKey)
        : getFocusedIndex(currentSection, focusedQuestionBySection[currentSection.key], answers);
    if (at < 0) return;
    const currentNode = currentSection.questions[at];

    let effectiveAnswers = answers;
    if (
      params &&
      params.fromQuestionKey === currentNode.question.key &&
      typeof params.answerOverride !== "undefined"
    ) {
      const sanitized = sanitizeSurveyAnswerValue(
        currentNode.question,
        params.answerOverride,
        maxSelectedSections
      );
      effectiveAnswers = pruneAnswersByVisibility(
        { ...answers, [currentNode.question.key]: sanitized },
        selectedSectionsCommitted
      );
    }

    const currentError = validateSurveyQuestionAnswer(
      currentNode.question,
      effectiveAnswers[currentNode.question.key],
      {
        treatSelectionAsOptional: isOptionalSelectionQuestion(currentNode.question),
      }
    );
    const numericWarning = resolveQuestionNumericWarning(
      currentNode.question,
      effectiveAnswers[currentNode.question.key]
    );
    if (numericWarning) {
      setErrorQuestionKey(currentNode.question.key);
      setErrorText(numericWarning);
      scrollToQuestion(currentNode.question.key);
      return;
    }
    if (currentError) {
      setErrorQuestionKey(currentNode.question.key);
      setErrorText(currentError);
      scrollToQuestion(currentNode.question.key);
      return;
    }

    let nextAnswers = effectiveAnswers;
    let nextSelectedSections = selectedSectionsCommitted;
    if (currentNode.question.key === c27Key) {
      nextSelectedSections = resolveSelectedSectionsFromC27(template, nextAnswers, []);
      nextAnswers = pruneAnswersByVisibility(nextAnswers, nextSelectedSections);
      setSelectedSectionsCommitted(nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const effectiveQuestionList = buildVisibleQuestionList(nextAnswers, nextSelectedSections);
    const effectiveVisibleKeySet = new Set(effectiveQuestionList.map((item) => item.question.key));
    addConfirmedQuestion(currentNode.question.key, effectiveVisibleKeySet);

    const effectiveSections = buildSurveySections(effectiveQuestionList, nextSelectedSections, sectionTitleMap);
    const sectionAt = Math.max(
      0,
      effectiveSections.findIndex((item) => item.key === currentSection.key)
    );
    const section = effectiveSections[sectionAt];
    if (!section) return;
    const questionAt = Math.max(
      0,
      section.questions.findIndex((item) => item.question.key === currentNode.question.key)
    );

    const shouldBlockAutoAdvanceFromMulti =
      isAutoAdvanceFromAnswer && currentNode.question.type === "multi";
    if (shouldBlockAutoAdvanceFromMulti) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      return;
    }

    if (questionAt < section.questions.length - 1) {
      const nextQuestion = section.questions[questionAt + 1].question;
      const nextKey = nextQuestion.key;
      const nextAlreadyAnswered = isSurveyQuestionAnswered(nextQuestion, nextAnswers[nextKey]);
      if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
        setErrorQuestionKey(null);
        setErrorText(null);
        setIsSectionTransitioning(false);
        return;
      }
      setCurrentSectionIndex(sectionAt);
      setFocusedQuestionBySection((prev) => ({ ...prev, [section.key]: nextKey }));
      setErrorQuestionKey(null);
      setErrorText(null);
      const shouldCenterNextQuestion =
        isAutoAdvanceFromAnswer &&
        currentNode.question.type !== "multi" &&
        !nextAlreadyAnswered;
      scrollToQuestion(nextKey, {
        align: shouldCenterNextQuestion ? "center" : "comfort",
      });
      setIsSectionTransitioning(false);
      return;
    }

    if (sectionAt < effectiveSections.length - 1) {
      const nextSection = effectiveSections[sectionAt + 1];
      const nextKey = nextSection.questions[0]?.question.key ?? "";
      const nextQuestion = nextSection.questions[0]?.question;
      const nextAlreadyAnswered =
        nextQuestion != null ? isSurveyQuestionAnswered(nextQuestion, nextAnswers[nextKey]) : false;
      if (isAutoAdvanceFromAnswer && nextAlreadyAnswered) {
        setErrorQuestionKey(null);
        setErrorText(null);
        setIsSectionTransitioning(false);
        return;
      }
      const shouldShowSectionTransition = currentNode.question.key === c27Key;
      if (shouldShowSectionTransition) {
        setIsSectionTransitioning(true);
      } else {
        setIsSectionTransitioning(false);
      }
      setCurrentSectionIndex(sectionAt + 1);
      if (nextKey) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
        const shouldCenterNextSectionFirstQuestion =
          isAutoAdvanceFromAnswer &&
          currentNode.question.type !== "multi" &&
          !nextAlreadyAnswered;
        if (shouldShowSectionTransition) {
          window.setTimeout(() => {
            scrollToQuestion(nextKey, {
              align: shouldCenterNextSectionFirstQuestion ? "center" : "comfort",
            });
            setIsSectionTransitioning(false);
          }, 140);
        } else {
          scrollToQuestion(nextKey, {
            align: shouldCenterNextSectionFirstQuestion ? "center" : "comfort",
          });
        }
      } else {
        setIsSectionTransitioning(false);
      }
      setErrorQuestionKey(null);
      setErrorText(null);
      return;
    }

    if (isAutoAdvanceFromAnswer) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      return;
    }

    setIsSectionTransitioning(false);
    startCalculation(nextAnswers, nextSelectedSections);
  }

  function requestReset() {
    setIsResetConfirmModalOpen(true);
  }

  function handleReset() {
    setAnswers({});
    setSelectedSectionsCommitted([]);
    setCurrentSectionIndex(0);
    setFocusedQuestionBySection({});
    setConfirmedQuestionKeys([]);
    setCompletedSectionKeys([]);
    setErrorText(null);
    setErrorQuestionKey(null);
    setIsResetConfirmModalOpen(false);
    setResult(null);
    setHasCompletedSubmission(false);
    setIsSectionTransitioning(false);
    setPhase("intro");
    window.localStorage.removeItem(STORAGE_KEY);
    restoredSnapshotUpdatedAtRef.current = Date.now();
    lastRemoteSavedSignatureRef.current = "";
    lastVisitedSectionIndexRef.current = 0;
    if (authVerified) {
      void persistSurveySnapshot({
        answers: {},
        selectedSections: [],
        finalize: false,
        periodKey: surveyPeriodKey,
      }).catch(() => null);
    }
  }

  function handleRenewalHoldStart() {
    handleRenewalHoldEnd();
    renewalBypassTriggeredRef.current = false;
    renewalHoldTimerRef.current = window.setTimeout(() => {
      renewalBypassTriggeredRef.current = true;
      setIsRenewalModalOpen(false);
      setPhase("survey");
    }, 2000);
  }

  function handleRenewalHoldEnd() {
    if (renewalHoldTimerRef.current != null) {
      window.clearTimeout(renewalHoldTimerRef.current);
      renewalHoldTimerRef.current = null;
    }
  }

  function renderResetConfirmModal() {
    if (!isResetConfirmModalOpen) return null;
    return (
      <div
        data-testid="survey-reset-confirm-modal"
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-[2px]"
      >
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6">
          <h3 className="text-xl font-extrabold text-slate-900">{TEXT.resetAsk}</h3>
          <p className="mt-2 text-sm text-slate-600">{TEXT.resetDesc}</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResetConfirmModalOpen(false)}
              data-testid="survey-reset-cancel-button"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              {TEXT.cancel}
            </button>
            <button
              type="button"
              onClick={handleReset}
              data-testid="survey-reset-confirm-button"
              className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99]"
            >
              {TEXT.reset}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderQuestionInput(question: WellnessSurveyQuestionForTemplate) {
    if (question.type === "single") {
      const value = toInputValue(answers[question.key]).trim();
      const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
      const optionLayout = resolveOptionLayout(options);
      return (
        <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
          {options.map((option) => {
            const active = value === option.value;
            return (
              <button
                key={`${question.key}-${option.value}`}
                data-testid="survey-option"
                type="button"
                onClick={() => {
                  const nextValue = active ? "" : option.value;
                  applyAnswer(question, nextValue);
                  if (!nextValue) return;
                  handleAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
                }}
                className={`rounded-xl border transition ${
                  optionLayout.compact
                    ? "h-[40px] px-2 py-1.5 text-center text-[12px] font-semibold leading-tight break-keep sm:h-[44px] sm:px-3 sm:py-2 sm:text-[13px]"
                    : "h-[44px] px-3 py-1.5 text-left text-[12px] font-medium leading-tight break-keep sm:h-[48px] sm:px-4 sm:py-2 sm:text-[13px]"
                } ${
                  active
                    ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                <span className="block max-h-[2.2em] overflow-hidden leading-tight">{option.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === "multi") {
      const options = (question.options ?? []).filter((option) => !isNoneLikeOption(option));
      const selected = new Set(toMultiValues(answers[question.key]));
      const otherTextByValue = toMultiOtherTextByValue(answers[question.key]);
      const customOptions = options.filter((option) => option.allowsCustomInput && selected.has(option.value));
      const optionLayout = resolveOptionLayout(options);
      return (
        <div className="space-y-3">
          <div className={`grid gap-2 ${optionLayout.gridClass} sm:gap-2.5`}>
            {options.map((option) => {
              const active = selected.has(option.value);
              return (
                <button
                  key={`${question.key}-${option.value}`}
                  data-testid="survey-multi-option"
                  type="button"
                  onClick={() =>
                    applyAnswer(
                      question,
                      toggleSurveyMultiValue(question, answers[question.key], option.value, maxSelectedSections)
                    )
                  }
                  className={`rounded-xl border transition ${
                    optionLayout.compact
                      ? "h-[40px] px-2 py-1.5 text-center text-[12px] font-semibold leading-tight break-keep sm:h-[44px] sm:px-3 sm:py-2 sm:text-[13px]"
                      : "h-[44px] px-3 py-1.5 text-left text-[12px] font-medium leading-tight break-keep sm:h-[48px] sm:px-4 sm:py-2 sm:text-[13px]"
                  } ${
                    active
                      ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                  }`}
                >
                  <span className="block max-h-[2.2em] overflow-hidden leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
          {customOptions.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {customOptions.map((option) => (
                <input
                  key={`${question.key}-${option.value}-other`}
                  data-testid="survey-multi-other-input"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  value={otherTextByValue[option.value] ?? ""}
                  onChange={(event) =>
                    applyAnswer(
                      question,
                      updateSurveyMultiOtherText(
                        question,
                        answers[question.key],
                        option.value,
                        event.target.value,
                        maxSelectedSections
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    handleAdvance();
                  }}
                  placeholder={`${option.label}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (question.type === "group") {
      const fields = question.fields ?? [];
      const fieldValues = resolveGroupFieldValues(question, answers[question.key]);
      return (
        <div className={`grid gap-3 ${fields.length >= 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {fields.map((field, index) => {
            const isNumericField = field.type === "number";
            const inputId = `${question.key}-${field.id}`;
            const value = fieldValues[field.id] ?? "";
            const numericRule = isNumericField ? resolveNumberRangeForGroupField(field) : null;
            const numericWarning = numericRule ? buildOutOfRangeWarning(numericRule, value) : null;
            return (
              <label key={inputId} className="space-y-1.5 text-sm text-slate-700">
                <span className="font-semibold">
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                </span>
                <input
                  id={inputId}
                  type="text"
                  data-testid={`survey-group-input-${field.id}`}
                  value={value}
                  inputMode={isNumericField ? "decimal" : "text"}
                  pattern={isNumericField ? "[0-9]*" : undefined}
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    const nextValue = isNumericField
                      ? rawValue.replace(/[^0-9.]/g, "")
                      : rawValue;
                    applyAnswer(question, {
                      fieldValues: {
                        ...fieldValues,
                        [field.id]: nextValue,
                      },
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const nextField = fields[index + 1];
                    if (nextField) {
                      const nextNode = document.getElementById(
                        `${question.key}-${nextField.id}`
                      ) as HTMLInputElement | null;
                      nextNode?.focus();
                      return;
                    }
                    handleAdvance();
                  }}
                  placeholder={field.unit ? `${field.unit}` : undefined}
                />
                {numericWarning ? (
                  <p className="text-xs font-medium text-amber-700">{numericWarning}</p>
                ) : null}
              </label>
            );
          })}
        </div>
      );
    }

    const inputValue = toInputValue(answers[question.key]);
    const isNumberQuestion = question.type === "number";
    const numberRule = isNumberQuestion ? resolveNumberRangeForQuestion(question) : null;
    const numericWarning = numberRule ? buildOutOfRangeWarning(numberRule, inputValue) : null;
    return (
      <div className="space-y-1.5">
        <input
          type="text"
          data-testid={isNumberQuestion ? "survey-number-input" : "survey-text-input"}
          value={inputValue}
          inputMode={isNumberQuestion ? "decimal" : "text"}
          pattern={isNumberQuestion ? "[0-9]*" : undefined}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 sm:text-base"
          placeholder={
            question.placeholder ??
            (isNumberQuestion
              ? "\uC22B\uC790\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694"
              : "\uB2F5\uBCC0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694")
          }
          onChange={(event) => {
            const rawValue = event.target.value;
            const nextValue = isNumberQuestion ? rawValue.replace(/[^0-9.]/g, "") : rawValue;
            applyAnswer(question, nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const nextValue = isNumberQuestion
              ? event.currentTarget.value.replace(/[^0-9.]/g, "")
              : event.currentTarget.value;
            handleAdvance({ fromQuestionKey: question.key, answerOverride: nextValue });
          }}
        />
        {numericWarning ? <p className="text-xs font-medium text-amber-700">{numericWarning}</p> : null}
      </div>
    );
  }

  function handleMovePreviousSection() {
    if (isSectionTransitioning) return;
    if (currentSectionIndex <= 0) return;
    moveToSection(currentSectionIndex - 1);
  }

  function handleMoveNextSection() {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;

    for (const node of currentSection.questions) {
      const question = node.question;
      const answerValue = answers[question.key];
      const numericWarning = resolveQuestionNumericWarning(question, answerValue);
      if (numericWarning) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: question.key }));
        setErrorQuestionKey(question.key);
        setErrorText(numericWarning);
        scrollToQuestion(question.key);
        return;
      }
      const validationError = validateSurveyQuestionAnswer(question, answerValue, {
        treatSelectionAsOptional: isOptionalSelectionQuestion(question),
      });
      if (validationError) {
        setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: question.key }));
        setErrorQuestionKey(question.key);
        setErrorText(validationError);
        scrollToQuestion(question.key);
        return;
      }
    }

    let nextAnswers = answers;
    const nextSelectedSections = resolveSelectedSectionsFromC27(template, nextAnswers, []);
    const hasSelectionChanged =
      JSON.stringify(nextSelectedSections) !== JSON.stringify(selectedSectionsCommitted);
    if (hasSelectionChanged) {
      nextAnswers = pruneAnswersByVisibility(nextAnswers, nextSelectedSections);
      setSelectedSectionsCommitted(nextSelectedSections);
      setAnswers(nextAnswers);
    }

    const effectiveQuestionList = buildVisibleQuestionList(nextAnswers, nextSelectedSections);
    const effectiveSections = buildSurveySections(
      effectiveQuestionList,
      nextSelectedSections,
      sectionTitleMap
    );
    const sectionAt = effectiveSections.findIndex((section) => section.key === currentSection.key);
    if (sectionAt < 0) return;

    if (sectionAt >= effectiveSections.length - 1) {
      setErrorQuestionKey(null);
      setErrorText(null);
      setIsSectionTransitioning(false);
      startCalculation(nextAnswers, nextSelectedSections);
      return;
    }

    const nextSection = effectiveSections[sectionAt + 1];
    const nextKey = nextSection.questions[0]?.question.key ?? "";
    const shouldShowSectionTransition = currentSection.questions.some(
      (item) => item.question.key === c27Key
    );
    setErrorQuestionKey(null);
    setErrorText(null);
    if (shouldShowSectionTransition) {
      setIsSectionTransitioning(true);
    } else {
      setIsSectionTransitioning(false);
    }
    setCurrentSectionIndex(sectionAt + 1);
    if (nextKey) {
      setFocusedQuestionBySection((prev) => ({ ...prev, [nextSection.key]: nextKey }));
      if (shouldShowSectionTransition) {
        window.setTimeout(() => {
          scrollToQuestion(nextKey);
          setIsSectionTransitioning(false);
        }, 140);
      } else {
        scrollToQuestion(nextKey);
      }
    } else {
      setIsSectionTransitioning(false);
    }
  }

  function handleStartSurvey() {
    if (!authVerified) {
      setAuthErrorText(TEXT.needAuthNotice);
      return;
    }
    setAuthErrorText(null);
    if (BLOCK_SURVEY_START_TEMPORARILY) {
      setIsRenewalModalOpen(true);
      return;
    }
    if (hasCompletedSubmission) {
      setAnswers({});
      setSelectedSectionsCommitted([]);
      setCurrentSectionIndex(0);
      setFocusedQuestionBySection({});
      setConfirmedQuestionKeys([]);
      setCompletedSectionKeys([]);
      setErrorText(null);
      setErrorQuestionKey(null);
      setResult(null);
      setHasCompletedSubmission(false);
      setIsSectionTransitioning(false);
      restoredSnapshotUpdatedAtRef.current = Date.now();
      lastRemoteSavedSignatureRef.current = "";
      lastVisitedSectionIndexRef.current = 0;
      window.localStorage.removeItem(STORAGE_KEY);
      if (authVerified) {
        void persistSurveySnapshot({
          answers: {},
          selectedSections: [],
          finalize: false,
          periodKey: surveyPeriodKey,
        }).catch(() => null);
      }
    }
    setPhase("survey");
  }

  function renderRenewalModal() {
    if (!isRenewalModalOpen) return null;
    return (
      <div
        data-testid="survey-renewal-modal"
        className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-[2px]"
      >
        <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6">
          <h3 className="text-xl font-extrabold text-slate-900">{TEXT.renewalTitle}</h3>
          <p className="mt-2 text-sm text-slate-600">{TEXT.renewalDesc1}</p>
          <p className="mt-1 text-sm text-slate-600">{TEXT.renewalDesc2}</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRenewalModalOpen(false);
                handleRenewalHoldEnd();
              }}
              data-testid="survey-renewal-close-button"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              {TEXT.close}
            </button>
            <button
              type="button"
              onMouseDown={handleRenewalHoldStart}
              onMouseUp={handleRenewalHoldEnd}
              onMouseLeave={handleRenewalHoldEnd}
              onTouchStart={handleRenewalHoldStart}
              onTouchEnd={handleRenewalHoldEnd}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") handleRenewalHoldStart();
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter" || event.key === " ") handleRenewalHoldEnd();
              }}
              data-testid="survey-renewal-confirm-button"
              className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99]"
            >
              {TEXT.confirm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resultSummary = useMemo(() => {
    if (phase !== "result" || !isAdminLoggedIn) return null;
    if (result) return result;
    try {
      const input = buildWellnessAnalysisInputFromSurvey({
        template,
        answers,
        selectedSections: selectedSectionsCommitted,
      });
      return computeWellnessResult(input);
    } catch {
      return null;
    }
  }, [answers, isAdminLoggedIn, phase, result, selectedSectionsCommitted, template]);

  if (!hydrated) return null;

  const hasPrevStep = currentSectionIndex > 0;
  const isCommonSurveySection = currentSection?.key === "common";
  const liveSelectedSections = resolveSelectedSectionsFromC27(
    template,
    answers,
    selectedSectionsCommitted
  );
  const hasLiveDetailedSectionSelection = liveSelectedSections.length > 0;
  const prevButtonLabel = TEXT.prevSection;
  const atLastSection = currentSectionIndex >= surveySections.length - 1;
  const shouldShowNextSectionLabelAtCommon =
    isCommonSurveySection && atLastSection && hasLiveDetailedSectionSelection;
  const nextButtonLabel =
    atLastSection && !shouldShowNextSectionLabelAtCommon
      ? TEXT.resultCheck
      : TEXT.nextSection;
  const progressMessage = resolveProgressMessage(progressPercent);
  const resolveQuestionHelpText = (question: WellnessSurveyQuestionForTemplate) => {
    const rawHelpText = question.helpText?.trim() ?? "";
    if (!rawHelpText) return "";
    return isOptionalHintLikeText(rawHelpText) ? "" : rawHelpText;
  };

  return (
    <div
      className="relative isolate w-full overflow-hidden bg-[radial-gradient(130%_90%_at_0%_0%,#c9f6ff_0%,#dce9ff_42%,#eef2ff_100%)] py-5 sm:py-8"
      style={{
        minHeight:
          "max(calc(105vh - var(--wb-topbar-height, 3.5rem)), calc(105dvh - var(--wb-topbar-height, 3.5rem)))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-300/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl"
      />
      <div className="relative z-10 mx-auto w-full max-w-full px-4 overflow-visible sm:max-w-[640px] lg:max-w-[760px]">
        {phase === "intro" ? (
          <SurveyIntroPanel
            text={{
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
            }}
            identity={identity}
            identityEditable={identityEditable}
            identityLocked={identityLocked}
            authBusy={authBusy}
            authPendingSign={authPendingSign}
            authVerified={authVerified}
            authInitializing={authInitializing}
            authNoticeText={authNoticeText}
            authErrorText={authErrorText}
            hasCompletedSubmission={hasCompletedSubmission}
            startDisabled={!authVerified || authBusy !== "idle" || authInitializing}
            onNameChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                name: value,
              }))
            }
            onBirthDateChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                birthDate: normalizeDigits(value).slice(0, 8),
              }))
            }
            onPhoneChange={(value) =>
              setIdentity((prev) => ({
                ...prev,
                phone: normalizeDigits(value).slice(0, 11),
              }))
            }
            onStartKakaoAuth={() => void handleStartKakaoAuth()}
            onConfirmKakaoAuth={() => void handleConfirmKakaoAuth()}
            onSwitchIdentity={() => void handleSwitchIdentity()}
            onStartSurvey={handleStartSurvey}
          />
        ) : null}

        {phase === "survey" ? (
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
            progressMessage={progressMessage}
            isSectionTransitioning={isSectionTransitioning}
            isCommonSurveySection={isCommonSurveySection}
            hasPrevStep={hasPrevStep}
            prevButtonLabel={prevButtonLabel}
            nextButtonLabel={nextButtonLabel}
            focusedQuestionKey={focusedQuestionKey}
            errorQuestionKey={errorQuestionKey}
            errorText={errorText}
            onReset={requestReset}
            onMoveToSection={moveToSection}
            onMovePreviousSection={handleMovePreviousSection}
            onMoveNextSection={handleMoveNextSection}
            onQuestionRef={(questionKey, nodeRef) => {
              questionRefs.current[questionKey] = nodeRef;
            }}
            renderQuestionInput={renderQuestionInput}
            resolveQuestionText={toDisplayQuestionText}
            resolveQuestionHelpText={resolveQuestionHelpText}
            isQuestionRequired={isQuestionEffectivelyRequired}
            shouldShowQuestionOptionalHint={isOptionalSelectionQuestion}
          />
        ) : null}

        {phase === "calculating" ? (
          <SurveyCalculatingPanel
            title={TEXT.resultTitle}
            message={CALCULATING_MESSAGES[calcMessageIndex]}
            percent={calcPercent}
          />
        ) : null}

        {phase === "result" && isAdminLoggedIn ? (
          <SurveyResultPanel
            resultSummary={resultSummary}
            sectionTitleMap={sectionTitleMap}
            text={{
              resultTitle: TEXT.resultTitle,
              scoreHealth: TEXT.scoreHealth,
              scoreRisk: TEXT.scoreRisk,
              editSurvey: TEXT.editSurvey,
              restart: TEXT.restart,
              viewEmployeeReport: TEXT.viewEmployeeReport,
            }}
            onEditSurvey={() => {
              setPhase("survey");
              setResult(resultSummary);
              setHasCompletedSubmission(false);
            }}
            onRestart={requestReset}
            onOpenEmployeeReport={handleOpenEmployeeReport}
          />
        ) : null}

        {phase === "result" && !isAdminLoggedIn ? (
          <SurveySubmittedPanel
            text={{
              submittedTitle: TEXT.submittedTitle,
              submittedDesc: TEXT.submittedDesc,
              editSurvey: TEXT.editSurvey,
              restart: TEXT.restart,
            }}
            onEditSurvey={() => {
              setPhase("survey");
              setResult(null);
              setHasCompletedSubmission(false);
            }}
            onRestart={requestReset}
          />
        ) : null}
      </div>

      {renderRenewalModal()}
      {renderResetConfirmModal()}
    </div>
  );
}
