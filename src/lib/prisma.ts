import { PrismaClient } from "@prisma/client";

function cleanEnvUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const unquoted = trimmed.replace(/^['"]|['"]$/g, "");
  return unquoted.trim() || undefined;
}

function isPostgresUrl(value: string | undefined) {
  return Boolean(value && (value.startsWith("postgresql://") || value.startsWith("postgres://")));
}

function firstValidPostgresUrl(candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const cleaned = cleanEnvUrl(candidate);
    if (isPostgresUrl(cleaned)) return cleaned;
  }
  return undefined;
}

const pooledFallback = firstValidPostgresUrl([
  process.env.DATABASE_URL,
  process.env.Storage_DATABASE_URL,
  process.env.STORAGE_DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.Storage_DATABASE_URL_UNPOOLED,
  process.env.STORAGE_DATABASE_URL_UNPOOLED,
  process.env.POSTGRES_URL_NON_POOLING,
]);

if (pooledFallback) {
  process.env.DATABASE_URL = pooledFallback;
}

const directFallback = firstValidPostgresUrl([
  process.env.DIRECT_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.Storage_DATABASE_URL_UNPOOLED,
  process.env.STORAGE_DATABASE_URL_UNPOOLED,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.DATABASE_URL,
  process.env.Storage_DATABASE_URL,
  process.env.STORAGE_DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
]);

if (directFallback) {
  process.env.DIRECT_URL = directFallback;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

