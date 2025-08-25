const mem = new Map<string, { token: string; exp: number }>();
export async function getStreamToken(role: "customer" | "pharm" | "rider", orderId: number, extra: Record<string, any> = {}) {
  const key = `streamToken:${role}:${orderId}`;
  let store: any;
  if (typeof sessionStorage !== "undefined") store = sessionStorage; else store = mem;
  const cached = store instanceof Map ? store.get(key) : JSON.parse(store.getItem(key) || "null");
  if (cached && cached.exp - Math.floor(Date.now() / 1000) > 30) return cached.token;
  const res = await fetch("/api/messages/stream/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, orderId, ...extra }),
  });
  if (!res.ok) throw new Error("token error");
  const { token, exp } = await res.json();
  if (store instanceof Map) store.set(key, { token, exp }); else store.setItem(key, JSON.stringify({ token, exp }));
  return token;
}
