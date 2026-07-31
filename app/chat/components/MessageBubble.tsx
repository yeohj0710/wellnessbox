"use client";

import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import AutoDismissTimerBar from "@/components/common/AutoDismissTimerBar";
import type { ChatMessage, ChatMessageStatus } from "@/types/chat";
import { normalizeMessageText } from "./messageBubble.format";
import {
  createMessageBubbleMarkdownComponents,
  getMessageBubbleRehypePlugins,
  getMessageBubbleRemarkPlugins,
} from "./messageBubble.markdown";
import {
  MessageErrorCard,
  MessageLoadingCard,
  MessageStoppedFooter,
} from "./messageBubble.states";

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
  status,
  onRetry,
  retrying = false,
}: {
  role: ChatMessage["role"];
  content: string;
  loadingContextText?: string;
  status?: ChatMessageStatus;
  onRetry?: () => void;
  retrying?: boolean;
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
  const isError = !isUser && status === "error";
  const isStopped = !isUser && status === "stopped" && Boolean(text);

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
          {/* break-keep keeps Korean phrases whole; break-words only kicks in
              for a token too long to fit, instead of chopping every line. */}
          <div className="whitespace-pre-wrap break-keep break-words">
            {text}
          </div>
        </div>
      ) : (
        <div className="relative antialiased tracking-[-0.005em]">
          {isError ? (
            <MessageErrorCard
              message={text || "답변을 받아오지 못했어요."}
              onRetry={onRetry}
              retrying={retrying}
            />
          ) : text ? (
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
            <MessageLoadingCard hint={loadingHint} />
          )}

          {isStopped ? (
            <MessageStoppedFooter onRetry={onRetry} retrying={retrying} />
          ) : null}

          {text && !isError ? (
            /* Pointer devices reveal the toolbar on hover. Touch devices have
               no hover, so there it stays visible - otherwise copy is
               unreachable on mobile, which is most of this service's traffic. */
            <div className="mt-0.5 h-10 opacity-100 transition-opacity duration-200 [@media(hover:hover)]:h-0 [@media(hover:hover)]:overflow-hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/message:mt-0.5 [@media(hover:hover)]:group-hover/message:h-10 [@media(hover:hover)]:group-hover/message:opacity-100 [@media(hover:hover)]:group-focus-within/message:h-10 [@media(hover:hover)]:group-focus-within/message:opacity-100">
              <div className="-ms-2.5 -me-1 flex flex-wrap items-center gap-y-1 p-1 select-none">
                <div className="relative">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  aria-label={copied ? "답변이 복사됨" : "답변 복사"}
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
