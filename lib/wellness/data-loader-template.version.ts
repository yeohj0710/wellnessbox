export function majorVersionOf(versionText: string) {
  const [majorToken] = versionText.split(".");
  const major = Number.parseInt(majorToken || "1", 10);
  if (Number.isNaN(major) || major < 1) return 1;
  return major + 1;
}
