"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OperationLoadingOverlay from "@/components/common/operationLoadingOverlay";
import {
  deleteAdminColumnPost,
  fetchAdminColumnPost,
  fetchAdminColumnPosts,
  publishAdminColumnPost,
  saveAdminColumnMarkdownFile,
  uploadImageToCloudflare,
  upsertAdminColumnPost,
} from "./_lib/api";
import type {
  ColumnPostStatus,
  ColumnPostDto,
  EditorAdminClientProps,
  EditorForm,
  EditorTab,
  PostListFilterStatus,
} from "./_lib/types";
import {
  applyPostToFormState,
  buildDevFileMarkdown,
  buildUpsertPayload,
  estimateReadingMinutes,
  formatDateTime,
  INITIAL_FORM,
  slugify,
} from "./_lib/utils";
import { ColumnEditorHeader } from "./_components/ColumnEditorHeader";
import { ColumnEditorWorkspace } from "./_components/ColumnEditorWorkspace";
import { ColumnPostListSidebar } from "./_components/ColumnPostListSidebar";

export default function EditorAdminClient({ allowDevFileSave }: EditorAdminClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPostId = searchParams.get("postId")?.trim() || null;
  const [posts, setPosts] = useState<ColumnPostDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostListFilterStatus>("all");
  const [slugEdited, setSlugEdited] = useState(false);

  const [form, setForm] = useState<EditorForm>(INITIAL_FORM);
  const [activeStatus, setActiveStatus] = useState<ColumnPostStatus>("draft");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [devSaving, setDevSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorTab, setEditorTab] = useState<EditorTab>("write");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledPostIdRef = useRef<string | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId]
  );

  const canMutate = !saving && !publishing && !deleting && !loadingDetail;
  const busyOverlayMessage = useMemo(() => {
    if (deleting) return "게시글을 삭제하고 있어요.";
    if (publishing) return "게시글 발행 상태를 변경하고 있어요.";
    if (saving) return "게시글을 저장하고 있어요.";
    if (uploading) return "이미지를 업로드하고 있어요.";
    if (devSaving) return "개발용 파일을 저장하고 있어요.";
    if (loadingDetail) return "게시글 상세 내용을 불러오고 있어요.";
    if (loadingList) return "게시글 목록을 불러오고 있어요.";
    return "";
  }, [deleting, publishing, saving, uploading, devSaving, loadingDetail, loadingList]);

  const loadPosts = useCallback(
    async (opts?: { keepSelection?: boolean }) => {
      setLoadingList(true);
      try {
        const nextPosts = await fetchAdminColumnPosts({
          search,
          statusFilter,
        });
        setPosts(nextPosts);

        if (opts?.keepSelection && selectedId) {
          const exists = nextPosts.some((post) => post.id === selectedId);
          if (!exists) {
            setSelectedId(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "게시글 목록 조회에 실패했습니다.");
      } finally {
        setLoadingList(false);
      }
    },
    [search, selectedId, statusFilter]
  );

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!requestedPostId) {
      handledPostIdRef.current = null;
      return;
    }
    if (handledPostIdRef.current === requestedPostId) return;
    handledPostIdRef.current = requestedPostId;
    void openPost(requestedPostId);
  }, [requestedPostId]);

  function applyPostToForm(post: ColumnPostDto) {
    const next = applyPostToFormState(post);
    setForm(next.form);
    setSlugEdited(true);
    setActiveStatus(next.status);
    setPublishedAt(next.publishedAt);
    setUpdatedAt(next.updatedAt);
  }

  async function openPost(id: string) {
    setLoadingDetail(true);
    setError("");
    try {
      const post = await fetchAdminColumnPost(id);
      setSelectedId(id);
      applyPostToForm(post);
      router.replace(`/admin/column/editor?postId=${encodeURIComponent(id)}`, {
        scroll: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 조회에 실패했습니다.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function resetEditor() {
    setSelectedId(null);
    setForm(INITIAL_FORM);
    setSlugEdited(false);
    setActiveStatus("draft");
    setPublishedAt(null);
    setUpdatedAt(null);
    setNotice("새 글 작성 모드로 전환했습니다.");
    setError("");
    handledPostIdRef.current = null;
    router.replace("/admin/column/editor", { scroll: false });
  }

  const updateField = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const upsertPayload = useMemo(() => buildUpsertPayload(form), [form]);

  const publishBlockReason = useMemo(() => {
    if (publishing) return "발행 처리 중입니다.";
    if (!selectedId) return "먼저 저장해야 발행할 수 있습니다.";
    if (!upsertPayload.title) return "제목을 입력해 주세요.";
    if (!upsertPayload.contentMarkdown.trim()) return "본문을 입력해 주세요.";
    return null;
  }, [publishing, selectedId, upsertPayload.contentMarkdown, upsertPayload.title]);

  async function handleSave() {
    if (!upsertPayload.title) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!upsertPayload.contentMarkdown.trim()) {
      setError("본문을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const post = await upsertAdminColumnPost({
        postId: selectedId,
        payload: upsertPayload,
        status: activeStatus,
      });

      setSelectedId(post.id);
      applyPostToForm(post);
      setSlugEdited(true);
      setNotice(selectedId ? "게시글을 수정 저장했습니다." : "새 게시글을 생성했습니다.");
      router.replace(
        `/admin/column/editor?postId=${encodeURIComponent(post.id)}`,
        {
          scroll: false,
        }
      );
      await loadPosts({ keepSelection: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(publish: boolean) {
    if (!selectedId) {
      setError("먼저 게시글을 저장해 주세요.");
      return;
    }
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const post = await publishAdminColumnPost({
        postId: selectedId,
        publish,
      });
      applyPostToForm(post);
      setActiveStatus(post.status);
      setNotice(publish ? "게시글을 발행했습니다." : "게시글을 비공개(초안)로 전환했습니다.");
      await loadPosts({ keepSelection: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "발행 상태 변경에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const ok = window.confirm("이 게시글을 삭제하시겠습니까?");
    if (!ok) return;

    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteAdminColumnPost(selectedId);
      resetEditor();
      await loadPosts({ keepSelection: false });
      setNotice("게시글을 삭제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveToWorkspace() {
    if (!allowDevFileSave) return;
    const slug = slugify(form.slug || form.title);
    if (!slug) {
      setError("제목 또는 slug를 입력해 주세요.");
      return;
    }

    setDevSaving(true);
    setError("");
    setNotice("");
    try {
      const { markdown } = buildDevFileMarkdown(form, activeStatus);
      const result = await saveAdminColumnMarkdownFile({ slug, markdown });
      setNotice(`${result.path || "app/column/_content"} 경로로 파일 저장을 완료했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "개발용 파일 저장에 실패했습니다.");
    } finally {
      setDevSaving(false);
    }
  }

  function insertSnippetsAtCursor(snippets: string[]) {
    if (snippets.length === 0) return;

    const block = `${snippets.join("\n")}\n`;
    const textarea = textareaRef.current;

    if (!textarea) {
      setForm((prev) => ({
        ...prev,
        contentMarkdown: `${prev.contentMarkdown.trimEnd()}\n\n${block}`.trimEnd(),
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setForm((prev) => ({
      ...prev,
      contentMarkdown: `${prev.contentMarkdown.slice(
        0,
        start
      )}${block}${prev.contentMarkdown.slice(end)}`,
    }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + block.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function uploadFilesAndInsertMarkdown(files: File[], source: string) {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError("");
    setNotice(`${source} 업로드를 시작합니다.`);
    try {
      const snippets: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const url = await uploadImageToCloudflare(file);
        const alt = file.name ? file.name.replace(/\.[^.]+$/, "") : "이미지";
        snippets.push(`![${alt}](${url})`);
      }
      insertSnippetsAtCursor(snippets);
      setNotice(`${source} 업로드를 완료했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePasteImage(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    );
    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    await uploadFilesAndInsertMarkdown([file], "붙여넣기 이미지");
  }

  async function handleSelectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadFilesAndInsertMarkdown(files, "파일 선택 이미지");
  }

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_36%,_#ffffff_100%)]">
      <OperationLoadingOverlay
        visible={
          deleting || publishing || saving || uploading || devSaving || loadingDetail || loadingList
        }
        title={busyOverlayMessage || "작업을 처리하고 있어요"}
        description="완료되면 편집 화면이 최신 상태로 갱신됩니다."
      />
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-10 sm:px-6">
        <ColumnEditorHeader />

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            data-testid="column-editor-notice"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ColumnPostListSidebar
            search={search}
            statusFilter={statusFilter}
            loadingList={loadingList}
            posts={posts}
            selectedId={selectedId}
            onCreateNew={resetEditor}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSearchSubmit={() => void loadPosts({ keepSelection: true })}
            onOpenPost={(id) => void openPost(id)}
            formatDateTime={formatDateTime}
          />
          <ColumnEditorWorkspace
            selectedId={selectedId}
            selectedPostTitle={selectedPost?.title || null}
            activeStatus={activeStatus}
            updatedAt={updatedAt}
            publishedAt={publishedAt}
            editorTab={editorTab}
            form={form}
            slugEdited={slugEdited}
            canMutate={canMutate}
            uploading={uploading}
            publishing={publishing}
            deleting={deleting}
            allowDevFileSave={allowDevFileSave}
            devSaving={devSaving}
            publishBlockReason={publishBlockReason}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            onEditorTabChange={setEditorTab}
            onTitleChange={(value) => updateField("title", value)}
            onAutoSlugChange={(value) => updateField("slug", value)}
            onSlugChange={(value) => {
              updateField("slug", value);
              setSlugEdited(value.trim().length > 0);
            }}
            onTagsChange={(value) => updateField("tags", value)}
            onCoverImageUrlChange={(value) => updateField("coverImageUrl", value)}
            onExcerptChange={(value) => updateField("excerpt", value)}
            onAuthorNameChange={(value) => updateField("authorName", value)}
            onContentMarkdownChange={(value) => updateField("contentMarkdown", value)}
            onPasteImage={(event) => void handlePasteImage(event)}
            onSelectFiles={(event) => void handleSelectFiles(event)}
            onSaveDraft={() => void handleSave()}
            onPublish={() => void handlePublish(true)}
            onUnpublish={() => void handlePublish(false)}
            onDelete={() => void handleDelete()}
            onSaveToWorkspace={() => void handleSaveToWorkspace()}
            formatDateTime={formatDateTime}
            slugify={slugify}
            estimateReadingMinutes={estimateReadingMinutes}
          />
        </div>
      </div>
    </section>
  );
}
