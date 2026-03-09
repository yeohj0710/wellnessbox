import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientPath = path.join(root, "app/survey/survey-page-client.tsx");
const shellPath = path.join(root, "app/survey/_components/SurveyPageShell.tsx");

const client = fs.readFileSync(clientPath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");

const checks: string[] = [];

if (!client.includes('import SurveyPageShell from "./_components/SurveyPageShell";')) {
  throw new Error("survey-page-client.tsx must import SurveyPageShell.");
}
checks.push("client_imports_page_shell");

if (!client.includes("<SurveyPageShell")) {
  throw new Error("survey-page-client.tsx must render SurveyPageShell.");
}
checks.push("client_renders_page_shell");

const inlineLayoutTokens = [
  "bg-[radial-gradient(130%_90%_at_0%_0%",
  "<SurveyIntroPanel {...introPanelProps} />",
  "<SurveySectionPanel {...sectionPanelProps} />",
  "<SurveyRenewalModal {...renewalModalProps} />",
  "<SurveyResetConfirmModal {...resetConfirmModalProps} />",
];

for (const token of inlineLayoutTokens) {
  if (client.includes(token)) {
    throw new Error(`survey-page-client.tsx should not inline page shell token: ${token}`);
  }
}
checks.push("client_has_no_inline_page_shell_layout");

const shellTokens = [
  "SurveyIntroPanel",
  "SurveySectionPanel",
  "SurveyCalculatingPanel",
  "SurveyResultPanel",
  "SurveySubmittedPanel",
  "SurveyRenewalModal",
  "SurveyResetConfirmModal",
  "bg-[radial-gradient(130%_90%_at_0%_0%",
];

for (const token of shellTokens) {
  if (!shell.includes(token)) {
    throw new Error(`SurveyPageShell.tsx must own token: ${token}`);
  }
}
checks.push("shell_owns_layout_and_phase_rendering");

console.log(JSON.stringify({ ok: true, checks }, null, 2));
