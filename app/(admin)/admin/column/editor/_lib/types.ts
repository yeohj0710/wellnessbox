export type ColumnPostStatus = "draft" | "published";

export type ColumnPostDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  tags: string[];
  status: ColumnPostStatus;
  publishedAt: string | null;
  authorName: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
};

export type ApiListResponse = {
  ok: boolean;
  posts?: ColumnPostDto[];
  error?: string;
};

export type ApiDetailResponse = {
  ok: boolean;
  post?: ColumnPostDto;
  error?: string;
};

export type UploadUrlResponse = {
  uploadURL?: string;
  error?: string;
};

export type CloudflareUploadResponse = {
  success?: boolean;
  result?: {
    variants?: string[];
  };
  errors?: Array<{ message?: string }>;
};

export type EditorForm = {
  title: string;
  excerpt: string;
  slug: string;
  tags: string;
  authorName: string;
  coverImageUrl: string;
  contentMarkdown: string;
};

export type EditorTab = "write" | "preview";

export type EditorUpsertPayload = {
  title: string;
  excerpt: string;
  slug: string;
  tags: string[];
  authorName: string;
  coverImageUrl?: string;
  contentMarkdown: string;
};

export type PostListFilterStatus = "all" | ColumnPostStatus;

export type EditorAdminClientProps = {
  allowDevFileSave: boolean;
};
