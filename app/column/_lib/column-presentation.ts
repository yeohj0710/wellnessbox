type ColumnPresentationInput = {
  slug: string;
  title: string;
  tags: string[];
  coverImageUrl: string | null;
};

export type ColumnPosterPalette = {
  background: string;
  border: string;
  chipBackground: string;
  chipText: string;
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
    "linear-gradient(135deg, rgba(10,37,64,0.96) 0%, rgba(24,82,72,0.94) 52%, rgba(236,253,245,0.92) 100%)",
  border: "rgba(16, 185, 129, 0.28)",
  chipBackground: "rgba(236, 253, 245, 0.16)",
  chipText: "#ecfdf5",
  accent: "rgba(255,255,255,0.18)",
};

const PALETTE_BY_KEYWORD: Array<{
  keyword: string;
  palette: ColumnPosterPalette;
}> = [
  {
    keyword: "커피",
    palette: {
      background:
        "linear-gradient(135deg, rgba(55,34,25,0.96) 0%, rgba(111,78,55,0.94) 50%, rgba(251,191,36,0.88) 100%)",
      border: "rgba(180, 83, 9, 0.28)",
      chipBackground: "rgba(120, 53, 15, 0.2)",
      chipText: "#fffbeb",
      accent: "rgba(255, 251, 235, 0.18)",
    },
  },
  {
    keyword: "혈당",
    palette: {
      background:
        "linear-gradient(135deg, rgba(67,56,202,0.96) 0%, rgba(15,118,110,0.94) 55%, rgba(224,242,254,0.9) 100%)",
      border: "rgba(59, 130, 246, 0.26)",
      chipBackground: "rgba(224, 242, 254, 0.18)",
      chipText: "#eff6ff",
      accent: "rgba(255,255,255,0.2)",
    },
  },
  {
    keyword: "영양제",
    palette: {
      background:
        "linear-gradient(135deg, rgba(24,24,27,0.96) 0%, rgba(63,63,70,0.94) 46%, rgba(245,158,11,0.86) 100%)",
      border: "rgba(245, 158, 11, 0.26)",
      chipBackground: "rgba(39, 39, 42, 0.28)",
      chipText: "#fef3c7",
      accent: "rgba(254,243,199,0.16)",
    },
  },
  {
    keyword: "약",
    palette: {
      background:
        "linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(31,41,55,0.94) 46%, rgba(56,189,248,0.86) 100%)",
      border: "rgba(14, 165, 233, 0.24)",
      chipBackground: "rgba(14, 165, 233, 0.14)",
      chipText: "#e0f2fe",
      accent: "rgba(224,242,254,0.16)",
    },
  },
  {
    keyword: "수면",
    palette: {
      background:
        "linear-gradient(135deg, rgba(49,46,129,0.98) 0%, rgba(30,64,175,0.94) 46%, rgba(191,219,254,0.92) 100%)",
      border: "rgba(99, 102, 241, 0.28)",
      chipBackground: "rgba(191, 219, 254, 0.16)",
      chipText: "#eef2ff",
      accent: "rgba(255,255,255,0.18)",
    },
  },
  {
    keyword: "다이어트",
    palette: {
      background:
        "linear-gradient(135deg, rgba(20,83,45,0.97) 0%, rgba(22,101,52,0.94) 48%, rgba(190,242,100,0.86) 100%)",
      border: "rgba(101, 163, 13, 0.28)",
      chipBackground: "rgba(236, 252, 203, 0.16)",
      chipText: "#f7fee7",
      accent: "rgba(247,254,231,0.16)",
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
        "linear-gradient(135deg, rgba(120,53,15,0.96) 0%, rgba(190,24,93,0.9) 52%, rgba(255,237,213,0.9) 100%)",
      border: "rgba(251, 146, 60, 0.26)",
      chipBackground: "rgba(255, 237, 213, 0.18)",
      chipText: "#fff7ed",
      accent: "rgba(255,255,255,0.18)",
    },
  },
  "minoxidil-why-results-differ": {
    forcePoster: true,
    eyebrow: "탈모 관리",
    palette: {
      background:
        "linear-gradient(135deg, rgba(39,39,42,0.98) 0%, rgba(82,82,91,0.94) 44%, rgba(250,204,21,0.84) 100%)",
      border: "rgba(161, 161, 170, 0.24)",
      chipBackground: "rgba(255, 255, 255, 0.12)",
      chipText: "#fafafa",
      accent: "rgba(255,255,255,0.18)",
    },
  },
  "neck-darkness-insulin-resistance-signals": {
    forcePoster: true,
    eyebrow: "인슐린 신호",
    palette: {
      background:
        "linear-gradient(135deg, rgba(88,28,135,0.98) 0%, rgba(15,23,42,0.95) 52%, rgba(216,180,254,0.9) 100%)",
      border: "rgba(168, 85, 247, 0.26)",
      chipBackground: "rgba(216, 180, 254, 0.14)",
      chipText: "#faf5ff",
      accent: "rgba(255,255,255,0.18)",
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
