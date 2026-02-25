import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ColumnMarkdown from "../_components/columnMarkdown";
import {
  getAdjacentColumnSummaries,
  getAllColumnSummaries,
  getColumnBySlug,
  getRelatedColumnSummaries,
  normalizeTagSlug,
} from "../_lib/columns";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export async function generateStaticParams() {
  const columns = await getAllColumnSummaries();
  return columns.map((column) => ({ slug: column.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const column = await getColumnBySlug(slug);

  if (!column) {
    return {
      title: "칼럼을 찾을 수 없습니다 | 웰니스박스",
      description: "요청하신 웰니스박스 칼럼을 찾지 못했습니다.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${column.title} | 웰니스박스 칼럼`,
    description: column.description,
    alternates: {
      canonical: `/column/${column.slug}`,
    },
    openGraph: {
      title: column.title,
      description: column.description,
      url: `/column/${column.slug}`,
      type: "article",
      locale: "ko_KR",
      publishedTime: column.publishedAt,
      modifiedTime: column.updatedAt,
      tags: column.tags,
    },
  };
}

export default async function ColumnDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const column = await getColumnBySlug(slug);

  if (!column) {
    notFound();
  }

  const [relatedColumns, adjacent] = await Promise.all([
    getRelatedColumnSummaries(column.slug, 3),
    getAdjacentColumnSummaries(column.slug),
  ]);
  const articleUrl = `${SITE_URL}/column/${column.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: column.title,
    description: column.description,
    datePublished: column.publishedAt,
    dateModified: column.updatedAt,
    mainEntityOfPage: articleUrl,
    author: {
      "@type": "Organization",
      name: "웰니스박스",
    },
    publisher: {
      "@type": "Organization",
      name: "웰니스박스",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    keywords: column.tags.join(", "),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "칼럼",
        item: `${SITE_URL}/column`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: column.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[linear-gradient(180deg,_#f8fafc_0%,_#f0fdf4_36%,_#ffffff_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-emerald-700">
                홈
              </Link>
            </li>
            <li aria-hidden>·</li>
            <li>
              <Link href="/column" className="hover:text-emerald-700">
                칼럼
              </Link>
            </li>
            <li aria-hidden>·</li>
            <li className="text-slate-700">{column.title}</li>
          </ol>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.6)] sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <time dateTime={column.publishedAt}>
                  {formatDate(column.publishedAt)}
                </time>
                <span aria-hidden>·</span>
                <span>약 {column.readingMinutes}분</span>
              </div>
              <h1 className="mt-3 text-[1.85rem] font-black leading-tight text-slate-900 sm:text-4xl">
                {column.title}
              </h1>
              <p className="mt-4 text-[1.02rem] leading-7 text-slate-700">
                {column.description}
              </p>
              {column.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {column.tags.map((tag) => (
                    <Link
                      key={`${column.slug}-tag-${tag}`}
                      href={`/column/tag/${normalizeTagSlug(tag)}`}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <ColumnMarkdown content={column.content} />
            </div>

            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm leading-6 text-amber-900">
              <h2 className="font-semibold">안내 및 면책</h2>
              <p className="mt-2">
                이 칼럼은 일반적인 건강 정보 제공을 목적으로 작성되었으며,
                개인의 질병 진단·치료·처방을 대신하지 않습니다. 복용 중인 약이
                있거나 임신·수유 중인 경우, 또는 기저질환이 있다면 제품 섭취 전
                의사 또는 약사와 상담하세요.
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">다음 탐색</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {adjacent.next ? (
                  <Link
                    href={`/column/${adjacent.next.slug}`}
                    className="rounded-2xl border border-slate-200 p-4 hover:border-emerald-300"
                  >
                    <p className="text-xs text-slate-500">더 최신 글</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {adjacent.next.title}
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    더 최신 글이 없습니다.
                  </div>
                )}

                {adjacent.previous ? (
                  <Link
                    href={`/column/${adjacent.previous.slug}`}
                    className="rounded-2xl border border-slate-200 p-4 hover:border-emerald-300"
                  >
                    <p className="text-xs text-slate-500">이전 글</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {adjacent.previous.title}
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    이전 글이 없습니다.
                  </div>
                )}
              </div>
            </section>

            {relatedColumns.length > 0 && (
              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">관련 칼럼</h2>
                <ul className="mt-4 space-y-3">
                  {relatedColumns.map((related) => (
                    <li key={`related-${related.slug}`}>
                      <Link
                        href={`/column/${related.slug}`}
                        className="block rounded-2xl border border-slate-200 p-4 hover:border-emerald-300"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {related.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {related.summary}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-bold tracking-[0.08em] text-slate-600">
              목차
            </h2>
            {column.toc.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">표시할 목차가 없습니다.</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {column.toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                    <a
                      href={`#${item.id}`}
                      className="text-slate-700 hover:text-emerald-700"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </article>
    </section>
  );
}
