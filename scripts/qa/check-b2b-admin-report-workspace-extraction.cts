import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const CLIENT_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx"
);
const WORKSPACE_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.tsx"
);
const WORKSPACE_LOADED_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.loaded.tsx"
);
const WORKSPACE_STATES_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.states.tsx"
);
const WORKSPACE_TYPES_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_components/B2bAdminReportWorkspace.types.ts"
);
const WORKSPACE_MODEL_HOOK_PATH = path.resolve(
  ROOT_DIR,
  "app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-report-workspace-model.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const workspaceSource = fs.readFileSync(WORKSPACE_PATH, "utf8");
  const loadedSource = fs.readFileSync(WORKSPACE_LOADED_PATH, "utf8");
  const statesSource = fs.readFileSync(WORKSPACE_STATES_PATH, "utf8");
  const typesSource = fs.readFileSync(WORKSPACE_TYPES_PATH, "utf8");
  const workspaceModelHookSource = fs.readFileSync(WORKSPACE_MODEL_HOOK_PATH, "utf8");

  assert.match(
    clientSource,
    /import B2bAdminReportWorkspace from "\.\/_components\/B2bAdminReportWorkspace";/,
    "B2bAdminReportClient must import B2bAdminReportWorkspace."
  );
  assert.match(
    clientSource,
    /import \{ useB2bAdminReportWorkspaceModel \} from "\.\/_lib\/use-b2b-admin-report-workspace-model";/,
    "B2bAdminReportClient must import useB2bAdminReportWorkspaceModel."
  );
  assert.match(
    clientSource,
    /const workspace = useB2bAdminReportWorkspaceModel\(/,
    "B2bAdminReportClient should delegate workspace view-model assembly to useB2bAdminReportWorkspaceModel."
  );
  assert.match(
    clientSource,
    /<B2bAdminReportWorkspace[\s\S]*selection=\{workspace\.selection\}[\s\S]*content=\{workspace\.content\}[\s\S]*actions=\{workspace\.actions\}[\s\S]*\/>/,
    "B2bAdminReportClient should render B2bAdminReportWorkspace with grouped selection/content/actions props from the workspace model hook."
  );
  checks.push("client_uses_workspace_component");
  checks.push("client_uses_workspace_model_hook");

  for (const token of [
    "const workspaceSelection = useMemo",
    "const workspaceContent = useMemo",
    "const workspaceActions = useMemo",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `Workspace models should not remain inline in the client: ${token}`
    );
  }
  checks.push("client_has_no_inline_workspace_model_memos");

  for (const token of [
    "<B2bAdminReportDetailSkeleton",
    "<B2bEmployeeOverviewCard",
    "<B2bAdminReportPreviewPanel",
    "<B2bSurveyEditorPanel",
    "<B2bNoteEditorPanel",
    "<B2bAnalysisJsonPanel",
    "<B2bLayoutValidationPanel",
  ]) {
    assert.ok(
      !clientSource.includes(token),
      `Inline workspace markup should not remain in client: ${token}`
    );
  }
  checks.push("client_has_no_inline_workspace_markup");

  for (const token of [
    'from "./B2bAdminReportWorkspace.loaded"',
    'from "./B2bAdminReportWorkspace.states"',
    "B2bAdminReportSelectionPlaceholder",
    "B2bAdminReportDetailMissingState",
    "<B2bAdminReportWorkspaceLoaded",
  ]) {
    assert.ok(
      workspaceSource.includes(token),
      `[qa:b2b:admin-report-workspace-extraction] workspace shell missing token: ${token}`
    );
  }
  checks.push("workspace_shell_routes_between_states");

  for (const token of [
    "export type B2bAdminReportWorkspaceSelectionState = {",
    "export type B2bAdminReportWorkspaceContentState = {",
    "export type B2bAdminReportWorkspaceActions = {",
    "export type B2bAdminReportWorkspaceLoadedProps = {",
    "export type B2bAdminReportWorkspaceProps = {",
  ]) {
    assert.ok(
      typesSource.includes(token),
      `[qa:b2b:admin-report-workspace-extraction] workspace types missing token: ${token}`
    );
  }
  checks.push("workspace_types_define_grouped_selection_content_action_contracts");

  for (const token of [
    "<B2bEmployeeOverviewCard",
    "<B2bAdminReportPreviewPanel",
    "<B2bSurveyEditorPanel",
    "<B2bNoteEditorPanel",
    "<B2bAnalysisJsonPanel",
    "<B2bLayoutValidationPanel",
  ]) {
    assert.ok(
      loadedSource.includes(token),
      `[qa:b2b:admin-report-workspace-extraction] loaded workspace missing token: ${token}`
    );
  }
  checks.push("workspace_loaded_component_owns_detail_panels");

  for (const token of [
    "export function B2bAdminReportSelectionPlaceholder()",
    "export function B2bAdminReportDetailMissingState()",
  ]) {
    assert.ok(
      statesSource.includes(token),
      `[qa:b2b:admin-report-workspace-extraction] workspace states missing token: ${token}`
    );
  }
  checks.push("workspace_state_component_owns_placeholder_states");

  for (const token of [
    "export function useB2bAdminReportWorkspaceModel(",
    "const selection = useMemo<B2bAdminReportWorkspaceSelectionState>(",
    "const content = useMemo<B2bAdminReportWorkspaceContentState>(",
    "const actions = useMemo<B2bAdminReportWorkspaceActions>(",
  ]) {
    assert.ok(
      workspaceModelHookSource.includes(token),
      `[qa:b2b:admin-report-workspace-extraction] workspace model hook missing token: ${token}`
    );
  }
  checks.push("workspace_model_hook_owns_grouped_view_model_assembly");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
