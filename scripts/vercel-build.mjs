import { execSync } from "node:child_process";

function pickDatabaseUrl() {
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ].filter(Boolean);

  if (!candidates.length) {
    throw new Error(
      "Missing database URL. Set DATABASE_URL or provision Vercel Postgres (POSTGRES_URL / POSTGRES_URL_NON_POOLING).",
    );
  }

  const value = candidates[0];
  if (!/^postgres(ql)?:\/\//i.test(value)) {
    throw new Error(
      `Invalid database URL protocol: ${value.split(":")[0] ?? "unknown"}. Expected postgres:// or postgresql://`,
    );
  }

  return value;
}

const databaseUrl = pickDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
