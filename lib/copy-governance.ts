export type CopyRiskSeverity = "high" | "medium" | "low";

export type CopyRiskRuleId =
  | "therapeutic_claim"
  | "certainty_claim"
  | "hype_promotion"
  | "excessive_punctuation";

export type CopyRiskFinding = {
  ruleId: CopyRiskRuleId;
  label: string;
  severity: CopyRiskSeverity;
  match: string;
  reason: string;
  suggestedReplacement?: string;
};

type CopyRiskRule = {
  id: CopyRiskRuleId;
  label: string;
  severity: CopyRiskSeverity;
  pattern: RegExp;
  reason: string;
  suggestedReplacement?: string;
};

type GovernableCopyModel = {
  badgeLabel?: string;
  headline?: string;
  title?: string;
  description?: string;
  helper?: string;
  priceFrameLabel?: string;
  priceFrameHelper?: string;
  reasonLines?: string[];
  chips?: string[];
  primaryAction?: {
    label?: string;
  } | null;
  secondaryAction?: {
    label?: string;
  } | null;
};

const COPY_RISK_RULES: CopyRiskRule[] = [
  {
    id: "therapeutic_claim",
    label: "의료·처방처럼 읽히는 표현",
    severity: "high",
    pattern: /(처방|치료|완치|낫게|싹\b|한 알로 .*끝)/g,
    reason: "건기식·상담 흐름에서 의료 효능이나 처방처럼 들릴 수 있어요.",
    suggestedReplacement: "검토·안내·관리 중심 표현",
  },
  {
    id: "certainty_claim",
    label: "단정적 체감 표현",
    severity: "medium",
    pattern: /(확실히|확실한|분명히|분명한|분명해|증명합니다|진짜였어요|보장|무조건|반드시)/g,
    reason: "개인차와 불확실성을 가릴 수 있어요.",
    suggestedReplacement: "개인차를 열어두는 표현",
  },
  {
    id: "hype_promotion",
    label: "과한 프로모션·강조 표현",
    severity: "low",
    pattern: /(파격적|훨씬|완전히|즉시|딱 골라|딱골라|진짜 필요한|진짜필요한)/g,
    reason: "톤이 과열되면 신뢰형 서비스 맥락과 어긋날 수 있어요.",
    suggestedReplacement: "부담·이해·검토 중심 표현",
  },
  {
    id: "excessive_punctuation",
    label: "감탄 위주 강조",
    severity: "low",
    pattern: /!!+|\.{2,}/g,
    reason: "사용자 후기나 설명이 과장처럼 보일 수 있어요.",
    suggestedReplacement: "잔잔한 문장부호",
  },
];

const COPY_NORMALIZERS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  { pattern: /증명합니다/g, replacement: "전해드립니다" },
  { pattern: /확실히/g, replacement: "조금 더" },
  { pattern: /확실한/g, replacement: "조금 더 또렷한" },
  { pattern: /분명히/g, replacement: "조금 더 또렷하게" },
  { pattern: /분명한/g, replacement: "조금 더 또렷한" },
  { pattern: /분명해요/g, replacement: "조금 더 또렷해요" },
  { pattern: /무조건/g, replacement: "가능하면" },
  { pattern: /반드시/g, replacement: "우선" },
  { pattern: /파격적/g, replacement: "부담을 낮춘" },
  { pattern: /즉시/g, replacement: "바로" },
  { pattern: /진짜 필요한/g, replacement: "지금 필요한 쪽의" },
  { pattern: /딱 골라/g, replacement: "먼저 좁혀" },
  { pattern: /훨씬/g, replacement: "한층" },
  { pattern: /!!+/g, replacement: "!" },
  { pattern: /\.{2,}/g, replacement: "." },
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s{2,}/g, " ").trim();
}

export function analyzeCopyRisk(text: string): CopyRiskFinding[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const findings: CopyRiskFinding[] = [];

  for (const rule of COPY_RISK_RULES) {
    rule.pattern.lastIndex = 0;
    const matches = normalized.matchAll(rule.pattern);

    for (const match of matches) {
      const value = match[0]?.trim();
      if (!value) continue;

      findings.push({
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        match: value,
        reason: rule.reason,
        suggestedReplacement: rule.suggestedReplacement,
      });
    }
  }

  return findings;
}

export function governCopyText(text: string) {
  const findings = analyzeCopyRisk(text);
  let next = text;

  for (const normalizer of COPY_NORMALIZERS) {
    next = next.replace(normalizer.pattern, normalizer.replacement);
  }

  next = normalizeWhitespace(next);

  return {
    text: next,
    findings,
    wasAdjusted: next !== text,
  };
}

function governOptionalText(value: string | undefined) {
  if (!value) return value;
  return governCopyText(value).text;
}

export function governCopyModel<T extends GovernableCopyModel>(model: T): T {
  return {
    ...model,
    badgeLabel: governOptionalText(model.badgeLabel),
    headline: governOptionalText(model.headline),
    title: governOptionalText(model.title),
    description: governOptionalText(model.description),
    helper: governOptionalText(model.helper),
    priceFrameLabel: governOptionalText(model.priceFrameLabel),
    priceFrameHelper: governOptionalText(model.priceFrameHelper),
    reasonLines: model.reasonLines?.map((line) => governCopyText(line).text),
    chips: model.chips?.map((chip) => governCopyText(chip).text),
    primaryAction: model.primaryAction
      ? {
          ...model.primaryAction,
          label: governOptionalText(model.primaryAction.label),
        }
      : model.primaryAction,
    secondaryAction: model.secondaryAction
      ? {
          ...model.secondaryAction,
          label: governOptionalText(model.secondaryAction.label),
        }
      : model.secondaryAction,
  };
}
