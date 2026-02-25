"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type EditorForm = {
  title: string;
  description: string;
  slug: string;
  date: string;
  tags: string;
  draft: boolean;
  markdown: string;
};

type UploadUrlResponse = {
  uploadURL?: string;
  error?: string;
};

type CloudflareUploadResponse = {
  success?: boolean;
  result?: {
    variants?: string[];
  };
  errors?: Array<{ message?: string }>;
};

const INITIAL_FORM: EditorForm = {
  title: "",
  description: "",
  slug: "",
  date: new Date().toISOString().slice(0, 10),
  tags: "",
  draft: false,
  markdown: `# 제목을 입력하세요

## 핵심 요약

서문을 먼저 작성하고, 본문을 H2/H3 구조로 정리하세요.

## 함께 읽으면 좋은 글

- [칼럼 목록](/column)

## 참고 자료

- [공신력 출처 링크를 추가하세요](https://example.com)
`,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFrontmatter(form: EditorForm) {
  const normalizedSlug = slugify(form.slug || form.title);
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const lines = [
    "---",
    `title: ${form.title || "제목을 입력하세요"}`,
    `description: ${form.description || "설명을 입력하세요"}`,
    `date: ${form.date || new Date().toISOString().slice(0, 10)}`,
    `draft: ${form.draft ? "true" : "false"}`,
    "tags:",
    ...(tags.length ? tags.map((tag) => `  - ${tag}`) : ["  - 태그"]),
    `slug: ${normalizedSlug || "new-column-slug"}`,
    "---",
    "",
  ];

  return lines.join("\n");
}

async function issueDirectUploadUrl() {
  const response = await fetch("/api/column/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const json = (await response.json().catch(() => ({}))) as UploadUrlResponse;
  if (!response.ok || !json.uploadURL) {
    throw new Error(json.error || "업로드 URL 발급에 실패했습니다.");
  }
  return json.uploadURL;
}

async function uploadImageToCloudflare(file: File) {
  const uploadURL = await issueDirectUploadUrl();
  const formData = new FormData();
  formData.append("file", file);

  const uploadResponse = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });

  const uploadJson = (await uploadResponse.json().catch(() => ({}))) as CloudflareUploadResponse;
  if (!uploadResponse.ok || !uploadJson.success) {
    const message =
      uploadJson.errors?.[0]?.message || "Cloudflare 업로드에 실패했습니다.";
    throw new Error(message);
  }

  const publicVariant = uploadJson.result?.variants?.find((url) =>
    /\/public(?:$|[/?#])/.test(url)
  );
  if (!publicVariant) {
    throw new Error("variants에서 /public URL을 찾지 못했습니다.");
  }

  return publicVariant;
}

export default function EditorClient() {
  const [form, setForm] = useState<EditorForm>(INITIAL_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fullMarkdown = useMemo(
    () => `${buildFrontmatter(form)}${form.markdown.trim()}\n`,
    [form]
  );

  const updateField = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const insertSnippetsAtCursor = (snippets: string[]) => {
    if (snippets.length === 0) return;

    const block = `${snippets.join("\n")}\n`;
    const textarea = textareaRef.current;

    if (!textarea) {
      setForm((prev) => ({
        ...prev,
        markdown: `${prev.markdown.trimEnd()}\n\n${block}`.trimEnd(),
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setForm((prev) => ({
      ...prev,
      markdown: `${prev.markdown.slice(0, start)}${block}${prev.markdown.slice(
        end
      )}`,
    }));

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + block.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const uploadFilesAndInsertMarkdown = async (files: File[], source: string) => {
    if (files.length === 0) return;
    if (isUploading) return;

    setIsUploading(true);
    setStatus(`${source} 업로드를 시작합니다.`);

    try {
      const snippets: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(`${source} 업로드 중... (${index + 1}/${files.length})`);

        const url = await uploadImageToCloudflare(file);
        const alt = file.name ? file.name.replace(/\.[^.]+$/, "") : "이미지";
        snippets.push(`![${alt}](${url})`);
      }

      insertSnippetsAtCursor(snippets);
      setStatus(`${source} 업로드가 완료되었습니다. 마크다운에 삽입했습니다.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteImage = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    );
    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    await uploadFilesAndInsertMarkdown([file], "붙여넣기 이미지");
  };

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadFilesAndInsertMarkdown(files, "파일 선택 이미지");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullMarkdown);
    setStatus("전체 마크다운을 클립보드에 복사했습니다.");
  };

  const handleDownload = () => {
    const blob = new Blob([fullMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${slugify(form.slug || form.title || "new-column")}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
    setStatus("마크다운 파일을 다운로드했습니다.");
  };

  const handleSaveToWorkspace = async () => {
    const normalizedSlug = slugify(form.slug || form.title);
    if (!normalizedSlug) {
      setStatus("저장 전에 제목 또는 slug를 입력하세요.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/column/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: normalizedSlug,
          markdown: fullMarkdown,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        path?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "로컬 파일 저장에 실패했습니다.");
      }
      setStatus(
        `${json.path || "app/column/_content"}에 저장했습니다. 목록 반영을 위해 /column 페이지를 새로고침하세요.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "로컬 파일 저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,_#f8fafc_0%,_#f0fdf4_36%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-600">
            칼럼 편집 도구
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">칼럼 에디터</h1>
          <p className="mt-3 text-slate-700">
            마크다운 작성/미리보기와 이미지 붙여넣기 업로드를 지원합니다.
            이미지는 Cloudflare Direct Upload로 전송한 뒤 `/public` URL을 본문에
            자동 삽입합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/column" className="text-emerald-700 hover:underline">
              칼럼 목록으로 이동
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              기본은 dev 환경 전용이며, 운영에서는 별도 활성화가 필요합니다.
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">작성</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                제목
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="예: 오메가3 복용시간 총정리"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                description (메타 설명)
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="검색 결과에 노출될 설명 문구"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  slug (URL 식별자)
                  <input
                    value={form.slug}
                    onChange={(event) => updateField("slug", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="omega3-after-meal"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  날짜
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => updateField("date", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  태그 (쉼표 구분)
                  <input
                    value={form.tags}
                    onChange={(event) => updateField("tags", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="오메가3, 복용시간, 건강정보"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.draft}
                    onChange={(event) => updateField("draft", event.target.checked)}
                  />
                  draft
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                본문 마크다운
                <textarea
                  ref={textareaRef}
                  value={form.markdown}
                  onChange={(event) => updateField("markdown", event.target.value)}
                  onPaste={handlePasteImage}
                  className="min-h-[26rem] rounded-2xl border border-slate-300 px-3 py-2 font-mono text-[0.95rem] leading-7 outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleSelectFiles}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                이미지 선택 업로드
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                전체 마크다운 복사
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                .md 파일 다운로드
              </button>
              <button
                type="button"
                onClick={handleSaveToWorkspace}
                disabled={isSaving}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                로컬 파일 저장(dev)
              </button>
              {(isUploading || isSaving) && (
                <span className="text-sm text-emerald-700">
                  {isUploading ? "이미지 업로드 중..." : "파일 저장 중..."}
                </span>
              )}
            </div>

            {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">미리보기</h2>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs leading-6 text-slate-100">
              {buildFrontmatter(form)}
            </pre>

            <article className="prose prose-slate mt-5 max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:mt-8 prose-h3:mt-6 prose-p:leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {form.markdown}
              </ReactMarkdown>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}
