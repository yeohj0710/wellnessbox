"use client";

import { useMemo, useRef } from "react";
import {
  REPORT_FONT_STACK,
  REPORT_TEXT_LINE_HEIGHT,
} from "@/lib/b2b/export/render-style";
import { issueColor, renderNode, resolveIssueBoxes } from "./report-renderer/render-utils";
import type { ReportRendererProps } from "./report-renderer/types";
import { useContainerMetrics } from "./report-renderer/use-container-metrics";

const SCALE_MIN = 0.25;

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
                  className="wb-report-page relative border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
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

                  {debugOverlay && issueBoxes.length > 0 ? (
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
                  ) : null}
                </section>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
