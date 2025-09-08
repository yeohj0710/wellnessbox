export function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function makeSnippet(t: string, q: string, size = 1000) {
  const lt = t.toLowerCase();
  const qs = tokenize(q);
  let idx = 0;
  for (const tk of qs) {
    const i = lt.indexOf(tk);
    if (i >= 0 && (idx === 0 || i < idx)) idx = i;
  }
  const half = Math.floor(size / 2);
  let s = Math.max(0, idx - half);
  let e = Math.min(t.length, s + size);
  const pre = t.lastIndexOf(".", s - 1);
  if (pre >= 0 && pre < s) s = pre + 1;
  const post = t.indexOf(".", e);
  if (post >= 0) e = post + 1;
  const snippet = t.slice(s, e).trim();
  return (s > 0 ? "…" : "") + snippet + (e < t.length ? "…" : "");
}
