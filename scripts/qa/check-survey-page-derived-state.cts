import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-page-derived-state.ts"
);
const MODEL_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/survey-page-client-model.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");
  const modelSource = fs.readFileSync(MODEL_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-page-derived-state"/,
    "SurveyPageClient must import useSurveyPageDerivedState."
  );
  assert.ok(
    clientSource.includes("useSurveyPageDerivedState({"),
    "SurveyPageClient must call useSurveyPageDerivedState."
  );
  for (const token of [
    "const resultSummary = useMemo(() => {",
    "const hasPrevStep =",
    "const prevButtonLabel = TEXT.prevSection;",
    "const nextButtonLabel =",
    "const progressMessage = resolveProgressMessage(",
    "const resolveQuestionHelpText = (question: WellnessSurveyQuestionForTemplate) => {",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline derived-state token: ${token}`
    );
  }
  checks.push("client_uses_derived_state_hook");

  for (const token of [
    "export function useSurveyPageDerivedState(",
    "resolveSurveyIntroState({",
    "resolveSurveySectionUiState({",
    "resolveSurveyResultSummary({",
    "resolveSurveyQuestionHelpText(question, text.optionalHint)",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Derived-state hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_memoized_page_derivation");

  for (const token of [
    "export function resolveSurveyIntroState(",
    "export function resolveSurveySectionUiState(",
    "export function resolveSurveyQuestionHelpText(",
    "export function resolveSurveyResultSummary(",
    "resolveSelectedSectionsFromC27(",
    "resolveProgressMessage(",
    "tryComputeSurveyResultFromAnswers(",
  ]) {
    assert.ok(
      modelSource.includes(token),
      `Client model should define token: ${token}`
    );
  }
  checks.push("model_file_owns_pure_page_rules");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
