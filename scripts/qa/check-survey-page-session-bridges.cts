import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const clientPath = path.join(root, "app/survey/survey-page-client.tsx");
const bridgesPath = path.join(root, "app/survey/_lib/use-survey-page-session-bridges.ts");

const client = fs.readFileSync(clientPath, "utf8");
const bridges = fs.readFileSync(bridgesPath, "utf8");

const checks: string[] = [];

if (
  !client.includes('saveSurveyIdentity,') ||
  !client.includes('useSurveyRemoteSnapshotAdapter,') ||
  !client.includes('from "@/app/survey/_lib/use-survey-page-session-bridges";')
) {
  throw new Error("survey-page-client.tsx must import page session bridges.");
}
checks.push("client_imports_session_bridges");

if (!client.includes("const applyRemoteSurveySnapshot = useSurveyRemoteSnapshotAdapter({")) {
  throw new Error("survey-page-client.tsx must build applyRemoteSurveySnapshot via hook.");
}
checks.push("client_uses_remote_snapshot_adapter");

const forbiddenClientTokens = [
  "function saveSurveyIdentity(",
  "function applyRemoteSurveySnapshot(",
  "deriveRemoteSurveySnapshotState({",
  "saveStoredIdentity(toIdentityPayload(",
];

for (const token of forbiddenClientTokens) {
  if (client.includes(token)) {
    throw new Error(`survey-page-client.tsx should not inline token: ${token}`);
  }
}
checks.push("client_has_no_inline_session_bridge_logic");

const requiredBridgeTokens = [
  "export function saveSurveyIdentity(",
  "export function useSurveyRemoteSnapshotAdapter(",
  "saveStoredIdentity(toIdentityPayload(input));",
  "deriveRemoteSurveySnapshotState({",
  "tryComputeSurveyResultFromAnswers({",
];

for (const token of requiredBridgeTokens) {
  if (!bridges.includes(token)) {
    throw new Error(`use-survey-page-session-bridges.ts must own token: ${token}`);
  }
}
checks.push("bridge_module_owns_identity_and_remote_snapshot_logic");

console.log(JSON.stringify({ ok: true, checks }, null, 2));
