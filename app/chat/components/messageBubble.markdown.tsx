import Image from "next/image";
import type { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

function resolveRemoteHost(src: string) {
  if (!src.startsWith("https://")) return "";
  try {
    return new URL(src).hostname;
  } catch {
    return "";
  }
}

type MarkdownImageProps = {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  [key: string]: unknown;
};

function toPositiveNumber(value: unknown) {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function renderMarkdownImage(props: MarkdownImageProps, isOnline: boolean) {
  const src = typeof props.src === "string" ? props.src : "";
  const alt = typeof props.alt === "string" ? props.alt : "";
  const width = toPositiveNumber(props.width);
  const height = toPositiveNumber(props.height);
  const hasDimensions = width != null && height != null;

  const remoteHost = resolveRemoteHost(src);
  const isRemoteImage = Boolean(remoteHost);
  const isSupportedRemote = remoteHost === "imagedelivery.net";
  const canUseNextImage = hasDimensions && src.startsWith("/");

  if (!src || !canUseNextImage || (isRemoteImage && !isSupportedRemote)) {
    const fallbackClassName = [
      "my-2 rounded-lg border border-slate-200",
      typeof props.className === "string" ? props.className : "",
    ]
      .filter(Boolean)
      .join(" ");
    const fallbackSrc = !isOnline && isRemoteImage ? "/placeholder.png" : src;
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
}

export function getMessageBubbleRemarkPlugins(): PluggableList {
  return [[remarkGfm, { singleTilde: false }], remarkBreaks];
}

export function getMessageBubbleRehypePlugins(): PluggableList {
  return [
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
  ];
}

export function createMessageBubbleMarkdownComponents(
  isOnline: boolean
): Components {
  return {
    h1: ({ node, ...props }) => (
      <h1 className="mt-3 mb-1.5 text-[1.02em] font-semibold" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="mt-3 mb-1.5 text-[1.02em] font-semibold" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="mt-3 mb-1 text-[1.0em] font-semibold" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="mt-2 mb-1 text-[0.98em] font-semibold" {...props} />
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
    img: ({ node, ...props }) =>
      renderMarkdownImage(props as MarkdownImageProps, isOnline),
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="my-2 border-slate-200 border-l-4 ps-3 italic text-slate-600"
        {...props}
      />
    ),
    hr: () => <hr className="my-3 border-slate-200" />,
    ul: ({ node, ...props }) => (
      <ul className="list-disc ms-5 my-2 marker:text-slate-400" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal ms-5 my-2 marker:text-slate-400" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="text-[13px] sm:text-[14px] leading-[1.6]" {...props} />
    ),
    table: ({ node, ...props }) => (
      <table className="w-full my-2 border-collapse" {...props} />
    ),
    thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
    tbody: ({ node, ...props }) => <tbody {...props} />,
    th: ({ node, ...props }) => (
      <th
        className="border border-slate-200 px-3 py-1.5 text-left font-semibold"
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td className="border border-slate-200 px-3 py-1.5 align-top" {...props} />
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
            className={`hljs ${className || (lang ? `language-${lang}` : "")}`}
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
    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
    del: ({ node, ...props }) => (
      <span {...props} style={{ textDecoration: "none" }} />
    ),
  };
}
