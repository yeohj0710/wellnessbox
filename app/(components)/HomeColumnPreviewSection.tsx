import Link from "next/link";
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
    .split(/(?<=[.!\u003F다요])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return chunks.slice(0, 2).join(" ");
}

function buildAsideText(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 110) return trimmed;
  return `${trimmed.slice(0, 108).trim()}…`;
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
  const featuredAside = buildAsideText(featured.description || featured.summary || "");

  return (
    <section className="w-full bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_52%,#ffffff_100%)] pb-8 pt-6 sm:pb-10 sm:pt-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(255,253,248,0.96)_100%)] px-6 py-6 shadow-[0_30px_60px_-46px_rgba(23,32,51,0.22)] ring-1 ring-[#e6ebf5] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4960e8]">
                WELLNESS COLUMN
              </p>
              <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.05em] text-[#172033] sm:text-[2.15rem]">
                상품을 둘러본 뒤 잠깐 쉬어 읽기 좋은 칼럼
              </h2>
              <p className="mt-3 max-w-[40rem] text-sm leading-7 text-[#5f6878] sm:text-[15px]">
                복용 팁, 생활 습관, 성분 포인트처럼 바로 도움이 되는 내용만 골라서
                아래에 짧게 이어두었어요.
              </p>
            </div>

            <Link
              href="/column"
              className="inline-flex w-fit items-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#172033] ring-1 ring-[#dde4dc] transition duration-300 hover:-translate-y-0.5 hover:bg-[#eef2ff] hover:text-[#4960e8]"
            >
              칼럼 전체 보기
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
            <Link
              href={`/column/${featured.slug}`}
              className="group rounded-[1.9rem] bg-white/96 px-5 py-5 ring-1 ring-[#e3e8df] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-34px_rgba(23,32,51,0.18)] sm:px-6 sm:py-6"
            >
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
              </div>

              <h3 className="mt-4 text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-[1.8rem]">
                {featured.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#5f6878] sm:text-[15px]">
                {featured.description}
              </p>

              {featuredAside ? (
                <div className="mt-5 rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(238,242,255,0.96),rgba(248,250,252,0.92))] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4960e8]">
                    미리 읽기
                  </p>
                  <p className="mt-2 text-[15px] leading-7 text-[#334155]">
                    {featuredAside}
                  </p>
                </div>
              ) : null}

              {featuredPreview ? (
                <p className="mt-5 border-t border-[#e5eadf] pt-5 text-sm leading-7 text-[#455062] group-hover:text-[#334155]">
                  {featuredPreview}
                </p>
              ) : null}
            </Link>

            <div className="grid gap-4">
              {secondary.map((column, index) => (
                <Link
                  key={column.slug}
                  href={`/column/${column.slug}`}
                  className="group rounded-[1.55rem] bg-[linear-gradient(180deg,#fcfcfa_0%,#f8fbff_100%)] px-5 py-5 ring-1 ring-[#e4e8df] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_34px_-30px_rgba(23,32,51,0.16)]"
                >
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
                  <h3 className="mt-3 text-base font-semibold leading-7 text-[#172033]">
                    {column.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f6878] group-hover:text-[#455062]">
                    {column.summary || column.description}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#4960e8]">
                    이어서 읽기
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
