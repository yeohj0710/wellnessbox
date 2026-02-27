function hasRouteAuthImport(source: string) {
  return (
    source.includes('from "@/lib/server/route-auth"') ||
    source.includes("from '@/lib/server/route-auth'")
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractGuardCalls(source: string, guardTokens: string[]) {
  return guardTokens.filter((token) => {
    const pattern = new RegExp(`\\b${escapeRegex(token)}\\s*\\(`);
    return pattern.test(source);
  });
}

module.exports = {
  extractGuardCalls,
  hasRouteAuthImport,
};
