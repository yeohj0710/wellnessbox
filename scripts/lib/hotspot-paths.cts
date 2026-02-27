const HOTSPOT_SKIP_PREFIXES = [
  "docs/",
  "tmp/",
  "prisma/migrations/",
  "android/app/build/",
  "ios/build/",
  ".next/",
];

function shouldIncludeHotspotCodeFile(rel: string) {
  if (HOTSPOT_SKIP_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
    return false;
  }
  if (rel.endsWith(".md")) return false;
  return (
    rel.endsWith(".ts") ||
    rel.endsWith(".tsx") ||
    rel.endsWith(".js") ||
    rel.endsWith(".jsx")
  );
}

function isScriptFile(file: string) {
  return file.startsWith("scripts/");
}

function isApiRouteFile(file: string) {
  return file.startsWith("app/api/") && file.endsWith("/route.ts");
}

function isFrontendSurfaceFile(file: string) {
  if (file.startsWith("app/api/")) return false;
  if (file.startsWith("app/")) return true;
  if (file.startsWith("components/")) return true;
  return false;
}

module.exports = {
  isApiRouteFile,
  isFrontendSurfaceFile,
  isScriptFile,
  shouldIncludeHotspotCodeFile,
};
