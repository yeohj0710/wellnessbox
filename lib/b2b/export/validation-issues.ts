import type {
  LayoutNodeBounds,
  LayoutValidationIssue,
} from "@/lib/b2b/export/validation-types";

function formatIssueBounds(bounds?: LayoutNodeBounds) {
  if (!bounds) return "-";
  return `${bounds.x.toFixed(1)},${bounds.y.toFixed(1)},${bounds.w.toFixed(
    1
  )},${bounds.h.toFixed(1)}`;
}

export function toLayoutValidationIssueKey(issue: LayoutValidationIssue) {
  return [
    issue.code,
    issue.pageId,
    issue.nodeId ?? "-",
    issue.relatedNodeId ?? "-",
    formatIssueBounds(issue.nodeBounds),
    formatIssueBounds(issue.relatedNodeBounds),
  ].join("|");
}

export function dedupeLayoutValidationIssues(issues: LayoutValidationIssue[]) {
  const seen = new Set<string>();
  const deduped: LayoutValidationIssue[] = [];
  for (const issue of issues) {
    const key = toLayoutValidationIssueKey(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }
  return deduped;
}

