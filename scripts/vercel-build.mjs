import { execSync } from "node:child_process";

function clean(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, "").trim() || undefined;
}

function pickDatabaseUrl() {
  const candidateKeys = [
    "Storage_DATABASE_URL_UNPOOLED",
    "STORAGE_DATABASE_URL_UNPOOLED",
    "Storage_DATABASE_URL",
    "STORAGE_DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED",
    "DIRECT_URL",
    "POSTGRES_URL",
    "DATABASE_URL",
    "NEON_DATABASE_URL",
    "NEON_POSTGRES_URL",
  ];

  const candidates = candidateKeys
    .map((key) => ({ key, value: clean(process.env[key]) }))
    .filter((entry) => Boolean(entry.value));

  const match = candidates.find((entry) => /^postgres(ql)?:\/\//i.test(entry.value));

  if (match) {
    return match.value;
  }

  const scanned = Object.entries(process.env)
    .map(([key, value]) => ({ key, value: clean(value) }))
    .filter((entry) => Boolean(entry.value))
    .filter((entry) => /(postgres|database_url|prisma|storage|neon)/i.test(entry.key));

  const scannedMatch = scanned.find((entry) => /^postgres(ql)?:\/\//i.test(entry.value));
  if (scannedMatch) {
    return scannedMatch.value;
  }

  const seen = scanned
    .slice(0, 20)
    .map((entry) => `${entry.key}=${entry.value.split(":")[0] ?? "unknown"}://`)
    .join(", ");

  throw new Error(
    `No valid Postgres URL found. Expected postgres:// or postgresql://. Found: ${seen || "no DB-like env vars present"}`,
  );
}

const databaseUrl = pickDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
