"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutDocument, LayoutNode } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import {
  REPORT_FONT_STACK,
  REPORT_TEXT_LINE_HEIGHT,
} from "@/lib/b2b/export/render-style";

const MM_TO_PX = 3.7795275591;
const SCALE_MIN = 0.25;

type ReportRendererProps = {
  layout: LayoutDocument | null | undefined;
  fitToWidth?: boolean;
  debugOverlay?: boolean;
  issues?: LayoutValidationIssue[];
  emptyMessage?: string;
  className?: string;
};

type IssueBox = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone: "warn" | "danger";
};

function issueTone(code: LayoutValidationIssue["code"]): "warn" | "danger" {
  if (code === "OVERLAP" || code === "BOUNDS") return "danger";
  return "warn";
}

function issueColor(tone: "warn" | "danger") {
  return tone === "danger"
    ? { border: "#DC2626", bg: "rgba(220, 38, 38, 0.08)", text: "#B91C1C" }
    : { border: "#D97706", bg: "rgba(217, 119, 6, 0.08)", text: "#92400E" };
}

function useContainerMetrics(ref: React.RefObject<HTMLDivElement>) {
  const [metrics, setMetrics] = useState({
    width: 0,
    mmToPx: MM_TO_PX,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.left = "-1000mm";
    probe.style.top = "-1000mm";
    probe.style.width = "100mm";
    probe.style.height = "1px";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.padding = "0";
    probe.style.border = "0";
    document.body.appendChild(probe);

    const update = () => {
      const style = window.getComputedStyle(element);
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const contentWidth = Math.max(0, element.clientWidth - paddingLeft - paddingRight);
      const measuredMmToPx = probe.getBoundingClientRect().width / 100;
      const nextMmToPx =
        Number.isFinite(measuredMmToPx) && measuredMmToPx > 0 ? measuredMmToPx : MM_TO_PX;
      setMetrics((prev) => {
        if (
          Math.abs(prev.width - contentWidth) < 0.1 &&
          Math.abs(prev.mmToPx - nextMmToPx) < 0.01
        ) {
          return prev;
        }
        return {
          width: contentWidth,
          mmToPx: nextMmToPx,
        };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
      probe.remove();
    };
  }, [ref]);

  return metrics;
}

function resolveIssueBoxes(pageId: string, issues: LayoutValidationIssue[]) {
  const boxes: IssueBox[] = [];
  issues.forEach((issue, issueIndex) => {
    if (issue.pageId !== pageId) return;
    const tone = issueTone(issue.code);
    if (issue.nodeBounds) {
      boxes.push({
        key: `${issueIndex}-node`,
        x: issue.nodeBounds.x,
        y: issue.nodeBounds.y,
        w: issue.nodeBounds.w,
        h: issue.nodeBounds.h,
        label: `${issue.code} · ${issue.nodeId ?? "-"}`,
        tone,
      });
    }
    if (issue.relatedNodeBounds) {
      boxes.push({
        key: `${issueIndex}-related`,
        x: issue.relatedNodeBounds.x,
        y: issue.relatedNodeBounds.y,
        w: issue.relatedNodeBounds.w,
        h: issue.relatedNodeBounds.h,
        label: `${issue.code} · ${issue.relatedNodeId ?? "-"}`,
        tone,
      });
    }
  });
  return boxes;
}

function renderNode(node: LayoutNode, debugOverlay: boolean) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${node.x}mm`,
    top: `${node.y}mm`,
    width: `${node.w}mm`,
    height: `${node.h}mm`,
    boxSizing: "border-box",
    overflow: "hidden",
    border: debugOverlay ? "0.25mm dashed rgba(2, 132, 199, 0.6)" : "none",
  };
  if (node.type === "rect") {
    return (
      <div
        key={node.id}
        className="wb-report-node"
        style={{
          ...baseStyle,
          background: `#${node.fill || "FFFFFF"}`,
        }}
      />
    );
  }
  return (
    <div
      key={node.id}
      className="wb-report-node"
      style={{
        ...baseStyle,
        color: `#${node.color || "111827"}`,
        fontSize: `${node.fontSize ?? 12}px`,
        fontWeight: node.bold ? 700 : 400,
        fontFamily: REPORT_FONT_STACK,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
        lineHeight: REPORT_TEXT_LINE_HEIGHT,
        whiteSpace: "pre-wrap",
        wordBreak: "keep-all",
      }}
    >
      {node.text || ""}
    </div>
  );
}

export default function ReportRenderer(props: ReportRendererProps) {
  const {
    layout,
    fitToWidth = true,
    debugOverlay = false,
    issues = [],
    emptyMessage = "레이아웃 데이터가 없습니다.",
    className = "",
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, mmToPx } = useContainerMetrics(containerRef);

  const scalesByPage = useMemo(() => {
    if (!layout) return [];
    return layout.pages.map((page) => {
      if (!fitToWidth || containerWidth <= 0) return 1;
      const widthPx = page.widthMm * mmToPx;
      const available = Math.max(0, containerWidth - 2);
      const nextScale = available / widthPx;
      return Number.isFinite(nextScale) ? Math.max(SCALE_MIN, Math.min(1, nextScale)) : 1;
    });
  }, [containerWidth, fitToWidth, layout, mmToPx]);

  if (!layout) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`wb-report-root ${className}`}>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          header,
          nav,
          #toast-portal,
          .wb-report-screen-only {
            display: none !important;
          }
          main#wb-main-content {
            padding-top: 0 !important;
            min-height: auto !important;
          }
          .wb-report-root {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .wb-report-canvas {
            background: transparent !important;
            padding: 0 !important;
            border: 0 !important;
          }
          .wb-report-pages {
            display: block !important;
            gap: 0 !important;
          }
          .wb-report-page-wrap {
            margin: 0 auto !important;
            width: auto !important;
            height: auto !important;
            break-after: page;
            page-break-after: always;
          }
          .wb-report-page-wrap:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .wb-report-page {
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
          }
          .wb-report-debug-overlay {
            display: none !important;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className="wb-report-canvas overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-4"
      >
        <div className="wb-report-pages grid gap-8">
          {layout.pages.map((page, pageIndex) => {
            const scale = scalesByPage[pageIndex] ?? 1;
            const pageWidthPx = page.widthMm * mmToPx;
            const pageHeightPx = page.heightMm * mmToPx;
            const scaledWidthPx = pageWidthPx * scale;
            const scaledHeightPx = pageHeightPx * scale;
            const issueBoxes = resolveIssueBoxes(page.id, issues);

            return (
              <div
                key={page.id}
                className="wb-report-page-wrap"
                style={{
                  width: `${scaledWidthPx}px`,
                  height: `${scaledHeightPx}px`,
                  margin: "0 auto",
                }}
              >
                <section
                  className="wb-report-page relative bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] border border-slate-200"
                  style={{
                    width: `${page.widthMm}mm`,
                    height: `${page.heightMm}mm`,
                    boxSizing: "border-box",
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    fontFamily: REPORT_FONT_STACK,
                    lineHeight: REPORT_TEXT_LINE_HEIGHT,
                  }}
                >
                  {page.nodes.map((node) => renderNode(node, debugOverlay))}
                  {debugOverlay && issueBoxes.length > 0 && (
                    <div className="wb-report-debug-overlay pointer-events-none absolute inset-0">
                      {issueBoxes.map((box) => {
                        const palette = issueColor(box.tone);
                        return (
                          <div
                            key={box.key}
                            className="absolute"
                            style={{
                              left: `${box.x}mm`,
                              top: `${box.y}mm`,
                              width: `${Math.max(1, box.w)}mm`,
                              height: `${Math.max(1, box.h)}mm`,
                              border: `0.35mm solid ${palette.border}`,
                              background: palette.bg,
                              boxSizing: "border-box",
                            }}
                          >
                            <span
                              className="absolute left-0 top-0 inline-block rounded-br px-1 py-[1px] text-[10px] font-semibold"
                              style={{ background: palette.bg, color: palette.text }}
                            >
                              {box.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
