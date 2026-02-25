import type {
  ApiDetailResponse,
  ApiListResponse,
  CloudflareUploadResponse,
  EditorUpsertPayload,
  PostListFilterStatus,
  UploadUrlResponse,
} from "./types";

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

export async function fetchAdminColumnPosts(params: {
  search: string;
  statusFilter: PostListFilterStatus;
}) {
  const query = new URLSearchParams();
  if (params.search.trim()) {
    query.set("q", params.search.trim());
  }
  query.set("status", params.statusFilter === "all" ? "all" : params.statusFilter);

  const data = await requestJson<ApiListResponse>(`/api/admin/column/posts?${query.toString()}`);
  return data.posts ?? [];
}

export async function fetchAdminColumnPost(postId: string) {
  const data = await requestJson<ApiDetailResponse>(`/api/admin/column/posts/${postId}`);
  if (!data.post) {
    throw new Error("게시글을 찾을 수 없습니다.");
  }
  return data.post;
}

export async function upsertAdminColumnPost(input: {
  postId: string | null;
  payload: EditorUpsertPayload;
  status: "draft" | "published";
}) {
  const endpoint = input.postId ? `/api/admin/column/posts/${input.postId}` : "/api/admin/column/posts";
  const method = input.postId ? "PATCH" : "POST";
  const data = await requestJson<ApiDetailResponse>(endpoint, {
    method,
    body: JSON.stringify({
      ...input.payload,
      status: input.status,
    }),
  });

  if (!data.post) {
    throw new Error("저장 결과 게시글을 확인할 수 없습니다.");
  }
  return data.post;
}

export async function publishAdminColumnPost(input: { postId: string; publish: boolean }) {
  const data = await requestJson<ApiDetailResponse>(
    `/api/admin/column/posts/${input.postId}/publish`,
    {
      method: "POST",
      body: JSON.stringify({ publish: input.publish }),
    }
  );

  if (!data.post) {
    throw new Error("상태 변경 결과 게시글을 확인할 수 없습니다.");
  }
  return data.post;
}

export async function deleteAdminColumnPost(postId: string) {
  await requestJson<{ ok: boolean }>(`/api/admin/column/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function saveAdminColumnMarkdownFile(input: { slug: string; markdown: string }) {
  return requestJson<{ ok: boolean; path?: string }>("/api/column/editor/save", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function uploadImageToCloudflare(file: File) {
  const uploadURL = await issueDirectUploadUrl();
  const formData = new FormData();
  formData.append("file", file);

  const uploadResponse = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });

  const uploadJson = (await uploadResponse.json().catch(() => ({}))) as CloudflareUploadResponse;
  if (!uploadResponse.ok || !uploadJson.success) {
    const message = uploadJson.errors?.[0]?.message || "Cloudflare 업로드에 실패했습니다.";
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
