import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const ACTIONS_HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-answer-actions.ts"
);
const RESULT_HELPER_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/survey-result-derivation.ts"
);
const PERSISTENCE_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/survey-page-persistence.ts"
);
const PROGRESSION_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-progression-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(ACTIONS_HOOK_PATH, "utf8");
  const resultHelperSource = fs.readFileSync(RESULT_HELPER_PATH, "utf8");
  const persistenceSource = fs.readFileSync(PERSISTENCE_PATH, "utf8");
  const progressionSource = fs.readFileSync(PROGRESSION_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-answer-actions"/,
    "SurveyPageClient must import useSurveyAnswerActions."
  );
  assert.ok(
    clientSource.includes("useSurveyAnswerActions({"),
    "SurveyPageClient must call useSurveyAnswerActions."
  );
  assert.ok(
    !clientSource.includes("function applyAnswer("),
    "SurveyPageClient should not keep inline applyAnswer after extraction."
  );
  assert.ok(
    !clientSource.includes("function addConfirmedQuestion("),
    "SurveyPageClient should not keep inline addConfirmedQuestion after extraction."
  );
  checks.push("client_uses_answer_actions_hook");

  for (const token of [
    "export function useSurveyAnswerActions(",
    "const applyAnswer = useCallback(",
    "const addConfirmedQuestion = useCallback(",
    "sanitizeSurveyAnswerValue(",
    "resolveSurveySelectionState(",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Answer-actions hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_answer_state_flow");

  for (const source of [clientSource, persistenceSource, progressionSource]) {
    assert.ok(
      source.includes("tryComputeSurveyResultFromAnswers(") ||
        source.includes("computeSurveyResultFromAnswers("),
      "Survey modules should adopt survey-result-derivation helper."
    );
  }
  for (const token of [
    "export function computeSurveyResultFromAnswers(",
    "export function tryComputeSurveyResultFromAnswers(",
    "buildWellnessAnalysisInputFromSurvey(",
    "computeWellnessResult(",
  ]) {
    assert.ok(
      resultHelperSource.includes(token),
      `survey-result-derivation should define token: ${token}`
    );
  }
  checks.push("result_derivation_helper_is_ssot");

  assert.ok(
    !clientSource.includes("buildWellnessAnalysisInputFromSurvey(") &&
      !clientSource.includes("computeWellnessResult("),
    "SurveyPageClient should not compute survey result inline after helper extraction."
  );
  checks.push("client_has_no_inline_result_derivation");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
