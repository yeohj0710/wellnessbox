export type PaginationStrategy =
  | "windowed"
  | "log"
  | "fibonacci"
  | "percentile"
  | "hybrid";

export interface PaginationOptions {
  strategy?: PaginationStrategy;
  maxCount?: number;
  window?: number;
  percentStep?: number;
  mobileMaxCount?: number;
  mobileWindow?: number;
  mobileBreakpoint?: number;
}

export function generateOptimizedPageNumbers(
  totalPages: number,
  currentPage: number,
  options: PaginationOptions = {}
): number[] {
  const s = options.strategy ?? "hybrid";
  const bp = options.mobileBreakpoint ?? 640;
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < bp : false;
  const targetMax =
    options.maxCount ?? (isMobile ? options.mobileMaxCount ?? 4 : 9);
  const maxCount = Math.max(3, Math.min(targetMax, 25));
  const win = options.window ?? (isMobile ? options.mobileWindow ?? 1 : 2);
  const step = options.percentStep ?? 10;
  if (totalPages <= 0) return [];
  currentPage = Math.max(1, Math.min(totalPages, currentPage));
  if (totalPages <= maxCount)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  const add = (set: Set<number>, n: number) => {
    if (n >= 1 && n <= totalPages) set.add(n);
  };
  const finalize = (set: Set<number>) => {
    add(set, 1);
    add(set, totalPages);
    add(set, currentPage);
    const arr = Array.from(set)
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
    if (arr.length <= maxCount) return arr;
    const must = new Set<number>([1, currentPage, totalPages]);
    const rest = arr.filter((n) => !must.has(n));
    while (must.size + rest.length > maxCount) {
      let bestIdx = -1;
      let bestScore = Infinity;
      for (let i = 0; i < rest.length; i++) {
        const candidate = rest[i];
        const kept = [...must, ...rest.filter((_, j) => j !== i)].sort(
          (x, y) => x - y
        );
        let score = 0;
        for (let k = 1; k < kept.length; k++)
          score = Math.max(score, kept[k] - kept[k - 1]);
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      rest.splice(bestIdx, 1);
    }
    return [...must, ...rest].sort((a, b) => a - b);
  };
  const pages = new Set<number>();
  if (s === "windowed") {
    add(pages, 1);
    add(pages, totalPages);
    for (let d = -win; d <= win; d++) add(pages, currentPage + d);
    let left = Math.min(...Array.from(pages)) - 1;
    let right = Math.max(...Array.from(pages)) + 1;
    while (pages.size < maxCount && (left >= 1 || right <= totalPages)) {
      if (left >= 1) add(pages, left--);
      if (pages.size >= maxCount) break;
      if (right <= totalPages) add(pages, right++);
    }
    return finalize(pages);
  }
  if (s === "log") {
    add(pages, 1);
    add(pages, totalPages);
    add(pages, currentPage);
    for (let k = 0; pages.size < maxCount && k < 32; k++) {
      const l = currentPage - Math.pow(2, k);
      const r = currentPage + Math.pow(2, k);
      add(pages, l);
      if (pages.size >= maxCount) break;
      add(pages, r);
      if (l <= 1 && r >= totalPages) break;
    }
    return finalize(pages);
  }
  if (s === "fibonacci") {
    add(pages, 1);
    add(pages, totalPages);
    add(pages, currentPage);
    let a = 1;
    let b = 2;
    while (pages.size < maxCount) {
      add(pages, currentPage - a);
      if (pages.size >= maxCount) break;
      add(pages, currentPage + a);
      if (pages.size >= maxCount) break;
      const next = a + b;
      a = b;
      b = next;
      if (a > totalPages && currentPage - a < 1 && currentPage + a > totalPages)
        break;
    }
    return finalize(pages);
  }
  if (s === "percentile") {
    for (let p = 0; p <= 100 && pages.size < maxCount; p += Math.max(1, step)) {
      const n = Math.round(1 + (totalPages - 1) * (p / 100));
      add(pages, n);
    }
    for (let d = -win; d <= win; d++) add(pages, currentPage + d);
    return finalize(pages);
  }
  if (s === "hybrid") {
    add(pages, 1);
    add(pages, totalPages);
    for (let d = -win; d <= win; d++) add(pages, currentPage + d);
    for (let k = 0; pages.size < maxCount; k++) {
      const l = currentPage - Math.pow(2, k);
      const r = currentPage + Math.pow(2, k);
      add(pages, l);
      if (pages.size >= maxCount) break;
      add(pages, r);
      if (l <= 1 && r >= totalPages) break;
    }
    if (pages.size < maxCount) {
      let left = Math.min(...Array.from(pages)) - 1;
      let right = Math.max(...Array.from(pages)) + 1;
      while (pages.size < maxCount && (left >= 1 || right <= totalPages)) {
        if (left >= 1) add(pages, left--);
        if (pages.size >= maxCount) break;
        if (right <= totalPages) add(pages, right++);
      }
    }
    return finalize(pages);
  }
  return finalize(pages);
}
