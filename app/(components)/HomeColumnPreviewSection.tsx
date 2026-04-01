import Link from "next/link";
import ColumnThumbnail from "@/app/column/_components/ColumnThumbnail";
import { getAllColumnSummaries } from "@/app/column/_lib/columns";

function formatPublishedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function buildPreviewText(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const chunks = trimmed
    .split(/(?<=[.!?\u003F요])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return chunks.slice(0, 2).join(" ");
}

function buildAsideText(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 110) return trimmed;
  return `${trimmed.slice(0, 108).trim()}...`;
}

export default async function HomeColumnPreviewSection() {
  const columns = (await getAllColumnSummaries()).slice(0, 4);

  if (columns.length === 0) {
    return null;
  }

  const [featured, ...secondary] = columns;
  const featuredPreview = buildPreviewText(
    featured.summary || featured.description || ""
  );
  const featuredAside = buildAsideText(
    featured.description || featured.summary || ""
  );

  return (
    <section className="w-full bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_52%,#ffffff_100%)] pb-8 pt-6 sm:pb-10 sm:pt-8">
      <div className="w-full max-w-[640px] mx-auto px-4">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(255,253,248,0.96)_100%)] px-5 py-6 shadow-[0_30px_60px_-46px_rgba(23,32,51,0.18)] ring-1 ring-[#e6ebf5] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4960e8]">
                WELLNESS COLUMN
              </p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.05em] text-[#172033] sm:text-[2rem]">
                상품을 둘러본 뒤 잠깐 쉬어 읽기 좋은 칼럼
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6878] sm:text-[15px]">
                복용 팁, 생활 습관, 성분 포인트처럼 바로 도움이 되는 내용만 골라
                짧고 편하게 이어두었어요.
              </p>
            </div>

            <Link
              href="/column"
              className="inline-flex w-fit items-center rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-[#172033] ring-1 ring-[#dde4dc] transition duration-300 hover:-translate-y-0.5 hover:bg-[#eef2ff] hover:text-[#4960e8]"
            >
              칼럼 전체 보기
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            <Link
              href={`/column/${featured.slug}`}
              className="group block overflow-hidden rounded-[1.75rem] border border-[#dfe6f1] bg-white/96 p-4 shadow-[0_22px_44px_-36px_rgba(23,32,51,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_-36px_rgba(23,32,51,0.28)] sm:p-5"
            >
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#718093]">
                    <span className="rounded-full bg-[#172033] px-2.5 py-1 font-semibold tracking-[0.14em] text-white">
                      FEATURED
                    </span>
                    <span>{featured.readingMinutes}분 읽기</span>
                    {formatPublishedAt(featured.publishedAt) ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-[#c8d0db]" />
                        <span>{formatPublishedAt(featured.publishedAt)}</span>
                      </>
                    ) : null}
                    {featured.tags[0] ? (
                      <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 font-semibold text-[#4960e8]">
                        {featured.tags[0]}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 max-w-none text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:max-w-[16ch] sm:text-[1.85rem]">
                    {featured.title}
                  </h3>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5f6878] sm:line-clamp-3 sm:text-[15px]">
                    {featured.description}
                  </p>

                  {featuredAside ? (
                    <div className="mt-5 max-w-3xl rounded-[1.25rem] bg-[linear-gradient(135deg,rgba(238,242,255,0.96),rgba(248,250,252,0.92))] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4960e8]">
                        미리 읽기
                      </p>
                      <p className="mt-2 text-[15px] leading-7 text-[#334155]">
                        {featuredAside}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5eadf] pt-5">
                    <p className="line-clamp-2 min-w-0 text-sm leading-7 text-[#455062] group-hover:text-[#334155]">
                      {featuredPreview || featured.summary || featured.description}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-[#4960e8]">
                      이어서 읽기
                    </span>
                  </div>
                </div>

                <div className="self-start overflow-hidden rounded-[1.35rem] border border-[#dfe6f1] bg-white/90 shadow-[0_20px_38px_-34px_rgba(23,32,51,0.28)]">
                  <ColumnThumbnail
                    slug={featured.slug}
                    title={featured.title}
                    tags={featured.tags}
                    coverImageUrl={featured.coverImageUrl}
                    alt={`${featured.title} 대표 이미지`}
                    variant="feature"
                  />
                </div>
              </div>
            </Link>

            {secondary.map((column, index) => (
              <Link
                key={column.slug}
                href={`/column/${column.slug}`}
                className="group block overflow-hidden rounded-[1.55rem] border border-[#e1e7f0] bg-[linear-gradient(180deg,#fcfcfa_0%,#f8fbff_100%)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#d4def7] hover:bg-white hover:shadow-[0_20px_36px_-32px_rgba(23,32,51,0.18)] sm:p-5"
              >
                <div className="grid gap-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-start">
                  <div className="self-start overflow-hidden rounded-[1.2rem] border border-[#dfe6f1] bg-white/90">
                    <ColumnThumbnail
                      slug={column.slug}
                      title={column.title}
                      tags={column.tags}
                      coverImageUrl={column.coverImageUrl}
                      alt={`${column.title} 대표 이미지`}
                      variant="list"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#718093]">
                      <span className="font-semibold text-[#4d63e0]">
                        PICK {index + 1}
                      </span>
                      <span>{column.readingMinutes}분 읽기</span>
                      {formatPublishedAt(column.publishedAt) ? (
                        <>
                          <span className="h-1 w-1 rounded-full bg-[#c8d0db]" />
                          <span>{formatPublishedAt(column.publishedAt)}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-7 text-[#172033] sm:text-[1.15rem]">
                          {column.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-7 text-[#5f6878] group-hover:text-[#455062]">
                          {column.summary || column.description}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#4960e8] sm:flex-none">
                        이어서 읽기
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
