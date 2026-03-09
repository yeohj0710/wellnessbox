import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientPath = path.join(root, "app/survey/survey-page-client.tsx");
const hookPath = path.join(root, "app/survey/_lib/use-survey-page-access-control.ts");

const client = fs.readFileSync(clientPath, "utf8");
const hook = fs.readFileSync(hookPath, "utf8");

const checks: string[] = [];

if (
  !client.includes('import { useSurveyPageAccessControl } from "@/app/survey/_lib/use-survey-page-access-control";')
) {
  throw new Error("survey-page-client.tsx must import useSurveyPageAccessControl.");
}
checks.push("client_imports_access_control_hook");

if (!client.includes("const { isAdminLoggedIn, refreshLoginStatus } = useSurveyPageAccessControl({")) {
  throw new Error("survey-page-client.tsx must use useSurveyPageAccessControl.");
}
checks.push("client_uses_access_control_hook");

const forbiddenClientTokens = [
  "const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);",
  "const refreshLoginStatus = useCallback(async () => {",
  'if (phase === "survey" && !authVerified) setPhase("intro");',
];

for (const token of forbiddenClientTokens) {
  if (client.includes(token)) {
    throw new Error(`survey-page-client.tsx should not inline access-control token: ${token}`);
  }
}
checks.push("client_has_no_inline_access_control_logic");

const requiredHookTokens = [
  "export function useSurveyPageAccessControl(",
  "const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);",
  "const refreshLoginStatus = useCallback(async () => {",
  "const status = await getLoginStatus();",
  'if (phase === "survey" && !authVerified) setPhase("intro");',
];

for (const token of requiredHookTokens) {
  if (!hook.includes(token)) {
    throw new Error(`use-survey-page-access-control.ts must own token: ${token}`);
  }
}
checks.push("hook_owns_admin_login_refresh_and_phase_guard");

console.log(JSON.stringify({ ok: true, checks }, null, 2));
