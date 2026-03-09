import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-progression-actions.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-progression-actions"/,
    "SurveyPageClient must import useSurveyProgressionActions."
  );
  assert.ok(
    clientSource.includes("useSurveyProgressionActions({"),
    "SurveyPageClient must call useSurveyProgressionActions."
  );
  checks.push("client_uses_progression_actions_hook");

  for (const token of [
    "function startCalculation(",
    "function handleAdvance(",
    "function handleMovePreviousSection(",
    "function handleMoveNextSection(",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline progression flow after extraction: ${token}`
    );
  }
  checks.push("client_has_no_inline_progression_actions");

  for (const token of [
    "export function useSurveyProgressionActions(",
    "const startCalculation = useCallback(",
    "const handleAdvance = useCallback(",
    "const handleMovePreviousSection = useCallback(",
    "const handleMoveNextSection = useCallback(",
    "buildPublicSurveyQuestionList(",
    "computeSurveyResultFromAnswers(",
    "resolveSurveySelectionState(",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Progression hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_progression_and_calculation_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
