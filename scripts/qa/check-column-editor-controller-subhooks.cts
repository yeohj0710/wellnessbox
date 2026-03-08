import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const POST_ACTIONS_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/column/editor/_lib/use-column-editor-post-actions.ts"
);
const MARKDOWN_MEDIA_PATH = path.resolve(
  process.cwd(),
  "app/(admin)/admin/column/editor/_lib/use-column-editor-markdown-media.ts"
);

function run() {
  const checks: string[] = [];
  const postActionsSource = fs.readFileSync(POST_ACTIONS_PATH, "utf8");
  const markdownMediaSource = fs.readFileSync(MARKDOWN_MEDIA_PATH, "utf8");

  assert.match(
    postActionsSource,
    /export function useColumnEditorPostActions/,
    "useColumnEditorPostActions should export properly."
  );
  for (const token of [
    "const upsertPayload = useMemo(",
    "const publishBlockReason = useMemo(",
    "const handleSave = useCallback(",
    "const handlePublish = useCallback(",
    "const handleDelete = useCallback(",
    "const handleSaveToWorkspace = useCallback(",
    'router.replace(`/admin/column/editor?postId=${encodeURIComponent(post.id)}`',
    'window.confirm("이 게시글을 삭제하시겠습니까?")',
  ]) {
    assert.ok(
      postActionsSource.includes(token),
      `[qa:column-editor:controller-subhooks] missing post-actions token: ${token}`
    );
  }
  checks.push("post_actions_hook_owns_mutation_handlers");

  assert.match(
    markdownMediaSource,
    /export function useColumnEditorMarkdownMedia/,
    "useColumnEditorMarkdownMedia should export properly."
  );
  for (const token of [
    "const textareaRef = useRef<HTMLTextAreaElement>(null);",
    "const fileInputRef = useRef<HTMLInputElement>(null);",
    "const insertSnippetsAtCursor = useCallback(",
    "const uploadFilesAndInsertMarkdown = useCallback(",
    "const handlePasteImage = useCallback(",
    "const handleSelectFiles = useCallback(",
    "const snippets = await Promise.all(",
    "uploadImageToCloudflare(file)",
  ]) {
    assert.ok(
      markdownMediaSource.includes(token),
      `[qa:column-editor:controller-subhooks] missing markdown-media token: ${token}`
    );
  }
  checks.push("markdown_media_hook_owns_upload_refs_and_insertion_flow");

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

run();
