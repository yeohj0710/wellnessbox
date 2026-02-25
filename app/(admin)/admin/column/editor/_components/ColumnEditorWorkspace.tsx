"use client";

import type { ChangeEvent, ClipboardEvent, RefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ColumnPostStatus, EditorForm, EditorTab } from "../_lib/types";

type ColumnEditorWorkspaceProps = {
  selectedId: string | null;
  selectedPostTitle: string | null;
  activeStatus: ColumnPostStatus;
  updatedAt: string | null;
  publishedAt: string | null;
  editorTab: EditorTab;
  form: EditorForm;
  slugEdited: boolean;
  canMutate: boolean;
  uploading: boolean;
  publishing: boolean;
  deleting: boolean;
  allowDevFileSave: boolean;
  devSaving: boolean;
  publishBlockReason: string | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  onEditorTabChange: (tab: EditorTab) => void;
  onTitleChange: (value: string) => void;
  onAutoSlugChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onCoverImageUrlChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onAuthorNameChange: (value: string) => void;
  onContentMarkdownChange: (value: string) => void;
  onPasteImage: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onSelectFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onSaveToWorkspace: () => void;
  formatDateTime: (value: string | null | undefined) => string;
  slugify: (value: string) => string;
  estimateReadingMinutes: (contentMarkdown: string) => number;
};

export function ColumnEditorWorkspace({
  selectedId,
  selectedPostTitle,
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
  onEditorTabChange,
  onTitleChange,
  onAutoSlugChange,
  onSlugChange,
  onTagsChange,
  onCoverImageUrlChange,
  onExcerptChange,
  onAuthorNameChange,
  onContentMarkdownChange,
  onPasteImage,
  onSelectFiles,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onDelete,
  onSaveToWorkspace,
  formatDateTime,
  slugify,
  estimateReadingMinutes,
}: ColumnEditorWorkspaceProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {selectedId ? "게시글 편집" : "새 게시글 작성"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            상태: {activeStatus === "published" ? "발행" : "초안"} / 최근 저장:{" "}
            {formatDateTime(updatedAt)}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => onEditorTabChange("write")}
            className={`rounded-lg px-3 py-1.5 font-semibold ${
              editorTab === "write" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            편집
          </button>
          <button
            type="button"
            onClick={() => onEditorTabChange("preview")}
            className={`rounded-lg px-3 py-1.5 font-semibold ${
              editorTab === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            미리보기
          </button>
        </div>
      </div>

      {editorTab === "write" ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            제목
            <input
              data-testid="column-editor-title"
              value={form.title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                onTitleChange(nextTitle);
                if (!slugEdited || form.slug.trim().length === 0) {
                  onAutoSlugChange(slugify(nextTitle));
                }
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
              placeholder="게시글 제목"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              slug
              <input
                data-testid="column-editor-slug"
                value={form.slug}
                onChange={(event) => onSlugChange(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="column-post-slug"
              />
              <span className="text-xs font-normal text-slate-500">
                URL에 들어가는 고유 주소입니다. 비우면 제목으로 자동 생성됩니다.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              태그(쉼표 구분)
              <input
                data-testid="column-editor-tags"
                value={form.tags}
                onChange={(event) => onTagsChange(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="오메가3, 복용시간, 건강정보"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              커버 이미지 URL
              <input
                data-testid="column-editor-cover-url"
                value={form.coverImageUrl}
                onChange={(event) => onCoverImageUrlChange(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                placeholder="https://..."
              />
            </label>
            <button
              type="button"
              disabled={uploading || !canMutate}
              onClick={() => fileInputRef.current?.click()}
              className="mt-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
            >
              이미지 업로드
            </button>
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <summary className="cursor-pointer select-none font-semibold text-slate-700">
              선택 입력(요약/작성자)
            </summary>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                요약(excerpt)
                <textarea
                  value={form.excerpt}
                  onChange={(event) => onExcerptChange(event.target.value)}
                  className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="비우면 본문에서 자동 생성됩니다."
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                작성자
                <input
                  value={form.authorName}
                  onChange={(event) => onAuthorNameChange(event.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="관리자명(선택)"
                />
              </label>
            </div>
          </details>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            본문 마크다운
            <textarea
              ref={textareaRef}
              data-testid="column-editor-content"
              value={form.contentMarkdown}
              onChange={(event) => onContentMarkdownChange(event.target.value)}
              onPaste={(event) => void onPasteImage(event)}
              className="min-h-[30rem] rounded-2xl border border-slate-300 px-3 py-2 font-mono text-[0.95rem] leading-7 outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-500">
            읽기 시간 예상: {estimateReadingMinutes(form.contentMarkdown)}분
          </p>
          <article className="prose prose-slate mt-4 max-w-none prose-headings:font-bold prose-h2:mt-8 prose-h3:mt-6 prose-p:leading-7">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.contentMarkdown}</ReactMarkdown>
          </article>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void onSelectFiles(event)}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="column-editor-save-draft"
          disabled={!canMutate}
          onClick={onSaveDraft}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          초안 저장
        </button>
        <button
          type="button"
          data-testid="column-editor-publish"
          disabled={publishBlockReason !== null}
          onClick={onPublish}
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          발행
        </button>
        <button
          type="button"
          data-testid="column-editor-unpublish"
          disabled={!selectedId || publishing}
          onClick={onUnpublish}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-60"
        >
          비공개
        </button>
        <button
          type="button"
          data-testid="column-editor-delete"
          disabled={!selectedId || deleting}
          onClick={onDelete}
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          삭제
        </button>
        {allowDevFileSave ? (
          <button
            type="button"
            disabled={devSaving}
            onClick={onSaveToWorkspace}
            className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
          >
            dev 파일 저장
          </button>
        ) : null}
      </div>
      {publishBlockReason ? (
        <p className="mt-2 text-xs text-amber-700">발행 불가 사유: {publishBlockReason}</p>
      ) : null}

      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <summary className="cursor-pointer select-none font-semibold text-slate-700">
          고급 정보
        </summary>
        <div className="mt-2 space-y-1">
          <p>게시글 ID: {selectedId || "-"}</p>
          <p>발행 시각: {formatDateTime(publishedAt)}</p>
          <p>선택된 목록 행: {selectedPostTitle || "-"}</p>
        </div>
      </details>
    </section>
  );
}
