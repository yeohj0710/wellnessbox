import "server-only";

import { normalizeCheckupListPayload, normalizeCheckupOverviewPayload, normalizeCheckupYearlyPayload } from "@/lib/server/hyphen/normalize-checkup";
import { normalizeHealthAge } from "@/lib/server/hyphen/normalize-health-age";
import { normalizeRecommendationSummary } from "@/lib/server/hyphen/normalize-recommendation";
import { extractRecentLines } from "@/lib/server/hyphen/normalize-shared";
import { normalizeTreatmentPayload } from "@/lib/server/hyphen/normalize-treatment";
import type {
  NormalizeNhisPayloadInput,
  NormalizedNhisPayload,
  NhisCheckupSummary,
  NhisHealthAgeSummary,
  NhisListSummary,
  NhisRecommendationSummary,
  NhisRow,
} from "@/lib/server/hyphen/normalize-types";

export type {
  NhisCheckupSummary,
  NhisHealthAgeSummary,
  NhisListSummary,
  NhisRecommendationSummary,
  NhisRow,
  NormalizedNhisPayload,
};

export function normalizeNhisPayload(input: NormalizeNhisPayloadInput): NormalizedNhisPayload {
  const medical = normalizeTreatmentPayload(input.medical);
  const medication = normalizeTreatmentPayload(input.medication);

  const checkupListNormalized = normalizeCheckupListPayload(input.checkupList);
  const checkupYearlyRows = normalizeCheckupYearlyPayload(input.checkupYearly);
  const checkupOverviewRows = normalizeCheckupOverviewPayload(input.checkupOverview);

  const recommendation = normalizeRecommendationSummary({
    medicalRows: medical.list,
    medicationRows: medication.list,
    checkupListRows: checkupListNormalized.rows,
    checkupYearlyRows,
    checkupOverviewRows,
  });

  return {
    medical,
    medication,
    checkup: {
      list: checkupListNormalized.rows,
      yearly: checkupYearlyRows,
      overview: checkupOverviewRows,
      summary: {
        listCount: checkupListNormalized.rows.length,
        yearlyCount: checkupYearlyRows.length,
        overviewCount: checkupOverviewRows.length,
        peopleCount: checkupListNormalized.peopleCount,
        yearCount: checkupListNormalized.yearCount,
        recentLines: extractRecentLines(
          [...checkupOverviewRows, ...checkupListNormalized.rows, ...checkupYearlyRows],
          8
        ),
      },
    },
    healthAge: normalizeHealthAge(input.healthAge),
    recommendation,
  };
}
