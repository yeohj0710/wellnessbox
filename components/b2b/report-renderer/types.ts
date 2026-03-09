import type { LayoutDocument } from "@/lib/b2b/export/layout-types";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";

export type ReportRendererProps = {
  layout: LayoutDocument | null | undefined;
  fitToWidth?: boolean;
  debugOverlay?: boolean;
  issues?: LayoutValidationIssue[];
  emptyMessage?: string;
  className?: string;
};

export type IssueBox = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone: "warn" | "danger";
};
