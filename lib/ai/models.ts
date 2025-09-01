import db from "@/lib/db";

export async function getDefaultModel(): Promise<string> {
  const record = await db.config.findUnique({ where: { key: "chatModel" } });
  return record?.value || "gpt-4o-mini";
}

export const AVAILABLE_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-3.5-turbo",
];
