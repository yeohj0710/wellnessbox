const DIRECT_REMOTE_IMAGE_HOSTS = new Set(["imagedelivery.net"]);

export function shouldBypassNextImageOptimizer(src?: string | null): boolean {
  if (!src || src.startsWith("/")) return false;

  try {
    const parsed = new URL(src);
    return (
      parsed.protocol === "https:" &&
      DIRECT_REMOTE_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
