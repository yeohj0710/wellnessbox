import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CLIENT_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/column/editor/EditorAdminClient.tsx"
);
const CONTROLLER_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/column/editor/_lib/use-column-editor-controller.ts"
);

function run() {
  const checks: string[] = [];
  const clientSource = fs.readFileSync(CLIENT_PATH, "utf8");
  const controllerSource = fs.readFileSync(CONTROLLER_PATH, "utf8");

  assert.match(
    clientSource,
    /import \{ useColumnEditorController \} from "\.\/_lib\/use-column-editor-controller";/,
    "EditorAdminClient must import useColumnEditorController."
  );
  assert.match(
    clientSource,
    /useColumnEditorController\(\{\s*allowDevFileSave,\s*\}\)/,
    "EditorAdminClient must call useColumnEditorController with allowDevFileSave."
  );
  for (const token of [
    "<ColumnPostListSidebar {...sidebarProps} />",
    "<ColumnEditorWorkspace {...workspaceProps} />",
  ]) {
    assert.ok(
      clientSource.includes(token),
      `[qa:column-editor:controller-extraction] missing client token: ${token}`
    );
  }
  checks.push("client_composes_controller_output");

  for (const legacyToken of [
    "const loadPosts = useCallback(",
    "const openPost = useCallback(",
    "async function handleSave(",
    "async function handlePublish(",
    "async function handleDelete(",
    "async function handleSaveToWorkspace(",
    "async function uploadFilesAndInsertMarkdown(",
    "const updateField = <K extends keyof EditorForm>(",
    "const [posts, setPosts] = useState<ColumnPostDto[]>([]);",
  ]) {
    assert.ok(
      !clientSource.includes(legacyToken),
      `EditorAdminClient should not keep legacy controller token: ${legacyToken}`
    );
  }
  checks.push("client_keeps_no_inline_controller_logic");

  assert.match(
    controllerSource,
    /export function useColumnEditorController/,
    "useColumnEditorController should export properly."
  );
  for (const token of [
    'import { useColumnEditorMarkdownMedia } from "./use-column-editor-markdown-media";',
    'import { useColumnEditorPostActions } from "./use-column-editor-post-actions";',
    "useColumnEditorMarkdownMedia({",
    "useColumnEditorPostActions({",
    "const loadPosts = useCallback(",
    "const openPost = useCallback(",
    "const updateField = useCallback(",
    "sidebarProps:",
    "workspaceProps:",
  ]) {
    assert.ok(
      controllerSource.includes(token),
      `[qa:column-editor:controller-extraction] missing controller token: ${token}`
    );
  }
  checks.push("controller_composes_selection_state_and_subhooks");

  for (const legacyToken of [
    "const handleSave = useCallback(",
    "const handlePublish = useCallback(",
    "const handleDelete = useCallback(",
    "const handleSaveToWorkspace = useCallback(",
    "const uploadFilesAndInsertMarkdown = useCallback(",
    "const handlePasteImage = useCallback(",
    "const handleSelectFiles = useCallback(",
    "const textareaRef = useRef<HTMLTextAreaElement>(null);",
    "const fileInputRef = useRef<HTMLInputElement>(null);",
  ]) {
    assert.ok(
      !controllerSource.includes(legacyToken),
      `Controller should not keep extracted token: ${legacyToken}`
    );
  }
  checks.push("controller_drops_inline_actions_and_media_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
