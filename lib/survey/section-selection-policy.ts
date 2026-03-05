type SelectionRulesLike = {
  maxSelectedSections?: number;
};

type SectionCatalogItemLike = {
  key: string;
  title: string;
  displayName?: string;
  triggerLabel: string;
  aliases?: string[];
};

type SelectionSchemaLike = {
  sectionCatalog: SectionCatalogItemLike[];
  rules: SelectionRulesLike;
};

function collectRawTokens(rawValue: unknown) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item));
  }
  if (typeof rawValue === "string") {
    return rawValue.split(/[,\n/|]/g);
  }
  if (typeof rawValue === "object" && rawValue) {
    const record = rawValue as Record<string, unknown>;
    if (Array.isArray(record.selectedValues)) {
      return record.selectedValues.map((item) => String(item));
    }
    if (Array.isArray(record.values)) {
      return record.values.map((item) => String(item));
    }
    return Object.values(record).map((value) => String(value));
  }
  return [];
}

function dedupeAndFilterSections(input: {
  values: string[];
  allowedSectionKeys: Set<string>;
  maxSelectedSections: number;
}) {
  const result: string[] = [];
  for (const sectionKey of input.values) {
    if (!input.allowedSectionKeys.has(sectionKey)) continue;
    if (result.includes(sectionKey)) continue;
    result.push(sectionKey);
    if (result.length >= input.maxSelectedSections) break;
  }
  return result;
}

export function resolveSectionKeysFromC27Input(
  templateSchema: SelectionSchemaLike,
  rawC27Value: unknown
) {
  const normalized = collectRawTokens(rawC27Value)
    .map((item) => item.trim())
    .filter(Boolean);
  if (normalized.length === 0) return [];

  const sectionByKeyword = templateSchema.sectionCatalog.map((section) => {
    const aliases = section.aliases ?? [];
    return {
      key: section.key,
      keywords: [
        section.key,
        section.title,
        section.displayName ?? section.title,
        section.triggerLabel,
        ...aliases,
      ]
        .map((item) => item.toLowerCase())
        .filter(Boolean),
    };
  });

  const maxSelectedSections = Math.max(1, templateSchema.rules.maxSelectedSections || 5);
  const selected = new Set<string>();
  for (const token of normalized) {
    const lowered = token.toLowerCase();
    const matched = sectionByKeyword.find((section) =>
      section.keywords.some(
        (keyword) => lowered === keyword || lowered.includes(keyword) || keyword.includes(lowered)
      )
    );
    if (!matched) continue;
    selected.add(matched.key);
    if (selected.size >= maxSelectedSections) break;
  }

  return [...selected];
}

export function resolveSelectedSectionsByC27Policy(input: {
  hasExplicitC27Answer: boolean;
  selectedSections?: string[];
  derivedSections: string[];
  allowedSectionKeys: Iterable<string>;
  maxSelectedSections: number;
}) {
  const allowedSet = new Set(input.allowedSectionKeys);
  if (input.hasExplicitC27Answer) {
    return dedupeAndFilterSections({
      values: input.derivedSections,
      allowedSectionKeys: allowedSet,
      maxSelectedSections: input.maxSelectedSections,
    });
  }
  return dedupeAndFilterSections({
    values: input.selectedSections ?? [],
    allowedSectionKeys: allowedSet,
    maxSelectedSections: input.maxSelectedSections,
  });
}
