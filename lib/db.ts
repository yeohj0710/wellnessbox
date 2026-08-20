import { Prisma, PrismaClient } from "@prisma/client";
import {
  ensurePrismaEnvConfigured,
  resolvePrismaEnvErrorMessage,
} from "@/lib/db-env";
import { normalizePrismaConnectionUrl } from "@/lib/prisma-connection-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaQueryLoggingAttached?: boolean;
};

const prismaEnv = ensurePrismaEnvConfigured();
const runtimeDatabaseUrl = normalizePrismaConnectionUrl(process.env.DATABASE_URL ?? "");

const enableQueryLogging =
  process.env.NODE_ENV !== "production" &&
  process.env.WB_PRISMA_QUERY_LOG === "1";
const shouldPrintQueryLogs =
  enableQueryLogging && process.env.WB_PRISMA_QUERY_LOG_STDOUT === "1";

function createPrismaClient() {
  if (!prismaEnv.ok) {
    throw new Error(prismaEnv.message || "Prisma 환경변수 설정이 올바르지 않습니다.");
  }

  const options: Prisma.PrismaClientOptions = {};
  if (runtimeDatabaseUrl) {
    options.datasources = { db: { url: runtimeDatabaseUrl } };
  }
  if (enableQueryLogging) {
    options.log = [{ emit: "event", level: "query" }];
  }
  return new PrismaClient(options);
}

function attachQueryLogging(client: PrismaClient) {
  if (!enableQueryLogging || globalForPrisma.prismaQueryLoggingAttached) return;
  (client as any).$on("query", (event: any) => {
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

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = createPrismaClient();
  attachQueryLogging(created);
  globalForPrisma.prisma = created;
  return created;
}

const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient() as any;
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;

export function resolvePrismaDbErrorMessage(error: unknown) {
  return resolvePrismaEnvErrorMessage(error);
}

export default db;
