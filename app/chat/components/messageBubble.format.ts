/**
 * Render-time cleanup. The blank line before a list is only inserted when the
 * preceding line is prose \u2014 matching a list marker anywhere in the line would
 * pull consecutive items apart and turn every tight list loose.
 */
export function normalizeMessageText(text: string) {
  return (text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(
      /^(?![ \t]*(?:[-*+]\s|\d+\.\s))(\S.*)\n(?=[ \t]*(?:[-*+]\s|\d+\.\s))/gm,
      "$1\n\n"
    );
}
