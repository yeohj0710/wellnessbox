"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const STORAGE_KEY = "b2b-public-survey-state.v4";
const SURVEY_IDENTITY_STORAGE_KEY = "wb:b2b:survey:identity:v1";
const BLOCK_SURVEY_START_TEMPORARILY = true;

const TEXT = {
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
    "\uD604\uC7AC \uC778\uC99D\uB41C \uC815\uBCF4\uC785\uB2C8\uB2E4. \uB2E4\uB978 \uC0AC\uB78C\uC73C\uB85C \uC9C4\uD589\uD558\uB824\uBA74 \uC544\uB798 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC815\uBCF4\uB97C \uBCC0\uACBD\uD574 \uC8FC\uC138\uC694.",
  switchIdentity: "\uB2E4\uB978 \uC0AC\uB78C\uC73C\uB85C \uC124\uBB38 \uC9C4\uD589",
  startSurvey: "\uC124\uBB38 \uC2DC\uC791\uD558\uAE30",
  needAuthNotice:
    "\uBCF8\uC778\uC778\uC99D \uC644\uB8CC \uD6C4 \uC124\uBB38\uC744 \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
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
  progressTitle: "B2B \uC124\uBB38 \uC9C4\uD589",
  progressBarLabel: "\uC9C4\uD589\uB960",
  restart: "\uCC98\uC74C\uBD80\uD130 \uB2E4\uC2DC \uC2DC\uC791",
  commonSection: "\uACF5\uD1B5 \uBB38\uD56D",
  commonBadge: "\uACF5\uD1B5 \uC124\uBB38",
  requiredBadge: "\uD544\uC218",
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
  editSurvey: "\uC124\uBB38 \uC218\uC815",
  resultTitle: "\uC124\uBB38 \uACB0\uACFC",
  scoreHealth: "\uAC74\uAC15\uC810\uC218",
  scoreRisk: "\uC0DD\uD65C\uC2B5\uAD00 \uC704\uD5D8\uB3C4",
  scoreNeed: "\uAC74\uAC15\uAD00\uB9AC \uD544\uC694\uB3C4 \uD3C9\uADE0",
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
    .replace(/\s*\uB9CC\s*\(\s*\)\s*\uC138/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\uD574\uC8FC\uC2ED\uC2DC\uC624/g, "\uD574 \uC8FC\uC138\uC694")
    .replace(/\uAE30\uC7AC\uD574/g, "\uC785\uB825\uD574")
    .replace(/\s+/g, " ")
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

function toPositiveNumber(raw: string | undefined): number | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function resolveBmiFromAnswers(answers: PublicSurveyAnswers): number | null {
  const fields = resolveGroupFieldValues(answers[BMI_SOURCE_GROUP_KEY]);
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
  const bmi = resolveBmiFromAnswers(inputAnswers);
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
  const [hydrated, setHydrated] = useState(false);
  const [calcPercent, setCalcPercent] = useState(8);
  const [calcMessageIndex, setCalcMessageIndex] = useState(0);

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
    (inputAnswers: PublicSurveyAnswers, selectedSections: string[]) =>
      buildPublicSurveyQuestionList(template, inputAnswers, selectedSections, {
        deriveSelectedSections: false,
      }).filter((item) => !isAutoDerivedBmiQuestion(item)),
    [template]
  );

  const questionListRaw = useMemo(
    () =>
      buildPublicSurveyQuestionList(template, answers, selectedSectionsCommitted, {
        deriveSelectedSections: false,
      }),
    [answers, selectedSectionsCommitted, template]
  );
  const questionList = useMemo(
    () => questionListRaw.filter((item) => !isAutoDerivedBmiQuestion(item)),
    [questionListRaw]
  );

  useEffect(() => {
    if (questionListRaw.length === 0) return;
    setAnswers((prev) => mergeAutoDerivedBmiAnswers(prev, questionListRaw));
  }, [questionListRaw]);

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
  const displayTotal = Math.max(questionList.length, 1);
  const displayStep = useMemo(() => {
    if (!focusedQuestionKey) return 0;
    const idx = questionList.findIndex((item) => item.question.key === focusedQuestionKey);
    return idx >= 0 ? idx + 1 : 0;
  }, [focusedQuestionKey, questionList]);
  const progressDoneCount = useMemo(() => {
    if (questionList.length === 0) return 0;
    let done = 0;
    for (const section of surveySections) {
      if (completedSectionKeySet.has(section.key)) {
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
  const progressPercent = useMemo(() => {
    if (questionList.length === 0) return 0;
    return Math.round((progressDoneCount / questionList.length) * 100);
  }, [progressDoneCount, questionList.length]);
  const identityPayload = useMemo(() => toIdentityPayload(identity), [identity]);
  const validIdentity = useMemo(() => isValidIdentityInput(identityPayload), [identityPayload]);
  const identityLocked = authVerified && !identityEditable;
  const authInitializing = !hydrated || authBusy === "session";

  useEffect(() => {
    setCompletedSectionKeys((prev) => prev.filter((key) => visibleSectionKeySet.has(key)));
  }, [visibleSectionKeySet]);

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

  const scrollToQuestion = useCallback((questionKey: string) => {
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
        const inComfortZone =
          rect.top >= topPadding && rect.bottom <= viewportHeight - bottomPadding;

        if (!inComfortZone) {
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
  }, []);

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
    window.localStorage.setItem(
      SURVEY_IDENTITY_STORAGE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), identity: input })
    );
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
    const payload = {
      periodKey: input.periodKey ?? surveyPeriodKey ?? undefined,
      selectedSections: input.selectedSections,
      answers: mergeAutoDerivedBmiAnswers(
        input.answers,
        buildPublicSurveyQuestionList(template, input.answers, input.selectedSections, {
          deriveSelectedSections: false,
        })
      ),
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

    try {
      const raw = window.localStorage.getItem(SURVEY_IDENTITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { identity?: IdentityInput };
        if (parsed.identity) {
          bootIdentity = {
            name: parsed.identity.name ?? "",
            birthDate: normalizeDigits(parsed.identity.birthDate ?? ""),
            phone: normalizeDigits(parsed.identity.phone ?? ""),
          };
          setIdentity(bootIdentity);
        }
      }
    } catch {
      window.localStorage.removeItem(SURVEY_IDENTITY_STORAGE_KEY);
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
        const hasLocalAnswers = Object.keys(answers).length > 0;
        const shouldApplyRemote =
          !hasLocalAnswers ||
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
      setSurveyPeriodKey(null);
      setSurveySyncReady(false);
      setPhase("intro");
      remoteSurveyBootstrappedRef.current = false;
      restoredSnapshotUpdatedAtRef.current = 0;
      lastRemoteSavedSignatureRef.current = "";
      lastVisitedSectionIndexRef.current = 0;
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SURVEY_IDENTITY_STORAGE_KEY);
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
    const resolvedAnswers = mergeAutoDerivedBmiAnswers(
      finalAnswers,
      buildPublicSurveyQuestionList(template, finalAnswers, finalSections, {
        deriveSelectedSections: false,
      })
    );
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
      { treatSelectionAsOptional: true }
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
      scrollToQuestion(nextKey);
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
      setErrorQuestionKey(null);
      setErrorText(null);
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
    setPhase("intro");
    window.localStorage.removeItem(STORAGE_KEY);
    restoredSnapshotUpdatedAtRef.current = Date.now();
    lastRemoteSavedSignatureRef.current = "";
    lastVisitedSectionIndexRef.current = 0;
    if (authVerified && surveySyncReady) {
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
                    ? "min-h-[40px] px-2 py-2 text-center text-[12px] font-semibold leading-snug break-keep sm:min-h-[46px] sm:px-3 sm:py-2.5 sm:text-[13px]"
                    : "min-h-[44px] px-3 py-2.5 text-left text-[13px] font-medium leading-tight break-keep sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-sm"
                } ${
                  active
                    ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                    : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                {option.label}
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
          {!question.required ? <p className="text-xs text-slate-500">{TEXT.optionalHint}</p> : null}
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
                      ? "min-h-[40px] px-2 py-2 text-center text-[12px] font-semibold leading-snug break-keep sm:min-h-[46px] sm:px-3 sm:py-2.5 sm:text-[13px]"
                      : "min-h-[44px] px-3 py-2.5 text-left text-[13px] font-medium leading-tight break-keep sm:min-h-[50px] sm:px-4 sm:py-3 sm:text-sm"
                  } ${
                    active
                      ? "border-sky-300 bg-sky-50 text-slate-900 ring-1 ring-sky-200 shadow-[0_8px_18px_-14px_rgba(14,116,144,0.35)]"
                      : "border-slate-300 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                  }`}
                >
                  {option.label}
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

  function handleMovePrevious() {
    if (isSectionTransitioning) return;
    if (!currentSection || currentSection.questions.length === 0) return;
    const activeIndex = getFocusedIndex(
      currentSection,
      focusedQuestionBySection[currentSection.key],
      answers
    );
    if (activeIndex > 0) {
      const prevKey = currentSection.questions[activeIndex - 1].question.key;
      setFocusedQuestionBySection((prev) => ({ ...prev, [currentSection.key]: prevKey }));
      setErrorQuestionKey(null);
      setErrorText(null);
      scrollToQuestion(prevKey);
      return;
    }

    if (currentSectionIndex <= 0) return;
    const prevSection = surveySections[currentSectionIndex - 1];
    if (!prevSection || prevSection.questions.length === 0) return;
    const prevKey = prevSection.questions[prevSection.questions.length - 1].question.key;
    setCurrentSectionIndex(currentSectionIndex - 1);
    setFocusedQuestionBySection((prev) => ({ ...prev, [prevSection.key]: prevKey }));
    setErrorQuestionKey(null);
    setErrorText(null);
    scrollToQuestion(prevKey);
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

  const resultSummary =
    result ??
    (() => {
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
    })();

  if (!hydrated) return null;

  const activeQuestionIndex =
    currentSection && currentSection.questions.length > 0
      ? getFocusedIndex(currentSection, focusedQuestionBySection[currentSection.key], answers)
      : -1;
  const hasPrevStep = currentSectionIndex > 0 || activeQuestionIndex > 0;
  const prevButtonLabel = activeQuestionIndex > 0 ? TEXT.prevQuestion : TEXT.prevSection;
  const atLastQuestionInSection =
    !!currentSection &&
    activeQuestionIndex >= 0 &&
    activeQuestionIndex >= currentSection.questions.length - 1;
  const atLastSection = currentSectionIndex >= surveySections.length - 1;
  const nextButtonLabel = atLastSection
    ? atLastQuestionInSection
      ? TEXT.resultCheck
      : TEXT.nextQuestion
    : atLastQuestionInSection
    ? TEXT.nextSection
    : TEXT.nextQuestion;
  const headerStep = displayStep > 0 ? displayStep : 1;
  const progressMessage = resolveProgressMessage(progressPercent);

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[linear-gradient(120deg,#d2e6f5_0%,#d6deee_42%,#dfe4f0_100%)] py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[920px] px-4 overflow-visible">
        {phase === "intro" ? (
          <div className="mx-auto max-w-[820px] rounded-[26px] border border-sky-100/70 bg-white/80 p-5 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-7">
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{TEXT.introTitle}</h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">{TEXT.introDesc1}</p>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">{TEXT.introDesc2}</p>

            <section className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 sm:p-5">
              <h2 className="text-lg font-bold text-slate-900">{TEXT.preAuthTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{TEXT.preAuthDesc}</p>
              {authInitializing ? (
                <div data-testid="survey-auth-loading" className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">{TEXT.authCheckingTitle}</p>
                  <p className="text-xs text-slate-500">{TEXT.authCheckingDesc}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="h-[44px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/90" />
                    <div className="h-[44px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/90" />
                    <div className="h-[44px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/90" />
                  </div>
                  <div className="h-[40px] w-[170px] animate-pulse rounded-full border border-slate-200 bg-slate-100/90" />
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      autoComplete="name"
                      value={identity.name}
                      disabled={!identityEditable || authBusy !== "idle"}
                      onChange={(event) =>
                        setIdentity((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder={TEXT.namePlaceholder}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <input
                      type="text"
                      autoComplete="bday"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={identity.birthDate}
                      disabled={!identityEditable || authBusy !== "idle"}
                      onChange={(event) =>
                        setIdentity((prev) => ({
                          ...prev,
                          birthDate: normalizeDigits(event.target.value).slice(0, 8),
                        }))
                      }
                      placeholder={TEXT.birthPlaceholder}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <input
                      type="text"
                      autoComplete="tel"
                      inputMode="tel"
                      pattern="[0-9]*"
                      maxLength={11}
                      value={identity.phone}
                      disabled={!identityEditable || authBusy !== "idle"}
                      onChange={(event) =>
                        setIdentity((prev) => ({
                          ...prev,
                          phone: normalizeDigits(event.target.value).slice(0, 11),
                        }))
                      }
                      placeholder={TEXT.phonePlaceholder}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  {identityLocked ? (
                    <p className="mt-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
                      {TEXT.authLockedHint}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={authBusy !== "idle" || !identityEditable || authVerified}
                      onClick={() => void handleStartKakaoAuth()}
                      className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {identityLocked
                        ? TEXT.authDone
                        : authBusy === "init" || authBusy === "sync"
                        ? TEXT.busyRequest
                        : authPendingSign
                        ? TEXT.resendAuth
                        : TEXT.sendAuth}
                    </button>
                    {authPendingSign && !authVerified ? (
                      <button
                        type="button"
                        disabled={authBusy !== "idle" || !identityEditable}
                        onClick={() => void handleConfirmKakaoAuth()}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {authBusy === "sign" ? TEXT.busyChecking : TEXT.checkAuth}
                      </button>
                    ) : null}
                    {identityLocked ? (
                      <button
                        type="button"
                        disabled={authBusy !== "idle"}
                        onClick={() => void handleSwitchIdentity()}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {TEXT.switchIdentity}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </section>

            {authNoticeText ? (
              <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {authNoticeText}
              </p>
            ) : null}
            {authErrorText ? (
              <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {authErrorText}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartSurvey}
                disabled={!authVerified || authBusy !== "idle" || authInitializing}
                data-testid="survey-start-button"
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {TEXT.startSurvey}
              </button>
              <span
                className={`text-sm font-medium ${
                  authInitializing
                    ? "text-sky-700"
                    : authVerified
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                {authInitializing
                  ? TEXT.authCheckingTitle
                  : authVerified
                  ? TEXT.authDone
                  : TEXT.needAuthNotice}
              </span>
            </div>
          </div>
        ) : null}

        {phase === "survey" ? (
          <div className="rounded-[26px] border border-sky-100/70 bg-white/78 p-4 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-6 overflow-visible">
            <header className="grid grid-cols-2 gap-4 border-b border-slate-200/80 pb-5 sm:pb-6">
              <div className="space-y-1.5">
                <span className="inline-flex rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {currentSectionIndex + 1}. {currentSection?.title ?? TEXT.commonSection}
                </span>
                <p className="text-sm font-semibold text-sky-700">{TEXT.progressTitle}</p>
                <p className="text-2xl font-extrabold leading-none text-slate-900 sm:text-3xl">
                  {headerStep}/{displayTotal}
                </p>
                <p className="text-sm text-slate-600 sm:text-base">
                  전체 진행률 {progressPercent}% ({progressDoneCount}/{questionList.length || 0})
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={requestReset}
                    data-testid="survey-header-reset-button"
                    className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  >
                    {TEXT.restart}
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm text-slate-600">
                    <span>{TEXT.progressBarLabel}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-sky-100">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-sky-700">{progressMessage}</p>
                </div>
              </div>
            </header>

            {surveySections.length > 1 ? (
              <nav className="mt-4 flex flex-wrap gap-2">
                {surveySections.map((section, index) => (
                  <button
                    key={section.key}
                    type="button"
                    disabled={isSectionTransitioning}
                    onClick={() => moveToSection(index)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      index === currentSectionIndex
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                    } ${isSectionTransitioning ? "cursor-wait opacity-70" : ""}`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            ) : null}

            {isSectionTransitioning ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2.5 text-sm text-sky-700">
                <p className="font-semibold">{TEXT.sectionTransitionTitle}</p>
                <p className="mt-0.5 text-xs text-sky-600">{TEXT.sectionTransitionDesc}</p>
              </div>
            ) : null}

            <section className="mt-5 space-y-3 overflow-visible max-h-none">
              {currentSection?.questions.map((node) => {
                const question = node.question;
                const questionText = toDisplayQuestionText(question);
                const isFocused = focusedQuestionKey === question.key;
                const questionNumber =
                  questionList.findIndex((item) => item.question.key === question.key) + 1;
                return (
                  <article
                    key={question.key}
                    data-testid="survey-question"
                    data-question-key={question.key}
                    data-question-type={question.type}
                    data-focused={isFocused ? "true" : "false"}
                    ref={(nodeRef) => {
                      questionRefs.current[question.key] = nodeRef;
                    }}
                    className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${
                      isFocused
                        ? "border-sky-300 shadow-[0_12px_30px_-20px_rgba(56,189,248,0.8)]"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                        {node.sectionKey ? node.sectionTitle : TEXT.commonBadge}
                      </span>
                      {question.required ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          {TEXT.requiredBadge}
                        </span>
                      ) : null}
                    </div>
                    <div className="w-full text-left">
                      <h3 className="text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl sm:leading-tight">
                        {questionNumber}. {questionText || question.key}
                      </h3>
                    </div>
                    {question.helpText ? (
                      <p className="mt-2 text-sm text-slate-500">{question.helpText}</p>
                    ) : null}
                    <div className="mt-4">{renderQuestionInput(question)}</div>
                    {errorQuestionKey === question.key && errorText ? (
                      <p className="mt-2 text-sm font-medium text-rose-600">{errorText}</p>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <footer className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleMovePrevious}
                disabled={!hasPrevStep || isSectionTransitioning}
                data-testid="survey-prev-button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prevButtonLabel}
              </button>
              <button
                type="button"
                onClick={() => handleAdvance()}
                disabled={isSectionTransitioning}
                data-testid="survey-next-button"
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nextButtonLabel}
              </button>
            </footer>
          </div>
        ) : null}

        {phase === "calculating" ? (
          <div
            data-testid="survey-calculating"
            className="mx-auto max-w-2xl rounded-[30px] border border-sky-100/70 bg-white/78 p-6 text-center shadow-[0_24px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8"
          >
            <p className="text-sm font-semibold text-sky-700">{TEXT.resultTitle}</p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
              {CALCULATING_MESSAGES[calcMessageIndex]}
            </h2>
            <div className="mx-auto mt-6 h-2 w-full max-w-xl rounded-full bg-sky-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-300"
                style={{ width: `${calcPercent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">{calcPercent}%</p>
          </div>
        ) : null}

        {phase === "result" ? (
          <div
            data-testid="survey-result"
            className="mx-auto max-w-[840px] rounded-[26px] border border-sky-100/70 bg-white/82 p-5 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur sm:p-7"
          >
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{TEXT.resultTitle}</h2>
            {resultSummary ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">{TEXT.scoreHealth}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                      {Math.round(resultSummary.overallHealthScore)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">{TEXT.scoreRisk}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                      {Math.round(resultSummary.lifestyleRisk.overallPercent)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">{TEXT.scoreNeed}</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                      {Math.round(resultSummary.healthManagementNeed.averagePercent)}
                    </p>
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-slate-900">핵심 위험 하이라이트</h3>
                  {resultSummary.highRiskHighlights.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {resultSummary.highRiskHighlights.map((item, index) => {
                        const categoryLabel =
                          item.category === "common"
                            ? "공통"
                            : item.category === "detailed"
                            ? "상세"
                            : item.category === "domain"
                            ? "생활습관"
                            : "영역";
                        return (
                          <li
                            key={`risk-${item.category}-${item.title}-${index}`}
                            className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-rose-700">
                              {categoryLabel} · 위험도 {Math.round(item.score)}점
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-slate-700">{item.action}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">표시할 하이라이트가 없습니다.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-slate-900">생활습관 실천 가이드</h3>
                  {resultSummary.lifestyleRoutineAdvice.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {resultSummary.lifestyleRoutineAdvice.map((item, index) => (
                        <li
                          key={`routine-${index}`}
                          className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">추가 실천 가이드가 없습니다.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-slate-900">영역별 분석 코멘트</h3>
                  <div className="mt-3 space-y-3">
                    {Object.entries(resultSummary.sectionAdvice)
                      .filter(([, value]) => value.items.length > 0)
                      .map(([sectionId, value]) => (
                        <article
                          key={`section-advice-${sectionId}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                        >
                          <h4 className="text-sm font-bold text-slate-900">{value.sectionTitle}</h4>
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                            {value.items.map((item) => (
                              <li key={`section-item-${sectionId}-${item.questionNumber}`}>
                                Q{item.questionNumber}. {item.text}
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-slate-900">맞춤 영양제 설계</h3>
                  {resultSummary.supplementDesign.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {resultSummary.supplementDesign.map((item) => (
                        <article
                          key={`supplement-${item.sectionId}`}
                          className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
                        >
                          <p className="text-xs font-semibold text-indigo-700">
                            {sectionTitleMap.get(item.sectionId) ?? item.sectionId}
                          </p>
                          <h4 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h4>
                          <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                            {item.paragraphs.map((paragraph, index) => (
                              <p key={`supplement-paragraph-${item.sectionId}-${index}`}>
                                {paragraph}
                              </p>
                            ))}
                          </div>
                          {item.recommendedNutrients && item.recommendedNutrients.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.recommendedNutrients.map((nutrient) => (
                                <span
                                  key={`nutrient-${item.sectionId}-${nutrient.code}`}
                                  className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700"
                                >
                                  {nutrient.label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      현재 선택한 설문 결과에서 제안할 맞춤 설계가 없습니다.
                    </p>
                  )}
                </section>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                analysis_failed
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhase("survey");
                  setResult(resultSummary);
                }}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
              >
                {TEXT.editSurvey}
              </button>
              <button
                type="button"
                onClick={() => startCalculation(answers, selectedSectionsCommitted)}
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 hover:shadow-md active:scale-[0.99]"
              >
                {TEXT.resultCheck}
              </button>
              <button
                type="button"
                onClick={requestReset}
                data-testid="survey-result-reset-button"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.99]"
              >
                {TEXT.restart}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {renderRenewalModal()}
      {renderResetConfirmModal()}
    </div>
  );
}
