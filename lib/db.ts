import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaQueryLoggingAttached?: boolean;
};

const enableQueryLogging =
  process.env.NODE_ENV !== "production" &&
  process.env.WB_PRISMA_QUERY_LOG === "1";
const shouldPrintQueryLogs =
  enableQueryLogging && process.env.WB_PRISMA_QUERY_LOG_STDOUT === "1";

const db =
  globalForPrisma.prisma ??
  new PrismaClient(
    enableQueryLogging
      ? {
          log: [
            { emit: "event", level: "query" },
          ],
        }
      : undefined
  );

if (enableQueryLogging && !globalForPrisma.prismaQueryLoggingAttached) {
  (db as any).$on("query", (event: any) => {
    if (shouldPrintQueryLogs) {
      const query =
        typeof event?.query === "string"
          ? event.query.replace(/\s+/g, " ").trim()
          : "";
      const compactQuery =
        query.length > 240 ? `${query.slice(0, 240)}...` : query;
      console.info("[push][db] query", {
        durationMs: event?.duration ?? null,
        target: event?.target ?? null,
        query: compactQuery,
      });
    }
  });
  globalForPrisma.prismaQueryLoggingAttached = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
