export type RiskCandidate = {
  category: "detailed" | "common" | "domain" | "section";
  title: string;
  scorePercent: number;
  contextPercent: number;
  action: string;
  questionNumber: number;
  sectionId?: string;
  questionKey?: string;
  questionText?: string;
  answerText?: string | null;
};

export function clampWellnessPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function sortRiskCandidates(left: RiskCandidate, right: RiskCandidate) {
  if (right.scorePercent !== left.scorePercent) {
    return right.scorePercent - left.scorePercent;
  }
  if (right.contextPercent !== left.contextPercent) {
    return right.contextPercent - left.contextPercent;
  }
  if (left.questionNumber !== right.questionNumber) {
    return left.questionNumber - right.questionNumber;
  }
  return left.title.localeCompare(right.title);
}

export function pickRepresentativeRiskCandidate(candidates: RiskCandidate[]) {
  return [...candidates]
    .sort((left, right) => {
      const answerPresenceDiff =
        Number(Boolean(right.answerText && right.answerText.trim())) -
        Number(Boolean(left.answerText && left.answerText.trim()));
      if (answerPresenceDiff !== 0) return answerPresenceDiff;
      return sortRiskCandidates(left, right);
    })
    .at(0);
}

function normalizeRiskIdentityText(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getRiskCandidateIdentity(candidate: RiskCandidate) {
  const questionText = normalizeRiskIdentityText(candidate.questionText);
  if (questionText) return `question:${questionText}`;
  const questionKey = normalizeRiskIdentityText(candidate.questionKey);
  if (questionKey) return `key:${questionKey}`;
  const title = normalizeRiskIdentityText(candidate.title);
  if (title) return `title:${title}`;
  return "";
}

export function toWellnessHighlight(candidate: RiskCandidate) {
  return {
    category: candidate.category,
    title: candidate.title,
    score: Math.round(clampWellnessPercent(candidate.scorePercent)),
    action: candidate.action,
    questionNumber: Number.isFinite(candidate.questionNumber)
      ? candidate.questionNumber
      : undefined,
    sectionId: candidate.sectionId,
    questionKey: candidate.questionKey,
    questionText: candidate.questionText || undefined,
    answerText: candidate.answerText || undefined,
  } as const;
}
