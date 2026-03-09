"use client";

import type { CSSProperties } from "react";
import type { LayoutNode } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import {
  REPORT_FONT_STACK,
  REPORT_TEXT_LINE_HEIGHT,
} from "@/lib/b2b/export/render-style";
import type { IssueBox } from "./types";

export function issueTone(code: LayoutValidationIssue["code"]): "warn" | "danger" {
  if (code === "OVERLAP" || code === "BOUNDS") return "danger";
  return "warn";
}

export function issueColor(tone: "warn" | "danger") {
  return tone === "danger"
    ? { border: "#DC2626", bg: "rgba(220, 38, 38, 0.08)", text: "#B91C1C" }
    : { border: "#D97706", bg: "rgba(217, 119, 6, 0.08)", text: "#92400E" };
}

export function resolveIssueBoxes(pageId: string, issues: LayoutValidationIssue[]) {
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

export function renderNode(node: LayoutNode, debugOverlay: boolean) {
  const baseStyle: CSSProperties = {
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
