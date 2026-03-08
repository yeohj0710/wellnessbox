"use client";

import { CATEGORY_LABELS } from "@/lib/categories";
import {
  normalizeKey,
  parseRecommendationLines,
  resolveRecommendations,
  toKrw,
} from "../components/recommendedProductActions.utils";
import {
  loadCatalogByCategory,
  type CatalogEntry,
} from "./useChat.recommendation.catalog";

type ResolvedRecommendationPrice = {
  productName: string;
  sevenDayPrice: number;
};

const MISSING_PRICE_REGEX =
  /\(\s*(\uAC00\uACA9\s*\uBBF8\uC815|\uAC00\uACA9\s*\uD655\uC778\s*\uC911|\uAC00\uACA9\s*\uC815\uBCF4\s*\uC5C6\uC74C|\uAC00\uACA9\s*\uB370\uC774\uD130\s*\uD655\uC778\s*\uC911)\s*\)/;
const RECOMMENDATION_SECTION_REGEX =
  /\uCD94\uCC9C \uC81C\uD488\s*\(7\uC77C\s*\uAE30\uC900\s*\uAC00\uACA9\)/;
const HAS_PRICE_LINE_REGEX = /(\d{1,3}(?:,\d{3})+|\d+)\s*\uC6D0/;
const CATEGORY_LINE_REGEX =
  /^(\s*(?:[-*\u2022\u00b7\u25aa\u25e6]\s*)?)([^:\n]{1,48})\s*[:\uff1a]\s*(.+)$/;

const CATEGORY_SYNONYMS: Record<string, string> = {
  "\uBA40\uD2F0\uBE44\uD0C0\uBBFC": "\uC885\uD569\uBE44\uD0C0\uBBFC",
  "\uC720\uC0B0\uADE0": "\uD504\uB85C\uBC14\uC774\uC624\uD2F1\uC2A4(\uC720\uC0B0\uADE0)",
  "\uD504\uB85C\uBC14\uC774\uC624\uD2F1\uC2A4":
    "\uD504\uB85C\uBC14\uC774\uC624\uD2F1\uC2A4(\uC720\uC0B0\uADE0)",
  "\uBC00\uD06C\uC528\uC2AC":
    "\uBC00\uD06C\uC528\uC2AC(\uC2E4\uB9AC\uB9C8\uB9B0)",
  "\uBC00\uD06C\uC2DC\uC2AC":
    "\uBC00\uD06C\uC528\uC2AC(\uC2E4\uB9AC\uB9C8\uB9B0)",
};

const CANONICAL_CATEGORY_LABELS = Object.values(CATEGORY_LABELS);

function normalizeCategoryToken(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\(.*?\)/g, "");
}

function canonicalizeRecommendationCategory(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const aliased = CATEGORY_SYNONYMS[trimmed] || trimmed;
  const source = normalizeCategoryToken(aliased);
  if (!source) return aliased;

  for (const label of CANONICAL_CATEGORY_LABELS) {
    const normalized = normalizeCategoryToken(label);
    if (!normalized) continue;
    if (source.includes(normalized) || normalized.includes(source)) {
      return label;
    }
  }

  return aliased;
}

async function buildResolvedRecommendationPriceMap(text: string) {
  const resolvedBySourceKey = new Map<string, ResolvedRecommendationPrice>();
  const parsed = parseRecommendationLines(text);
  if (!parsed.length) return resolvedBySourceKey;

  try {
    const resolved = await resolveRecommendations(parsed, {
      dedupeByProductOption: false,
    });
    for (const item of resolved) {
      const key = `${normalizeKey(item.sourceCategory)}:${normalizeKey(
        item.sourceProductName
      )}`;
      if (!key || resolvedBySourceKey.has(key)) continue;
      resolvedBySourceKey.set(key, {
        productName: item.productName,
        sevenDayPrice: item.sevenDayPrice,
      });
    }
  } catch {
    // fall through to missing-price-only fallback
  }

  return resolvedBySourceKey;
}

function hydrateResolvedPriceLines(
  lines: string[],
  usedNames: Set<string>,
  resolvedBySourceKey: ReadonlyMap<string, ResolvedRecommendationPrice>
) {
  let changed = false;

  const nextLines = lines.map((line) => {
    if (!HAS_PRICE_LINE_REGEX.test(line)) return line;

    const match = line.match(CATEGORY_LINE_REGEX);
    if (!match) return line;

    const [, prefix, rawCategory] = match;
    const parsedLine = parseRecommendationLines(line);
    if (parsedLine.length !== 1) return line;

    const key = `${normalizeKey(parsedLine[0].category)}:${normalizeKey(
      parsedLine[0].productName
    )}`;
    const picked = resolvedBySourceKey.get(key);
    if (!picked) return line;

    usedNames.add(picked.productName);
    changed = true;
    return `${prefix}${rawCategory.trim()}: ${picked.productName} (${toKrw(
      picked.sevenDayPrice
    )})`;
  });

  return { changed, nextLines };
}

function hydrateMissingPriceLines(
  lines: string[],
  usedNames: Set<string>,
  byCategory: ReadonlyMap<string, CatalogEntry[]>
) {
  let changed = false;

  const nextLines = lines.map((line) => {
    if (!MISSING_PRICE_REGEX.test(line)) return line;

    const match = line.match(CATEGORY_LINE_REGEX);
    if (!match) return line;

    const [, prefix, rawCategory] = match;
    const canonical = canonicalizeRecommendationCategory(rawCategory);
    if (!canonical) return line;

    const candidates = byCategory.get(canonical) || [];
    const picked =
      candidates.find((candidate) => !usedNames.has(candidate.name)) ||
      candidates[0];
    if (!picked) return line;

    usedNames.add(picked.name);
    changed = true;
    return `${prefix}${rawCategory.trim()}: ${picked.name} (${toKrw(
      picked.sevenDayPrice
    )})`;
  });

  return { changed, nextLines };
}

export async function hydrateRecommendationPrices(text: string) {
  if (!text || !RECOMMENDATION_SECTION_REGEX.test(text)) return text;

  const hasMissingPrice = MISSING_PRICE_REGEX.test(text);
  const hasPriceLine = HAS_PRICE_LINE_REGEX.test(text);
  if (!hasMissingPrice && !hasPriceLine) return text;

  const usedNames = new Set<string>();
  const lines = text.split("\n");
  const resolvedBySourceKey = hasPriceLine
    ? await buildResolvedRecommendationPriceMap(text)
    : new Map<string, ResolvedRecommendationPrice>();

  const resolvedLineState = hydrateResolvedPriceLines(
    lines,
    usedNames,
    resolvedBySourceKey
  );
  let changed = resolvedLineState.changed;
  let nextLines = resolvedLineState.nextLines;

  if (hasMissingPrice) {
    const byCategory = await loadCatalogByCategory(
      canonicalizeRecommendationCategory
    );
    if (byCategory?.size) {
      const missingPriceState = hydrateMissingPriceLines(
        nextLines,
        usedNames,
        byCategory
      );
      changed = changed || missingPriceState.changed;
      nextLines = missingPriceState.nextLines;
    }
  }

  return changed ? nextLines.join("\n") : text;
}
