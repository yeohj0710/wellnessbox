import "server-only";

export type SurveyOption = {
  value: string;
  label: string;
  score?: number;
  isNoneOption?: boolean;
};

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function targetScoreForPeriod(periodRank: number, employeeRank: number) {
  if (periodRank <= 0) return clamp01(0.55 + employeeRank * 0.05);
  if (periodRank === 1) return clamp01(0.7 + employeeRank * 0.05);
  return clamp01(0.85 + employeeRank * 0.05);
}

function normalizeTextToken(value: string) {
  return value.trim().toLowerCase();
}

export function pickOptionByKeyword(
  options: SurveyOption[],
  keywords: string[] | undefined,
  fallbackIndex = 0
) {
  if (options.length === 0) return null;
  const normalizedKeywords = (keywords ?? [])
    .map((keyword) => normalizeTextToken(keyword))
    .filter(Boolean);
  if (normalizedKeywords.length > 0) {
    for (const option of options) {
      const label = normalizeTextToken(option.label);
      const value = normalizeTextToken(option.value);
      const matched = normalizedKeywords.some(
        (keyword) =>
          keyword === label ||
          keyword === value ||
          label.includes(keyword) ||
          keyword.includes(label)
      );
      if (matched) return option;
    }
  }
  return options[Math.abs(fallbackIndex) % options.length] ?? options[0];
}

export function pickOptionByScore(
  options: SurveyOption[],
  scoreTarget: number,
  fallbackIndex = 0
) {
  if (options.length === 0) return null;
  const scored = options
    .map((option, index) => ({ option, index }))
    .filter((row) => typeof row.option.score === "number");
  if (scored.length === 0) {
    return options[Math.abs(fallbackIndex) % options.length] ?? options[0];
  }

  let selected = scored[0];
  let selectedDistance = Math.abs((selected.option.score ?? 0) - scoreTarget);
  for (const row of scored.slice(1)) {
    const distance = Math.abs((row.option.score ?? 0) - scoreTarget);
    if (distance < selectedDistance - 1e-9) {
      selected = row;
      selectedDistance = distance;
      continue;
    }
    if (Math.abs(distance - selectedDistance) <= 1e-9 && row.index < selected.index) {
      selected = row;
      selectedDistance = distance;
    }
  }
  return selected.option;
}

export function pickMultiValues(input: {
  options: SurveyOption[];
  maxSelect: number;
  keywords?: string[];
  fallbackSeed: number;
}) {
  const available = input.options.filter((option) => option.isNoneOption !== true);
  const noneOption = input.options.find((option) => option.isNoneOption === true) ?? null;
  if (available.length === 0) {
    return noneOption ? [noneOption.value] : [];
  }

  const chosen: string[] = [];
  for (const keyword of input.keywords ?? []) {
    const match = pickOptionByKeyword(available, [keyword], input.fallbackSeed);
    if (!match) continue;
    if (!chosen.includes(match.value)) {
      chosen.push(match.value);
    }
    if (chosen.length >= input.maxSelect) break;
  }

  if (chosen.length === 0) {
    const rotated = [...available]
      .slice(input.fallbackSeed % available.length)
      .concat([...available].slice(0, input.fallbackSeed % available.length));
    const targetCount = Math.min(Math.max(1, input.maxSelect), 2);
    for (const option of rotated) {
      if (!chosen.includes(option.value)) {
        chosen.push(option.value);
      }
      if (chosen.length >= targetCount) break;
    }
  }

  if (chosen.length === 0 && noneOption) return [noneOption.value];
  return chosen.slice(0, input.maxSelect);
}
