type ColumnPresentationInput = {
  slug: string;
  title: string;
  tags: string[];
  coverImageUrl: string | null;
};

export type ColumnPosterPalette = {
  background: string;
  panel: string;
  border: string;
  line: string;
  chipBackground: string;
  chipText: string;
  title: string;
  body: string;
  accent: string;
};

export type ColumnThumbnailPresentation = {
  mode: "image" | "poster";
  objectPosition: string;
  eyebrow: string;
  palette: ColumnPosterPalette;
};

const DEFAULT_PALETTE: ColumnPosterPalette = {
  background:
    "linear-gradient(135deg, rgba(249,252,255,0.98) 0%, rgba(241,248,245,0.96) 52%, rgba(255,250,243,0.94) 100%)",
  panel:
    "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.68) 100%)",
  border: "rgba(148, 163, 184, 0.22)",
  line: "rgba(148, 163, 184, 0.24)",
  chipBackground: "rgba(255, 255, 255, 0.76)",
  chipText: "#355b52",
  title: "#162033",
  body: "#5f6b7c",
  accent: "rgba(73, 96, 232, 0.14)",
};

const PALETTE_BY_KEYWORD: Array<{
  keyword: string;
  palette: ColumnPosterPalette;
}> = [
  {
    keyword: "커피",
    palette: {
      background:
        "linear-gradient(135deg, rgba(255,249,242,0.98) 0%, rgba(246,236,223,0.96) 56%, rgba(241,246,255,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,250,245,0.68) 100%)",
      border: "rgba(180, 83, 9, 0.18)",
      line: "rgba(154, 52, 18, 0.18)",
      chipBackground: "rgba(120, 53, 15, 0.08)",
      chipText: "#8c4f22",
      title: "#2c2017",
      body: "#735948",
      accent: "rgba(194, 120, 54, 0.18)",
    },
  },
  {
    keyword: "혈당",
    palette: {
      background:
        "linear-gradient(135deg, rgba(245,250,255,0.98) 0%, rgba(233,247,248,0.96) 54%, rgba(240,249,255,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(247,252,255,0.68) 100%)",
      border: "rgba(14, 165, 233, 0.18)",
      line: "rgba(8, 145, 178, 0.18)",
      chipBackground: "rgba(14, 165, 233, 0.08)",
      chipText: "#0f6c82",
      title: "#16263d",
      body: "#4f6b77",
      accent: "rgba(56, 189, 248, 0.18)",
    },
  },
  {
    keyword: "영양제",
    palette: {
      background:
        "linear-gradient(135deg, rgba(255,251,244,0.98) 0%, rgba(248,244,236,0.96) 52%, rgba(255,246,230,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,251,245,0.68) 100%)",
      border: "rgba(217, 119, 6, 0.16)",
      line: "rgba(202, 138, 4, 0.18)",
      chipBackground: "rgba(245, 158, 11, 0.08)",
      chipText: "#8c5a06",
      title: "#282117",
      body: "#736247",
      accent: "rgba(245, 158, 11, 0.15)",
    },
  },
  {
    keyword: "눈",
    palette: {
      background:
        "linear-gradient(135deg, rgba(245,249,255,0.98) 0%, rgba(238,244,255,0.96) 52%, rgba(243,248,255,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(245,248,255,0.7) 100%)",
      border: "rgba(59, 130, 246, 0.16)",
      line: "rgba(96, 165, 250, 0.18)",
      chipBackground: "rgba(59, 130, 246, 0.08)",
      chipText: "#315fba",
      title: "#17233a",
      body: "#5b6982",
      accent: "rgba(96, 165, 250, 0.16)",
    },
  },
  {
    keyword: "수면",
    palette: {
      background:
        "linear-gradient(135deg, rgba(247,246,255,0.98) 0%, rgba(237,240,255,0.96) 52%, rgba(247,249,255,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(246,247,255,0.68) 100%)",
      border: "rgba(129, 140, 248, 0.18)",
      line: "rgba(99, 102, 241, 0.18)",
      chipBackground: "rgba(129, 140, 248, 0.08)",
      chipText: "#4b57ba",
      title: "#1d2440",
      body: "#626d8a",
      accent: "rgba(129, 140, 248, 0.16)",
    },
  },
  {
    keyword: "다이어트",
    palette: {
      background:
        "linear-gradient(135deg, rgba(248,252,245,0.98) 0%, rgba(239,248,233,0.96) 52%, rgba(255,248,238,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(248,252,245,0.68) 100%)",
      border: "rgba(101, 163, 13, 0.18)",
      line: "rgba(77, 124, 15, 0.18)",
      chipBackground: "rgba(132, 204, 22, 0.1)",
      chipText: "#527b16",
      title: "#1e2a1c",
      body: "#5d7053",
      accent: "rgba(132, 204, 22, 0.14)",
    },
  },
];

const SLUG_OVERRIDES: Record<
  string,
  Partial<ColumnThumbnailPresentation> & { forcePoster?: boolean }
> = {
  "women-intermittent-fasting-can-backfire": {
    forcePoster: true,
    eyebrow: "간헐적 단식",
    palette: {
      background:
        "linear-gradient(135deg, rgba(255,246,244,0.98) 0%, rgba(252,237,242,0.96) 50%, rgba(255,248,241,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,248,246,0.68) 100%)",
      border: "rgba(244, 114, 182, 0.18)",
      line: "rgba(225, 29, 72, 0.16)",
      chipBackground: "rgba(225, 29, 72, 0.08)",
      chipText: "#a53d64",
      title: "#2b1830",
      body: "#775668",
      accent: "rgba(244, 114, 182, 0.16)",
    },
  },
  "minoxidil-why-results-differ": {
    forcePoster: true,
    eyebrow: "탈모 관리",
    palette: {
      background:
        "linear-gradient(135deg, rgba(249,250,251,0.98) 0%, rgba(238,242,247,0.96) 50%, rgba(255,249,235,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(250,250,250,0.7) 100%)",
      border: "rgba(161, 161, 170, 0.2)",
      line: "rgba(113, 113, 122, 0.18)",
      chipBackground: "rgba(113, 113, 122, 0.08)",
      chipText: "#52525b",
      title: "#18181b",
      body: "#63636b",
      accent: "rgba(234, 179, 8, 0.14)",
    },
  },
  "neck-darkness-insulin-resistance-signals": {
    forcePoster: true,
    eyebrow: "인슐린 신호",
    palette: {
      background:
        "linear-gradient(135deg, rgba(249,245,255,0.98) 0%, rgba(243,237,255,0.96) 52%, rgba(244,248,255,0.94) 100%)",
      panel:
        "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(248,245,255,0.7) 100%)",
      border: "rgba(168, 85, 247, 0.18)",
      line: "rgba(147, 51, 234, 0.16)",
      chipBackground: "rgba(168, 85, 247, 0.08)",
      chipText: "#7e4ab7",
      title: "#241933",
      body: "#6e6280",
      accent: "rgba(196, 181, 253, 0.18)",
    },
  },
};

function pickPalette(input: ColumnPresentationInput) {
  const matched = PALETTE_BY_KEYWORD.find(({ keyword }) => {
    if (input.title.includes(keyword)) return true;
    return input.tags.some((tag) => tag.includes(keyword));
  });

  return matched?.palette ?? DEFAULT_PALETTE;
}

function pickEyebrow(input: ColumnPresentationInput) {
  return input.tags[0] || "웰니스박스 칼럼";
}

export function getColumnThumbnailPresentation(
  input: ColumnPresentationInput
): ColumnThumbnailPresentation {
  const override = SLUG_OVERRIDES[input.slug];
  const palette = override?.palette ?? pickPalette(input);
  const eyebrow = override?.eyebrow ?? pickEyebrow(input);

  if (override?.forcePoster || !input.coverImageUrl) {
    return {
      mode: "poster",
      objectPosition: "center center",
      eyebrow,
      palette,
    };
  }

  return {
    mode: override?.mode ?? "image",
    objectPosition: override?.objectPosition ?? "center center",
    eyebrow,
    palette,
  };
}
