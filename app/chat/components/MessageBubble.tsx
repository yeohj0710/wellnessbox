"use client";

import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import AutoDismissTimerBar from "@/components/common/AutoDismissTimerBar";
import type { ChatMessage } from "@/types/chat";
import { normalizeMessageText } from "./messageBubble.format";
import {
  createMessageBubbleMarkdownComponents,
  getMessageBubbleRehypePlugins,
  getMessageBubbleRemarkPlugins,
} from "./messageBubble.markdown";

const COPY_FEEDBACK_AUTO_HIDE_MS = 1500;

function buildLoadingHint(contextText: string) {
  const source = contextText.trim();
  const sourceLower = source.toLowerCase();

  const isActionIntent =
    /(장바구니|주문|구매|결제|열어|가기|이동|페이지|화면)/.test(source) ||
    /(cart|order|buy|checkout|open|move|page|screen|profile)/.test(sourceLower);
  const isRecommendationIntent =
    /(추천|영양|분석|진단|성분|상품|패키지|카테고리)/.test(source) ||
    /(recommend|nutrition|analysis|supplement|product|package|category)/.test(
      sourceLower
    );

  if (isActionIntent) {
    return "요청하신 동작을 확인하고 있어요.";
  }

  if (isRecommendationIntent) {
    return "조건에 맞는 내용을 정리하고 있어요.";
  }

  return "답변을 정리하고 있어요.";
}

export default function MessageBubble({
  role,
  content,
  loadingContextText = "",
}: {
  role: ChatMessage["role"];
  content: string;
  loadingContextText?: string;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const loadingHint = useMemo(
    () => buildLoadingHint(loadingContextText),
    [loadingContextText]
  );
  const remarkPlugins = useMemo(() => getMessageBubbleRemarkPlugins(), []);
  const rehypePlugins = useMemo(() => getMessageBubbleRehypePlugins(), []);
  const markdownComponents = useMemo(
    () => createMessageBubbleMarkdownComponents(isOnline),
    [isOnline]
  );

  const text = useMemo(() => normalizeMessageText(content || ""), [content]);
  const multiline = text.includes("\n");

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
      setTimeout(() => setCopied(false), COPY_FEEDBACK_AUTO_HIDE_MS);
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
          className="relative max-w-[86%] rounded-[18px] bg-[#f7f7f8] px-4 py-2 text-[13px] font-normal leading-[1.65] tracking-[-0.005em] text-slate-800 shadow-none antialiased data-[multiline]:py-3.5 sm:max-w-[74%] sm:text-[14px] md:max-w-[70%]"
          data-multiline={multiline ? "true" : undefined}
        >
          <div className="whitespace-pre-wrap break-all">{text}</div>
        </div>
      ) : (
        <div className="relative antialiased tracking-[-0.005em]">
          {text ? (
            <div
              className={`
                prose prose-slate max-w-none leading-[1.75] text-slate-800
                [&>*]:break-keep [&>*]:break-words
                [&>p]:my-[0.35rem] [&>p]:text-[13px]
                [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-[1.02em]
                [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-[1.02em]
                [&_li]:text-[13px]
                [&_strong]:font-semibold
                [&_table]:my-2 [&_table]:w-full
                sm:[&>p]:text-[14px] sm:[&_li]:text-[14px]
              `}
            >
              <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
              >
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="w-full max-w-[min(92vw,31rem)] rounded-[1.35rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-4 py-3.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.24)] sm:max-w-[28rem] sm:px-4.5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 ring-1 ring-sky-100">
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
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600">
                    Loading
                  </p>
                  <p className="mt-1 min-w-0 text-pretty break-keep text-[13px] font-medium leading-6 text-slate-700 sm:text-[14px]">
                    {loadingHint}
                  </p>
                </div>
              </div>
            </div>
          )}
          {text ? (
            <div className="h-0 overflow-hidden opacity-0 transition-[height,opacity,margin] duration-200 group-hover/message:mt-0.5 group-hover/message:h-10 group-hover/message:opacity-100">
              <div className="-ms-2.5 -me-1 flex flex-wrap items-center gap-y-1 p-1 select-none pointer-events-none group-hover/message:pointer-events-auto">
                <div className="relative">
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
                  {copied ? (
                    <div className="absolute left-10 top-1/2 w-28 -translate-y-1/2 rounded-xl border border-emerald-200 bg-white px-2 py-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                      <p className="text-[10px] font-semibold text-emerald-700">
                        복사됨
                      </p>
                      <AutoDismissTimerBar
                        durationMs={COPY_FEEDBACK_AUTO_HIDE_MS}
                        className="mt-1"
                        showCountdown={false}
                        trackClassName="bg-emerald-100"
                        barClassName="bg-gradient-to-r from-emerald-400 to-teal-400"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
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
