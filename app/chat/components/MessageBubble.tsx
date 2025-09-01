"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types/chat";

export default function MessageBubble({
  role,
  content,
}: {
  role: ChatMessage["role"];
  content: string;
}) {
  const isUser = role === "user";

  const normalizeNewlines = (text: string) => text.replace(/\n{3,}/g, "\n\n");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
          isUser
            ? "bg-slate-900 text-white"
            : "bg-white border border-slate-200 text-slate-800"
        }`}
      >
        {content ? (
          isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {normalizeNewlines(content)}
            </div>
          ) : (
            <div className="prose prose-slate max-w-none break-words whitespace-pre-wrap [&>p]:my-1 [&>ul]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeNewlines(content)}
              </ReactMarkdown>
            </div>
          )
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-black animate-[wb-breathe_1.1s_ease-in-out_infinite]" />
          </span>
        )}
      </div>
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
