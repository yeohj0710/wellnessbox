import "server-only";

import { Prisma } from "@prisma/client";

export function toPrismaJson(value: unknown) {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}
