export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type ColumnSummary = {
  postId: string | null;
  slug: string;
  title: string;
  description: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  coverImageUrl: string | null;
  updatedAt: string;
  readingMinutes: number;
  draft: boolean;
};

export type ColumnDetail = ColumnSummary & {
  content: string;
  toc: TocItem[];
  legacySlugs: string[];
};

export type ColumnTag = {
  label: string;
  slug: string;
  count: number;
};
