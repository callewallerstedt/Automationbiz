import { execSync } from "node:child_process";

function pickDatabaseUrl() {
  const candidateKeys = [
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED",
    "DIRECT_URL",
    "POSTGRES_URL",
    "DATABASE_URL",
    "NEON_DATABASE_URL",
    "NEON_POSTGRES_URL",
  ];

  const candidates = candidateKeys
    .map((key) => ({ key, value: process.env[key]?.trim() }))
    .filter((entry) => Boolean(entry.value));

  if (!candidates.length) {
    throw new Error(
      "Missing database URL. Set a Postgres URL in one of: POSTGRES_URL_NON_POOLING, DATABASE_URL_UNPOOLED, DIRECT_URL, POSTGRES_URL, DATABASE_URL.",
    );
  }

  const match = candidates.find((entry) => /^postgres(ql)?:\/\//i.test(entry.value));
  if (!match) {
    const seen = candidates.map((entry) => `${entry.key}=${entry.value.split(":")[0] ?? "unknown"}://`).join(", ");
    throw new Error(
      `No valid Postgres URL found. Expected postgres:// or postgresql://. Found: ${seen}`,
    );
  }

  return match.value;
}

const databaseUrl = pickDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
