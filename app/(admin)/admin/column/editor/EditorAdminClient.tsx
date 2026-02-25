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
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ColumnPostDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  authorName: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
};

type ApiListResponse = {
  ok: boolean;
  posts?: ColumnPostDto[];
  error?: string;
};

type ApiDetailResponse = {
  ok: boolean;
  post?: ColumnPostDto;
  error?: string;
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

type EditorForm = {
  title: string;
  excerpt: string;
  slug: string;
  tags: string;
  authorName: string;
  coverImageUrl: string;
  contentMarkdown: string;
};

type Props = {
  allowDevFileSave: boolean;
};

const INITIAL_FORM: EditorForm = {
  title: "",
  excerpt: "",
  slug: "",
  tags: "",
  authorName: "",
  coverImageUrl: "",
  contentMarkdown: `## 제목을 입력하세요

본문을 마크다운으로 작성하세요.
`,
};

function parseTags(text: string) {
  return text
    .split(/[,\n/|]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "요청 처리에 실패했습니다.");
  }
  return data;
}

async function issueDirectUploadUrl() {
  const response = await fetch("/api/column/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
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
    throw new Error("업로드 결과에서 /public URL을 찾지 못했습니다.");
  }

  return publicVariant;
}

export default function EditorAdminClient({ allowDevFileSave }: Props) {
  const [posts, setPosts] = useState<ColumnPostDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [slugEdited, setSlugEdited] = useState(false);

  const [form, setForm] = useState<EditorForm>(INITIAL_FORM);
  const [activeStatus, setActiveStatus] = useState<"draft" | "published">("draft");
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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId]
  );

  const canMutate = !saving && !publishing && !deleting && !loadingDetail;

  const loadPosts = useCallback(
    async (opts?: { keepSelection?: boolean }) => {
      setLoadingList(true);
      try {
        const query = new URLSearchParams();
        if (search.trim()) query.set("q", search.trim());
        if (statusFilter !== "all") query.set("status", statusFilter);
        else query.set("status", "all");

        const data = await requestJson<ApiListResponse>(
          `/api/admin/column/posts?${query.toString()}`
        );
        const nextPosts = data.posts ?? [];
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

  function applyPostToForm(post: ColumnPostDto) {
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      slug: post.slug,
      tags: post.tags.join(", "),
      authorName: post.authorName || "",
      coverImageUrl: post.coverImageUrl || "",
      contentMarkdown: post.contentMarkdown,
    });
    setSlugEdited(true);
    setActiveStatus(post.status);
    setPublishedAt(post.publishedAt);
    setUpdatedAt(post.updatedAt);
  }

  async function openPost(id: string) {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await requestJson<ApiDetailResponse>(`/api/admin/column/posts/${id}`);
      if (!data.post) throw new Error("게시글을 찾을 수 없습니다.");
      setSelectedId(id);
      applyPostToForm(data.post);
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
  }

  const updateField = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const upsertPayload = useMemo(
    () => ({
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      slug: slugify(form.slug || form.title),
      tags: parseTags(form.tags),
      authorName: form.authorName.trim(),
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      contentMarkdown: form.contentMarkdown,
    }),
    [form]
  );

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
      const endpoint = selectedId
        ? `/api/admin/column/posts/${selectedId}`
        : "/api/admin/column/posts";
      const method = selectedId ? "PATCH" : "POST";
      const data = await requestJson<ApiDetailResponse>(endpoint, {
        method,
        body: JSON.stringify({
          ...upsertPayload,
          status: activeStatus,
        }),
      });
      if (!data.post) throw new Error("저장 후 게시글을 확인할 수 없습니다.");

      setSelectedId(data.post.id);
      applyPostToForm(data.post);
      setSlugEdited(true);
      setNotice(selectedId ? "게시글을 수정 저장했습니다." : "새 게시글을 생성했습니다.");
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
      const data = await requestJson<ApiDetailResponse>(
        `/api/admin/column/posts/${selectedId}/publish`,
        {
          method: "POST",
          body: JSON.stringify({ publish }),
        }
      );
      if (!data.post) throw new Error("상태 변경 후 게시글을 확인할 수 없습니다.");
      applyPostToForm(data.post);
      setActiveStatus(data.post.status);
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
      await requestJson<{ ok: boolean }>(`/api/admin/column/posts/${selectedId}`, {
        method: "DELETE",
      });
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
      const frontmatter = [
        "---",
        `title: ${form.title || "제목 없음"}`,
        `description: ${form.excerpt || "설명 없음"}`,
        `date: ${new Date().toISOString().slice(0, 10)}`,
        `draft: ${activeStatus === "draft" ? "true" : "false"}`,
        "tags:",
        ...(parseTags(form.tags).length > 0
          ? parseTags(form.tags).map((tag) => `  - ${tag}`)
          : ["  - 칼럼"]),
        `slug: ${slug}`,
        "---",
        "",
      ].join("\n");
      const markdown = `${frontmatter}${form.contentMarkdown.trim()}\n`;

      const result = await requestJson<{ ok: boolean; path?: string }>(
        "/api/column/editor/save",
        {
          method: "POST",
          body: JSON.stringify({
            slug,
            markdown,
          }),
        }
      );
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
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-600">
            ADMIN COLUMN CMS
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            칼럼 관리자 편집기
          </h1>
          <p className="mt-3 text-slate-700">
            게시글 생성/수정/발행/삭제를 여기서 처리합니다. 공개 페이지는 DB 발행본을 우선
            사용하며, 없으면 파일 기반 칼럼을 fallback으로 제공합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/column" className="text-emerald-700 hover:underline">
              공개 칼럼 보기
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              이미지 업로드는 Cloudflare Direct Upload(`/public`)를 사용합니다.
            </span>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">게시글 목록</h2>
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                새 글
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void loadPosts({ keepSelection: true });
                  }
                }}
                placeholder="제목/slug 검색"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "draft" | "published")
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                >
                  <option value="all">전체</option>
                  <option value="draft">초안</option>
                  <option value="published">발행</option>
                </select>
                <button
                  type="button"
                  onClick={() => void loadPosts({ keepSelection: true })}
                  className="min-w-[68px] shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  조회
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[62vh] overflow-y-auto pr-1">
              {loadingList ? (
                <p className="text-sm text-slate-500">목록을 불러오는 중...</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-slate-500">게시글이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => void openPost(post.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left ${
                          selectedId === post.id
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                          {post.title}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.slug}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {post.status === "published" ? "발행" : "초안"} /{" "}
                          {formatDateTime(post.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {selectedId ? "게시글 편집" : "새 게시글 작성"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              상태: {activeStatus === "published" ? "발행" : "초안"} / 최근 저장:{" "}
              {formatDateTime(updatedAt)}
            </p>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                제목
                <input
                  value={form.title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title: nextTitle,
                      slug:
                        slugEdited && prev.slug.trim().length > 0
                          ? prev.slug
                          : slugify(nextTitle),
                    }));
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="게시글 제목"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                요약(excerpt)
                <textarea
                  value={form.excerpt}
                  onChange={(event) => updateField("excerpt", event.target.value)}
                  className="min-h-20 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                  placeholder="목록/SEO 요약"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  slug
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      const nextSlug = event.target.value;
                      updateField("slug", nextSlug);
                      setSlugEdited(nextSlug.trim().length > 0);
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="column-post-slug"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    공개 URL 경로입니다. 비우면 제목 기준으로 자동 생성됩니다.
                  </span>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  작성자
                  <input
                    value={form.authorName}
                    onChange={(event) => updateField("authorName", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="관리자명(선택)"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  태그(쉼표 구분)
                  <input
                    value={form.tags}
                    onChange={(event) => updateField("tags", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="오메가3, 복용시간, 건강정보"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  커버 이미지 URL
                  <input
                    value={form.coverImageUrl}
                    onChange={(event) => updateField("coverImageUrl", event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-400"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                본문 마크다운
                <textarea
                  ref={textareaRef}
                  value={form.contentMarkdown}
                  onChange={(event) => updateField("contentMarkdown", event.target.value)}
                  onPaste={(event) => void handlePasteImage(event)}
                  className="min-h-[30rem] rounded-2xl border border-slate-300 px-3 py-2 font-mono text-[0.95rem] leading-7 outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => void handleSelectFiles(event)}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading || !canMutate}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
              >
                이미지 업로드
              </button>
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => void handleSave()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                저장
              </button>
              <button
                type="button"
                disabled={publishBlockReason !== null}
                onClick={() => void handlePublish(true)}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                발행
              </button>
              <button
                type="button"
                disabled={!selectedId || publishing}
                onClick={() => void handlePublish(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-60"
              >
                비공개
              </button>
              <button
                type="button"
                disabled={!selectedId || deleting}
                onClick={() => void handleDelete()}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                삭제
              </button>
              {allowDevFileSave ? (
                <button
                  type="button"
                  disabled={devSaving}
                  onClick={() => void handleSaveToWorkspace()}
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
                <p>선택된 목록 행: {selectedPost?.title || "-"}</p>
              </div>
            </details>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">미리보기</h2>
            <p className="mt-1 text-sm text-slate-500">
              읽기 시간 예상: {Math.max(1, Math.ceil(form.contentMarkdown.length / 450))}분
            </p>

            <article className="prose prose-slate mt-4 max-w-none prose-headings:font-bold prose-h2:mt-8 prose-h3:mt-6 prose-p:leading-7">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {form.contentMarkdown}
              </ReactMarkdown>
            </article>
          </section>
        </div>
      </div>
    </section>
  );
}
