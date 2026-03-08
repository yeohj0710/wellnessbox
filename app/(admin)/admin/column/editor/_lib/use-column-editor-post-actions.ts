"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  deleteAdminColumnPost,
  publishAdminColumnPost,
  saveAdminColumnMarkdownFile,
  upsertAdminColumnPost,
} from "./api";
import type { ColumnPostDto, ColumnPostStatus, EditorForm } from "./types";
import { buildDevFileMarkdown, buildUpsertPayload, slugify } from "./utils";

type UseColumnEditorPostActionsOptions = {
  allowDevFileSave: boolean;
  form: EditorForm;
  activeStatus: ColumnPostStatus;
  selectedId: string | null;
  applyPostToForm: (post: ColumnPostDto) => void;
  loadPosts: (opts?: { keepSelection?: boolean }) => Promise<void>;
  resetEditor: () => void;
  setActiveStatus: Dispatch<SetStateAction<ColumnPostStatus>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setSlugEdited: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useColumnEditorPostActions({
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
}: UseColumnEditorPostActionsOptions) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [devSaving, setDevSaving] = useState(false);

  const upsertPayload = useMemo(() => buildUpsertPayload(form), [form]);

  const publishBlockReason = useMemo(() => {
    if (publishing) return "발행 처리 중입니다.";
    if (!selectedId) return "먼저 저장해야 발행할 수 있습니다.";
    if (!upsertPayload.title) return "제목을 입력해 주세요.";
    if (!upsertPayload.contentMarkdown.trim()) return "본문을 입력해 주세요.";
    return null;
  }, [publishing, selectedId, upsertPayload.contentMarkdown, upsertPayload.title]);

  const handleSave = useCallback(async () => {
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
      router.replace(`/admin/column/editor?postId=${encodeURIComponent(post.id)}`, {
        scroll: false,
      });
      await loadPosts({ keepSelection: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시글 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [
    activeStatus,
    applyPostToForm,
    loadPosts,
    router,
    selectedId,
    setError,
    setNotice,
    setSelectedId,
    setSlugEdited,
    upsertPayload,
  ]);

  const handlePublish = useCallback(
    async (publish: boolean) => {
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
        setNotice(
          publish ? "게시글을 발행했습니다." : "게시글을 비공개 초안 상태로 전환했습니다."
        );
        await loadPosts({ keepSelection: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "발행 상태 변경에 실패했습니다.");
      } finally {
        setPublishing(false);
      }
    },
    [applyPostToForm, loadPosts, selectedId, setActiveStatus, setError, setNotice]
  );

  const handleDelete = useCallback(async () => {
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
  }, [loadPosts, resetEditor, selectedId, setError, setNotice]);

  const handleSaveToWorkspace = useCallback(async () => {
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
  }, [activeStatus, allowDevFileSave, form, setError, setNotice]);

  return {
    saving,
    publishing,
    deleting,
    devSaving,
    publishBlockReason,
    handleSave,
    handlePublish,
    handleDelete,
    handleSaveToWorkspace,
  };
}
