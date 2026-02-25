"use client";

import type { ColumnPostDto, PostListFilterStatus } from "../_lib/types";

type ColumnPostListSidebarProps = {
  search: string;
  statusFilter: PostListFilterStatus;
  loadingList: boolean;
  posts: ColumnPostDto[];
  selectedId: string | null;
  onCreateNew: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: PostListFilterStatus) => void;
  onSearchSubmit: () => void;
  onOpenPost: (id: string) => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function ColumnPostListSidebar({
  search,
  statusFilter,
  loadingList,
  posts,
  selectedId,
  onCreateNew,
  onSearchChange,
  onStatusFilterChange,
  onSearchSubmit,
  onOpenPost,
  formatDateTime,
}: ColumnPostListSidebarProps) {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">게시글 목록</h2>
        <button
          type="button"
          data-testid="column-editor-new-post"
          onClick={onCreateNew}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
        >
          새 글
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearchSubmit();
            }
          }}
          placeholder="제목/slug 검색"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as PostListFilterStatus)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            <option value="all">전체</option>
            <option value="draft">초안</option>
            <option value="published">발행</option>
          </select>
          <button
            type="button"
            onClick={onSearchSubmit}
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
                  onClick={() => onOpenPost(post.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedId === post.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{post.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{post.slug}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.status === "published" ? "발행" : "초안"} / {formatDateTime(post.updatedAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
