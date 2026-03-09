import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(process.cwd(), "app/survey/survey-page-client.tsx");
const HOOK_PATH = path.resolve(
  process.cwd(),
  "app/survey/_lib/use-survey-page-action-handlers.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const hookSource = fs.readFileSync(HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /from "\@\/app\/survey\/_lib\/use-survey-page-action-handlers"/,
    "SurveyPageClient must import useSurveyPageActionHandlers."
  );
  assert.ok(
    clientSource.includes("useSurveyPageActionHandlers({"),
    "SurveyPageClient must call useSurveyPageActionHandlers."
  );
  for (const token of [
    "onNameChange={(value) =>",
    "onBirthDateChange={(value) =>",
    "onPhoneChange={(value) =>",
    "onStartKakaoAuth={() => void handleStartKakaoAuth()}",
    "onConfirmKakaoAuth={() => void handleConfirmKakaoAuth()}",
    "onSwitchIdentity={() => void handleSwitchIdentity()}",
    "onEditSurvey={() => {",
    "onClose={() => {",
    "onCancel={() => setIsResetConfirmModalOpen(false)}",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `SurveyPageClient should not keep inline page action token: ${token}`
    );
  }
  checks.push("client_uses_page_action_handler_hook");

  for (const token of [
    "export function useSurveyPageActionHandlers(",
    "const handleNameChange = useCallback(",
    "const handleBirthDateChange = useCallback(",
    "const handlePhoneChange = useCallback(",
    "const handleStartKakaoAuthClick = useCallback(",
    "const handleConfirmKakaoAuthClick = useCallback(",
    "const handleSwitchIdentityClick = useCallback(",
    "const handleEditAdminResult = useCallback(",
    "const handleEditSubmittedResult = useCallback(",
    "const handleCloseRenewalModal = useCallback(",
    "const handleCancelResetConfirm = useCallback(",
    "normalizeDigits(value).slice(0, 8)",
    "normalizeDigits(value).slice(0, 11)",
  ]) {
    assert.ok(
      hookSource.includes(token),
      `Page action-handlers hook should own token after extraction: ${token}`
    );
  }
  checks.push("hook_owns_panel_event_adapters");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
