export const PAGE_SIZE_MM = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZE_MM;
export type LayoutIntent = "preview" | "export";
export type StylePreset = "fresh" | "calm" | "focus";

export type LayoutNodeType = "text" | "rect";

export type LayoutNode = {
  id: string;
  type: LayoutNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  fill?: string;
  role?: "background" | "content" | "line" | "decoration";
  allowOverlap?: boolean;
};

export type LayoutPage = {
  id: string;
  widthMm: number;
  heightMm: number;
  nodes: LayoutNode[];
};

export type LayoutDocument = {
  docTitle: string;
  pageSize: PageSizeKey;
  pageSizeMm: { width: number; height: number };
  intent: LayoutIntent;
  variantIndex: number;
  stylePreset: StylePreset;
  pages: LayoutPage[];
};
