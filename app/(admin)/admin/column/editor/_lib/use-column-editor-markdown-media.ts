"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { uploadImageToCloudflare } from "./api";
import type { EditorForm } from "./types";

type UseColumnEditorMarkdownMediaOptions = {
  setForm: Dispatch<SetStateAction<EditorForm>>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useColumnEditorMarkdownMedia({
  setForm,
  setError,
  setNotice,
}: UseColumnEditorMarkdownMediaOptions) {
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertSnippetsAtCursor = useCallback(
    (snippets: string[]) => {
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
        contentMarkdown: `${prev.contentMarkdown.slice(0, start)}${block}${prev.contentMarkdown.slice(
          end
        )}`,
      }));

      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + block.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [setForm]
  );

  const uploadFilesAndInsertMarkdown = useCallback(
    async (files: File[], source: string) => {
      if (files.length === 0 || uploading) return;

      setUploading(true);
      setError("");
      setNotice(`${source} 업로드를 시작합니다.`);
      try {
        const snippets = await Promise.all(
          files.map(async (file) => {
            const url = await uploadImageToCloudflare(file);
            const alt = file.name ? file.name.replace(/\.[^.]+$/, "") : "이미지";
            return `![${alt}](${url})`;
          })
        );
        insertSnippetsAtCursor(snippets);
        setNotice(`${source} 업로드를 완료했습니다.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [insertSnippetsAtCursor, setError, setNotice, uploading]
  );

  const handlePasteImage = useCallback(
    async (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      );
      if (!imageItem) return;

      event.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      await uploadFilesAndInsertMarkdown([file], "붙여넣기 이미지");
    },
    [uploadFilesAndInsertMarkdown]
  );

  const handleSelectFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      await uploadFilesAndInsertMarkdown(files, "파일 선택 이미지");
    },
    [uploadFilesAndInsertMarkdown]
  );

  return {
    uploading,
    textareaRef,
    fileInputRef,
    handlePasteImage,
    handleSelectFiles,
  };
}
