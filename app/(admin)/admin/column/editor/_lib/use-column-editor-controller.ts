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
import { fetchAdminColumnPost, fetchAdminColumnPosts } from "./api";
import { useColumnEditorMarkdownMedia } from "./use-column-editor-markdown-media";
import { useColumnEditorPostActions } from "./use-column-editor-post-actions";
import type {
  ColumnPostDto,
  ColumnPostStatus,
  EditorForm,
  EditorTab,
  PostListFilterStatus,
} from "./types";
import {
  applyPostToFormState,
  estimateReadingMinutes,
  formatDateTime,
  INITIAL_FORM,
  slugify,
} from "./utils";

type UseColumnEditorControllerOptions = {
  allowDevFileSave: boolean;
};

type LoadPostsOptions = {
  keepSelection?: boolean;
};

export function useColumnEditorController({
  allowDevFileSave,
}: UseColumnEditorControllerOptions) {
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
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorTab, setEditorTab] = useState<EditorTab>("write");

  const handledPostIdRef = useRef<string | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId]
  );

  const applyPostToForm = useCallback((post: ColumnPostDto) => {
    const next = applyPostToFormState(post);
    setForm(next.form);
    setSlugEdited(true);
    setActiveStatus(next.status);
    setPublishedAt(next.publishedAt);
    setUpdatedAt(next.updatedAt);
  }, []);

  const resetEditor = useCallback(() => {
    setSelectedId(null);
    setForm(INITIAL_FORM);
    setSlugEdited(false);
    setActiveStatus("draft");
    setPublishedAt(null);
    setUpdatedAt(null);
    setEditorTab("write");
    setNotice("새 글 작성 모드로 전환했습니다.");
    setError("");
    handledPostIdRef.current = null;
    router.replace("/admin/column/editor", { scroll: false });
  }, [router]);

  const loadPosts = useCallback(
    async (opts?: LoadPostsOptions) => {
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

  const openPost = useCallback(
    async (id: string) => {
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
    },
    [applyPostToForm, router]
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
  }, [openPost, requestedPostId]);

  const updateField = useCallback(
    <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const {
    uploading,
    textareaRef,
    fileInputRef,
    handlePasteImage,
    handleSelectFiles,
  } = useColumnEditorMarkdownMedia({
    setForm,
    setError,
    setNotice,
  });

  const {
    saving,
    publishing,
    deleting,
    devSaving,
    publishBlockReason,
    handleSave,
    handlePublish,
    handleDelete,
    handleSaveToWorkspace,
  } = useColumnEditorPostActions({
    allowDevFileSave,
    form,
    activeStatus,
    selectedId,
    applyPostToForm,
    loadPosts,
    resetEditor,
    setActiveStatus,
    setSelectedId,
    setSlugEdited,
    setError,
    setNotice,
  });

  const canMutate = !saving && !publishing && !deleting && !loadingDetail;
  const isBusy =
    deleting || publishing || saving || uploading || devSaving || loadingDetail || loadingList;

  const busyOverlayMessage = useMemo(() => {
    if (deleting) return "게시글을 삭제하고 있어요.";
    if (publishing) return "게시글 발행 상태를 변경하고 있어요.";
    if (saving) return "게시글을 저장하고 있어요.";
    if (uploading) return "이미지를 업로드하고 있어요.";
    if (devSaving) return "개발용 파일을 저장하고 있어요.";
    if (loadingDetail) return "게시글 상세 내용을 불러오고 있어요.";
    if (loadingList) return "게시글 목록을 불러오고 있어요.";
    return "";
  }, [deleting, devSaving, loadingDetail, loadingList, publishing, saving, uploading]);

  return {
    busyOverlayMessage,
    error,
    notice,
    isBusy,
    sidebarProps: {
      search,
      statusFilter,
      loadingList,
      posts,
      selectedId,
      onCreateNew: resetEditor,
      onSearchChange: setSearch,
      onStatusFilterChange: setStatusFilter,
      onSearchSubmit: () => void loadPosts({ keepSelection: true }),
      onOpenPost: (id: string) => void openPost(id),
      formatDateTime,
    },
    workspaceProps: {
      selectedId,
      selectedPostTitle: selectedPost?.title || null,
      activeStatus,
      updatedAt,
      publishedAt,
      editorTab,
      form,
      slugEdited,
      canMutate,
      uploading,
      publishing,
      deleting,
      allowDevFileSave,
      devSaving,
      publishBlockReason,
      textareaRef,
      fileInputRef,
      onEditorTabChange: setEditorTab,
      onTitleChange: (value: string) => updateField("title", value),
      onAutoSlugChange: (value: string) => updateField("slug", value),
      onSlugChange: (value: string) => {
        updateField("slug", value);
        setSlugEdited(value.trim().length > 0);
      },
      onTagsChange: (value: string) => updateField("tags", value),
      onCoverImageUrlChange: (value: string) => updateField("coverImageUrl", value),
      onExcerptChange: (value: string) => updateField("excerpt", value),
      onAuthorNameChange: (value: string) => updateField("authorName", value),
      onContentMarkdownChange: (value: string) => updateField("contentMarkdown", value),
      onPasteImage: (event: ClipboardEvent<HTMLTextAreaElement>) => void handlePasteImage(event),
      onSelectFiles: (event: ChangeEvent<HTMLInputElement>) => void handleSelectFiles(event),
      onSaveDraft: () => void handleSave(),
      onPublish: () => void handlePublish(true),
      onUnpublish: () => void handlePublish(false),
      onDelete: () => void handleDelete(),
      onSaveToWorkspace: () => void handleSaveToWorkspace(),
      formatDateTime,
      slugify,
      estimateReadingMinutes,
    },
  };
}
