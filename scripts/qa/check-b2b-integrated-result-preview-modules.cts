import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PREVIEW_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bIntegratedResultPreview.tsx"
);
const MODEL_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_lib/b2b-integrated-result-preview-model.ts"
);
const HEALTH_SECTION_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bIntegratedHealthMetricsSection.tsx"
);
const MEDICATION_SECTION_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/b2b-reports/_components/B2bIntegratedMedicationReviewSection.tsx"
);

function run() {
  const previewSource = fs.readFileSync(PREVIEW_PATH, "utf8");
  const modelSource = fs.readFileSync(MODEL_PATH, "utf8");
  const healthSectionSource = fs.readFileSync(HEALTH_SECTION_PATH, "utf8");
  const medicationSectionSource = fs.readFileSync(MEDICATION_SECTION_PATH, "utf8");
  const checks: string[] = [];

  assert.match(
    previewSource,
    /import \{\s*B2B_INTEGRATED_SURVEY_RESULT_TEXT,\s*buildB2bIntegratedResultPreviewModel,\s*\} from "\.\.\/_lib\/b2b-integrated-result-preview-model";/,
    "B2bIntegratedResultPreview must import the extracted preview model helper."
  );
  assert.match(
    previewSource,
    /import B2bIntegratedHealthMetricsSection from "\.\/B2bIntegratedHealthMetricsSection";/,
    "B2bIntegratedResultPreview must import the extracted health-metrics section."
  );
  assert.match(
    previewSource,
    /import B2bIntegratedMedicationReviewSection from "\.\/B2bIntegratedMedicationReviewSection";/,
    "B2bIntegratedResultPreview must import the extracted medication-review section."
  );
  checks.push("preview_shell_imports_model_and_sections");

  for (const legacyToken of [
    "function ensureArray(",
    "function toWellnessResult(",
    "const healthMetrics = useMemo(",
    "const medications = useMemo(",
  ]) {
    assert.ok(
      !previewSource.includes(legacyToken),
      `B2bIntegratedResultPreview should not keep legacy inline token: ${legacyToken}`
    );
  }
  checks.push("preview_shell_no_longer_owns_inline_transforms");

  for (const token of [
    "export function buildB2bIntegratedResultPreviewModel(",
    "function toWellnessResult(",
    "function buildHealthMetrics(",
    "function buildMedications(",
    "export const B2B_INTEGRATED_SURVEY_RESULT_TEXT =",
  ]) {
    assert.ok(
      modelSource.includes(token),
      `[qa:b2b:integrated-result-preview-modules] missing model token: ${token}`
    );
  }
  checks.push("model_file_owns_payload_normalization");

  for (const token of [
    "export default function B2bIntegratedHealthMetricsSection(",
    "건강검진 데이터 상세",
    "표시할 건강검진 지표가 없습니다.",
  ]) {
    assert.ok(
      healthSectionSource.includes(token),
      `[qa:b2b:integrated-result-preview-modules] missing health-section token: ${token}`
    );
  }
  checks.push("health_metrics_section_owns_metric_cards");

  for (const token of [
    "export default function B2bIntegratedMedicationReviewSection(",
    "복약 이력 · 약사 코멘트",
    "등록된 권장안이 없습니다.",
  ]) {
    assert.ok(
      medicationSectionSource.includes(token),
      `[qa:b2b:integrated-result-preview-modules] missing medication-section token: ${token}`
    );
  }
  checks.push("medication_section_owns_history_and_comment_cards");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
