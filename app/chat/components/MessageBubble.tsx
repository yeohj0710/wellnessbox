"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types/chat";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

export default function MessageBubble({
  role,
  content,
}: {
  role: ChatMessage["role"];
  content: string;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const normalizeNewlines = (text: string) => text.replace(/\n{3,}/g, "\n\n");
  const text = useMemo(() => normalizeNewlines(content || ""), [content]);
  const multiline = text.includes("\n");

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
        <div className="antialiased tracking-[-0.005em]">
          {text ? (
            <div
              className={`
                prose prose-slate max-w-none whitespace-pre-wrap text-slate-800 leading-[1.75]
                [&>p]:my-[0.35rem] [&>p]:text-[13px] sm:[&>p]:text-[14px]
                [&_li]:text-[13px] sm:[&_li]:text-[14px]
                [&_strong]:font-semibold
                [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-[1.02em]
                [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.02em]
                [&>*]:break-words [&>*]:break-keep
              `}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }) => (
                    <p
                      className="my-[0.35rem] text-[13px] sm:text-[14px] leading-[1.7]"
                      {...props}
                    />
                  ),
                  li: ({ node, ...props }) => (
                    <li
                      className="text-[13px] sm:text-[14px] leading-[1.6]"
                      {...props}
                    />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold" {...props} />
                  ),
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
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-black animate-[wb-breathe_1.1s_ease-in-out_infinite]" />
            </span>
          )}
          {text && (
            <div className="relative">
              <div className="-mt-2 -ms-2.5 -me-1 flex flex-wrap items-center gap-y-1 p-1 select-none pointer-events-none opacity-0 [mask-image:linear-gradient(to_right,black_33%,transparent_66%)] [mask-size:300%_100%] [mask-position:100%_0%] motion-safe:transition-[mask-position,opacity] duration-300 group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-hover/message:[mask-position:0_0] absolute w-full">
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
      `}</style>
    </div>
  );
}
