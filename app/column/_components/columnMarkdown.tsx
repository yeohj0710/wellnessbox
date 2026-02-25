import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildHeadingAnchorId } from "../_lib/columns";

function toPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(toPlainText).join(" ");
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return toPlainText(props.children);
  }
  return "";
}

export default function ColumnMarkdown({ content }: { content: string }) {
  const headingIdCounter = new Map<string, number>();

  const resolveHeadingId = (children: ReactNode) => {
    const headingText = toPlainText(children);
    const baseId = buildHeadingAnchorId(headingText) || "section";
    const seen = headingIdCounter.get(baseId) ?? 0;
    headingIdCounter.set(baseId, seen + 1);
    return seen === 0 ? baseId : `${baseId}-${seen}`;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => {
          const id = resolveHeadingId(children);
          return (
            <h2 id={id} className="mt-10 scroll-mt-20 text-2xl font-bold text-slate-900">
              {children}
            </h2>
          );
        },
        h2: ({ children }) => {
          const id = resolveHeadingId(children);
          return (
            <h2 id={id} className="mt-10 scroll-mt-20 text-2xl font-bold text-slate-900">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const id = resolveHeadingId(children);
          return (
            <h3 id={id} className="mt-8 scroll-mt-20 text-xl font-semibold text-slate-900">
              {children}
            </h3>
          );
        },
        p: ({ children }) => (
          <p className="mt-4 text-[1.04rem] leading-8 text-slate-700">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[1.02rem] text-slate-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[1.02rem] text-slate-700">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-8">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mt-6 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50/80 px-4 py-3 text-[1.01rem] text-emerald-900">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => {
          const isExternal = typeof href === "string" && /^https?:\/\//.test(href);
          return (
            <a
              href={href}
              className="underline decoration-emerald-400 decoration-2 underline-offset-4 hover:text-emerald-700"
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
