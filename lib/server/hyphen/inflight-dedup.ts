import "server-only";

const inFlightHyphenJobs = new Map<string, Promise<unknown>>();

export async function runWithHyphenInFlightDedup<T>(
  namespace: string,
  key: string,
  runner: () => Promise<T>
): Promise<T> {
  const dedupKey = `${namespace}|${key}`;
  const existing = inFlightHyphenJobs.get(dedupKey) as Promise<T> | undefined;
  if (existing) return existing;

  const next = runner().finally(() => {
    inFlightHyphenJobs.delete(dedupKey);
  });
  inFlightHyphenJobs.set(dedupKey, next as Promise<unknown>);
  return next;
}
