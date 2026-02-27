import { asArray, asRecord, toText } from "@/lib/b2b/report-payload-shared";

export function extractFailedTargets(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const failedRaw = asArray(meta?.failed ?? root?.failed);
  const targets = failedRaw
    .map((item) => asRecord(item))
    .map((item) => toText(item?.target))
    .filter((item): item is string => Boolean(item));
  return [...new Set(targets)];
}

export function parseFetchFlags(rawJson: unknown) {
  const root = asRecord(rawJson);
  const meta = asRecord(root?.meta);
  const partialValue = meta?.partial ?? root?.partial;
  const partial = partialValue === true;
  return {
    partial,
    failedTargets: extractFailedTargets(rawJson),
  };
}
