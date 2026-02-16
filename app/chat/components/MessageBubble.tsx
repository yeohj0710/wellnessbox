"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types/chat";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";

export default function MessageBubble({
  role,
  content,
}: {
  role: ChatMessage["role"];
  content: string;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const loadingHints = useMemo(
    () => [
      "맞춤 영양 분석을 정리하고 있어요.",
      "복용 패턴과 주의 포인트를 교차 확인 중이에요.",
      "가까운 실구매 옵션까지 함께 계산하고 있어요.",
    ],
    []
  );

  const normalizeNewlines = (text: string) =>
    (text || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([^\n])\n([ \t]*([-*+]\s|\d+\.\s))/g, "$1\n\n$2");
  const text = useMemo(() => normalizeNewlines(content || ""), [content]);
  const multiline = text.includes("\n");

  useEffect(() => {
    if (isUser || text) return;
    setLoadingHintIndex(0);
    const timer = window.setInterval(() => {
      setLoadingHintIndex((prev) => (prev + 1) % loadingHints.length);
    }, 1700);
    return () => window.clearInterval(timer);
  }, [isUser, loadingHints.length, text]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div
      className={`group/message flex w-full px-2 ${
        isUser ? "justify-end" : "justify-start"
      }`}
      style={{
        fontFamily:
          'Inter, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {isUser ? (
        <div
          className="relative max-w-[86%] sm:max-w-[74%] md:max-w-[70%] rounded-[18px] bg-[#f7f7f8] px-4 py-2 text-[13px] sm:text-[14px] leading-[1.65] font-normal antialiased text-slate-800 shadow-none data-[multiline]:py-3.5 tracking-[-0.005em]"
          data-multiline={multiline ? "true" : undefined}
        >
          <div className="whitespace-pre-wrap break-all">{text}</div>
        </div>
      ) : (
        <div className="relative antialiased tracking-[-0.005em]">
          {text ? (
            <div
              className={`
                prose prose-slate max-w-none text-slate-800 leading-[1.75]
                [&>p]:my-[0.35rem] [&>p]:text-[13px] sm:[&>p]:text-[14px]
                [&_li]:text-[13px] sm:[&_li]:text-[14px]
                [&_strong]:font-semibold
                [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-[1.02em]
                [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.02em]
                [&>*]:break-words [&>*]:break-keep
                [&_table]:w-full [&_table]:my-2
              `}
            >
              <ReactMarkdown
                remarkPlugins={[
                  [remarkGfm, { singleTilde: false }],
                  remarkBreaks,
                ]}
                rehypePlugins={[
                  rehypeRaw,
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: "wrap" }],
                  [
                    rehypeExternalLinks,
                    {
                      target: "_blank",
                      rel: ["nofollow", "noopener", "noreferrer"],
                    },
                  ],
                  rehypeHighlight,
                ]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1
                      className="mt-3 mb-1.5 text-[1.02em] font-semibold"
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="mt-3 mb-1.5 text-[1.02em] font-semibold"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className="mt-3 mb-1 text-[1.0em] font-semibold"
                      {...props}
                    />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4
                      className="mt-2 mb-1 text-[0.98em] font-semibold"
                      {...props}
                    />
                  ),
                  p: ({ node, ...props }) => (
                    <p
                      className="my-[0.35rem] text-[13px] sm:text-[14px] leading-[1.7]"
                      {...props}
                    />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-400"
                      {...props}
                    />
                  ),
                  img: ({ node, ...props }) => {
                    const src =
                      typeof props.src === "string" ? props.src : "";
                    const alt =
                      typeof props.alt === "string" ? props.alt : "";
                    const width =
                      typeof props.width === "number"
                        ? props.width
                        : Number(props.width);
                    const height =
                      typeof props.height === "number"
                        ? props.height
                        : Number(props.height);
                    const hasDimensions =
                      Number.isFinite(width) &&
                      width > 0 &&
                      Number.isFinite(height) &&
                      height > 0;
                    const remoteHost = (() => {
                      if (!src.startsWith("https://")) return "";
                      try {
                        return new URL(src).hostname;
                      } catch {
                        return "";
                      }
                    })();
                    const canUseNextImage =
                      hasDimensions &&
                      (src.startsWith("/") || remoteHost === "imagedelivery.net");

                    if (!src || !canUseNextImage) {
                      const fallbackClassName = [
                        "my-2 rounded-lg border border-slate-200",
                        typeof props.className === "string"
                          ? props.className
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <img
                          src={src}
                          className={fallbackClassName}
                          alt={alt}
                          loading="lazy"
                          {...props}
                        />
                      );
                    }

                    return (
                      <Image
                        src={src}
                        alt={alt}
                        width={width}
                        height={height}
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="my-2 h-auto w-full rounded-lg border border-slate-200"
                      />
                    );
                  },
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="my-2 border-slate-200 border-l-4 ps-3 italic text-slate-600"
                      {...props}
                    />
                  ),
                  hr: () => <hr className="my-3 border-slate-200" />,
                  ul: ({ node, ...props }) => (
                    <ul
                      className="list-disc ms-5 my-2 marker:text-slate-400"
                      {...props}
                    />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol
                      className="list-decimal ms-5 my-2 marker:text-slate-400"
                      {...props}
                    />
                  ),
                  li: ({ node, ...props }) => (
                    <li
                      className="text-[13px] sm:text-[14px] leading-[1.6]"
                      {...props}
                    />
                  ),
                  table: ({ node, ...props }) => (
                    <table className="w-full my-2 border-collapse" {...props} />
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-slate-50" {...props} />
                  ),
                  tbody: ({ node, ...props }) => <tbody {...props} />,
                  th: ({ node, ...props }) => (
                    <th
                      className="border border-slate-200 px-3 py-1.5 text-left font-semibold"
                      {...props}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      className="border border-slate-200 px-3 py-1.5 align-top"
                      {...props}
                    />
                  ),
                  code: ({ inline, className, children, ...props }: any) => {
                    const lang = /language-(\w+)/.exec(className || "")?.[1];
                    if (inline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[0.92em]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="my-2 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto p-3">
                        <code
                          className={`hljs ${
                            className || (lang ? `language-${lang}` : "")
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  input: ({ node, ...props }) => (
                    <input className="me-2 align-middle" disabled {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold" {...props} />
                  ),
                  del: ({ node, ...props }) => (
                    <span {...props} style={{ textDecoration: "none" }} />
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="w-full max-w-[86%] sm:max-w-[74%] md:max-w-[70%] rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                </span>
                <p className="text-[12px] font-semibold text-slate-700">
                  {loadingHints[loadingHintIndex]}
                </p>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-sky-400 to-slate-500 animate-[wb-loading-sweep_1.2s_ease-in-out_infinite]" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-2.5 w-11/12 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          )}
          {text && (
            <div className="relative">
              <div className="-mt-1 -ms-2.5 -me-1 flex flex-wrap items-center gap-y-1 p-1 select-none pointer-events-none opacity-0 [mask-image:linear-gradient(to_right,black_33%,transparent_66%)] [mask-size:300%_100%] [mask-position:100%_0%] motion-safe:transition-[mask-position,opacity] duration-300 group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-hover/message:[mask-position:0_0] absolute w-full">
                <button
                  onClick={handleCopy}
                  className="text-slate-500 hover:bg-slate-100 rounded-lg"
                  aria-label="복사"
                >
                  <span className="flex items-center justify-center h-8 w-8">
                    {copied ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes wb-breathe {
          0% {
            transform: scale(0.85);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.7;
          }
        }
        @keyframes wb-loading-sweep {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </div>
  );
}
