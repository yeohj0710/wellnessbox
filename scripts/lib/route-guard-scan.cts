function hasRouteAuthImport(source: string) {
  return (
    source.includes('from "@/lib/server/route-auth"') ||
    source.includes("from '@/lib/server/route-auth'")
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isFunctionDeclarationPrefix(source: string, index: number) {
  const prefix = source.slice(Math.max(0, index - 120), index);
  return /(?:^|[\s;])(?:export\s+)?(?:async\s+)?function\s+$/m.test(prefix);
}

function extractGuardCalls(source: string, guardTokens: string[]) {
  return guardTokens.filter((token) => {
    const pattern = new RegExp(`\\b${escapeRegex(token)}\\s*\\(`, "g");
    const matches = source.matchAll(pattern);
    for (const match of matches) {
      const index = match.index ?? -1;
      if (index < 0) continue;
      if (isFunctionDeclarationPrefix(source, index)) continue;
      return true;
    }
    return false;
  });
}

module.exports = {
  extractGuardCalls,
  hasRouteAuthImport,
};
