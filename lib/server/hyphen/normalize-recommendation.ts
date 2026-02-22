import type {
  NhisRecommendationSummary,
  NhisRow,
} from "@/lib/server/hyphen/normalize-types";
import { firstText, toText } from "@/lib/server/hyphen/normalize-shared";

const INGREDIENT_KEYWORDS = ["cmpn_nm", "ingredient"];
const CAUTION_KEYWORDS = ["기기", "주의", "caution", "dur", "age_incp", "prgw_grde"];

function buildDiagnosisTimeline(rows: NhisRow[]): NhisRow[] {
  const out: NhisRow[] = [];
  for (const row of rows) {
    const diagnosis = firstText(row, [
      "diagNm",
      "diseaseNm",
      "sickNm",
      "mainSickNm",
      "diagType",
      "medicineEffect",
      "detail_MOHW_CLSF",
    ]);
    const date = firstText(row, ["diagDate", "medDate"]);
    const place = firstText(row, ["hospitalNm", "hspNm", "pharmNm"]);
    if (!diagnosis && !date && !place) continue;

    const timelineRow: NhisRow = {};
    if (date) timelineRow.date = date;
    if (diagnosis) timelineRow.diagnosis = diagnosis;
    if (place) timelineRow.place = place;

    const subject = firstText(row, ["subject"]);
    const examinee = firstText(row, ["examinee"]);
    if (subject) timelineRow.subject = subject;
    if (examinee) timelineRow.examinee = examinee;

    out.push(timelineRow);
    if (out.length >= 40) break;
  }
  return out;
}

function buildMedicationTimeline(rows: NhisRow[]): NhisRow[] {
  const out: NhisRow[] = [];
  for (const row of rows) {
    const medicineName = firstText(row, ["medicineNm", "drug_MEDI_PRDC_NM", "MEDI_PRDC_NM"]);
    const date = firstText(row, ["diagDate", "medDate"]);
    const ingredient = firstText(row, ["drug_CMPN_NM", "CMPN_NM", "drug_CMPN_NM_2"]);
    const effect = firstText(row, ["medicineEffect", "drug_EFFT_EFT_CNT", "EFFT_EFT_CNT"]);
    const dosageDay = firstText(row, ["dosageDay"]);
    if (!medicineName && !ingredient && !effect) continue;

    const timelineRow: NhisRow = {};
    if (date) timelineRow.date = date;
    if (medicineName) timelineRow.medicine = medicineName;
    if (ingredient) timelineRow.ingredient = ingredient;
    if (effect) timelineRow.effect = effect;
    if (dosageDay) timelineRow.dosageDay = dosageDay;
    out.push(timelineRow);
    if (out.length >= 60) break;
  }
  return out;
}

function collectUniqueByKeywords(rows: NhisRow[], keywords: string[], max = 80): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase();
      if (!keywords.some((keyword) => normalizedKey.includes(keyword))) continue;
      const text = toText(value);
      if (!text) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length >= max) return out;
    }
  }

  return out;
}

function buildCheckupFindings(
  checkupListRows: NhisRow[],
  checkupYearlyRows: NhisRow[],
  checkupOverviewRows: NhisRow[]
) {
  const candidates = [...checkupOverviewRows, ...checkupListRows, ...checkupYearlyRows];
  const out: NhisRow[] = [];
  for (const row of candidates) {
    const finding: NhisRow = {};

    const year = firstText(row, ["year"]);
    const category = firstText(row, ["checkUpType", "title", "qtitle"]);
    const result = firstText(row, ["result", "chkResult", "total", "itemData"]);
    const opinion = firstText(row, ["opinion", "chkAgency", "itemName"]);

    if (year) finding.year = year;
    if (category) finding.category = category;
    if (result) finding.result = result;
    if (opinion) finding.note = opinion;

    if (Object.keys(finding).length === 0) continue;
    out.push(finding);
    if (out.length >= 80) break;
  }
  return out;
}

export function normalizeRecommendationSummary(input: {
  medicalRows: NhisRow[];
  medicationRows: NhisRow[];
  checkupListRows: NhisRow[];
  checkupYearlyRows: NhisRow[];
  checkupOverviewRows: NhisRow[];
}): NhisRecommendationSummary {
  return {
    diagnosisTimeline: buildDiagnosisTimeline(input.medicalRows),
    medicationTimeline: buildMedicationTimeline(input.medicationRows),
    activeIngredients: collectUniqueByKeywords(input.medicationRows, INGREDIENT_KEYWORDS, 120),
    cautions: collectUniqueByKeywords(input.medicationRows, CAUTION_KEYWORDS, 80),
    checkupFindings: buildCheckupFindings(
      input.checkupListRows,
      input.checkupYearlyRows,
      input.checkupOverviewRows
    ),
  };
}
