export type LayoutValidationIssueCode =
  | "BOUNDS"
  | "OVERLAP"
  | "TEXT_OVERFLOW"
  | "CLIP";

export type LayoutNodeBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutValidationIssue = {
  code: LayoutValidationIssueCode;
  pageId: string;
  nodeId?: string;
  relatedNodeId?: string;
  detail: string;
  nodeBounds?: LayoutNodeBounds;
  relatedNodeBounds?: LayoutNodeBounds;
};

