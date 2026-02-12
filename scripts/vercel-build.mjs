import { execSync, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

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

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

function tryMigrateDeployWithOutput() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: process.env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

function baselineExistingDatabase() {
  const migrationDirs = readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrationDirs) {
    run(`npx prisma migrate resolve --applied ${migration}`);
  }
}

execSync("npx prisma generate", { stdio: "inherit", env: process.env });

const deployResult = tryMigrateDeployWithOutput();
if (deployResult.status !== 0) {
  const output = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
  if (/P3005|database schema is not empty/i.test(output)) {
    baselineExistingDatabase();
    run("npx prisma migrate deploy");
  } else {
    process.exit(deployResult.status ?? 1);
  }
}

run("npx next build");
