"use client";

import type { QType } from "../logic/algorithm";
import { BANK } from "../data/c-bank";

export type CSectionResultPayload = {
  catsOrdered: string[];
  scores: number[];
  percents: number[];
};

export type CSectionOption = {
  value: number;
  label: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeCSectionResultPayload(
  value: unknown
): CSectionResultPayload | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const catsOrderedRaw = Array.isArray(record.catsOrdered)
    ? record.catsOrdered
    : [];
  const scoresRaw = Array.isArray(record.scores) ? record.scores : [];
  const percentsRaw = Array.isArray(record.percents) ? record.percents : [];

  const catsOrdered = catsOrderedRaw.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
  const scores = scoresRaw.map((item) => (isFiniteNumber(item) ? item : 0));
  const percents = percentsRaw.map((item) => (isFiniteNumber(item) ? item : 0));

  if (!catsOrdered.length) return null;

  const normalizedPercents = percents.length
    ? percents
    : scores.map((score) => (score > 1 ? score / 100 : score));
  if (!normalizedPercents.length) return null;

  const length = Math.min(catsOrdered.length, normalizedPercents.length);
  if (length <= 0) return null;

  const normalizedScores = scores.length
    ? scores
    : normalizedPercents.map((score) => Math.round(score * 1000) / 1000);

  return {
    catsOrdered: catsOrdered.slice(0, length),
    scores: normalizedScores.slice(0, length),
    percents: normalizedPercents.slice(0, length).map((percent) => {
      if (percent < 0) return 0;
      if (percent > 1) return 1;
      return percent;
    }),
  };
}

export function getCQuestionType(cat: string, idx: number): QType {
  return (BANK[cat]?.[idx]?.type as QType) ?? "likert4";
}

export function normalizeCAnswerByType(type: QType, value: number): number {
  if (type === "yesno") return value;
  return value / 3;
}

export function resolveCOptionGridCols(options: readonly CSectionOption[]) {
  const hasLong = options.some((option) => {
    const text = String(option.label);
    return text.length >= 9 || text.split(/\s+/).length >= 3;
  });

  if (hasLong) return "grid-cols-1 sm:grid-cols-2";
  if (options.length === 1) return "grid-cols-1";
  if (options.length === 2) return "grid-cols-2 sm:grid-cols-2";
  if (options.length === 3) return "grid-cols-2 sm:grid-cols-3";
  if (options.length === 4) return "grid-cols-2 sm:grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}
