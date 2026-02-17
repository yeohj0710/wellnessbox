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

function buildLoadingHints(contextText: string, userTurnCountBefore: number) {
  const source = contextText || "";
  const sourceLower = source.toLowerCase();

  const isActionIntent =
    /(장바구니|주문|구매|결제|열어|열기|이동|프로필)/.test(source) ||
    /(cart|order|buy|checkout|open|move|profile)/.test(sourceLower);
  const isRecommendationIntent =
    /(추천|영양|분석|진단|성분|제품)/.test(source) ||
    /(recommend|nutrition|analysis|supplement|product)/.test(sourceLower);

  if (userTurnCountBefore <= 0) {
    return [
      "상담을 시작할 준비를 하고 있어요.",
      "프로필과 기본 정보를 확인하고 있어요.",
      "곧 상담을 이어서 진행할게요.",
    ];
  }

  if (userTurnCountBefore === 1) {
    if (isActionIntent) {
      return [
        "첫 요청 동작을 준비하고 있어요.",
        "현재 화면 상태를 확인하고 있어요.",
        "곧 실행 결과를 보여드릴게요.",
      ];
    }
    if (isRecommendationIntent) {
      return [
        "첫 맞춤 답변을 준비하고 있어요.",
        "추천 근거를 빠르게 정리하고 있어요.",
        "곧 추천 결과를 보여드릴게요.",
      ];
    }
    return [
      "첫 답변을 준비하고 있어요.",
      "입력한 내용을 기준으로 정리 중이에요.",
      "곧 답변을 보여드릴게요.",
    ];
  }

  if (isActionIntent) {
    return [
      "요청한 동작을 실행할 준비를 하고 있어요.",
      "현재 화면 상태를 확인한 뒤 바로 진행할게요.",
      "실행 결과를 정리해서 곧 보여드릴게요.",
    ];
  }

  if (isRecommendationIntent) {
    return [
      "맞춤 추천 근거를 확인하고 있어요.",
      "섭취 패턴과 주의 포인트를 함께 계산 중이에요.",
      "추천 결과를 보기 쉽게 정리하고 있어요.",
    ];
  }

  return [
    "질문 내용을 이해하고 있어요.",
    "필요한 정보를 모아서 답변을 만들고 있어요.",
    "곧 답변을 보여드릴게요.",
  ];
}

export default function MessageBubble({
  role,
  content,
  loadingContextText = "",
  loadingUserTurnCount = 0,
}: {
  role: ChatMessage["role"];
  content: string;
  loadingContextText?: string;
  loadingUserTurnCount?: number;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const loadingHints = useMemo(
    () => buildLoadingHints(loadingContextText, loadingUserTurnCount),
    [loadingContextText, loadingUserTurnCount]
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

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
                    const src = typeof props.src === "string" ? props.src : "";
                    const alt = typeof props.alt === "string" ? props.alt : "";
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
                    const isRemoteImage = Boolean(remoteHost);
                    const isSupportedRemote =
                      remoteHost === "imagedelivery.net";
                    const canUseNextImage =
                      hasDimensions && src.startsWith("/");

                    if (
                      !src ||
                      !canUseNextImage ||
                      (isRemoteImage && !isSupportedRemote)
                    ) {
                      const fallbackClassName = [
                        "my-2 rounded-lg border border-slate-200",
                        typeof props.className === "string"
                          ? props.className
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const fallbackSrc =
                        !isOnline && isRemoteImage ? "/placeholder.png" : src;
                      return (
                        <img
                          src={fallbackSrc}
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
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.92em] text-slate-800"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-100">
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
            <div
              role="status"
              aria-live="polite"
              className="w-full max-w-[86%] rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:max-w-[74%] md:max-w-[70%]"
            >
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500" />
                  <span
                    className="h-1.5 w-1.5 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500"
                    style={{ animationDelay: "0.18s" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-[wb-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-500"
                    style={{ animationDelay: "0.36s" }}
                  />
                </div>
                <p className="text-[12px] font-medium text-slate-700">
                  {loadingHints[loadingHintIndex]}
                </p>
              </div>
            </div>
          )}
          {text && (
            <div className="h-0 overflow-hidden opacity-0 transition-[height,opacity,margin] duration-200 group-hover/message:mt-0.5 group-hover/message:h-10 group-hover/message:opacity-100">
              <div className="-ms-2.5 -me-1 flex flex-wrap items-center gap-y-1 p-1 select-none pointer-events-none group-hover/message:pointer-events-auto">
                <button
                  onClick={handleCopy}
                  className="rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="복사"
                >
                  <span className="flex h-8 w-8 items-center justify-center">
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
        @keyframes wb-dot {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-2px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
