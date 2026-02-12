-- Ensure BusinessModelProfile exists even when initial migration was baselined on a pre-existing schema.
CREATE TABLE IF NOT EXISTS "public"."BusinessModelProfile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "valueProposition" TEXT NOT NULL DEFAULT '',
    "idealCustomer" TEXT NOT NULL DEFAULT '',
    "offerings" TEXT NOT NULL DEFAULT '',
    "pricingModel" TEXT NOT NULL DEFAULT '',
    "salesProcess" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT NOT NULL DEFAULT '',
    "toneGuidelines" TEXT NOT NULL DEFAULT '',
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessModelProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessModelProfile_key_key" ON "public"."BusinessModelProfile"("key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BusinessModelProfile_updatedById_fkey'
  ) THEN
    ALTER TABLE "public"."BusinessModelProfile"
      ADD CONSTRAINT "BusinessModelProfile_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Ensure BusinessModelRevision exists for audit snapshots.
CREATE TABLE IF NOT EXISTS "public"."BusinessModelRevision" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessModelRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BusinessModelRevision_profileId_createdAt_idx" ON "public"."BusinessModelRevision"("profileId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BusinessModelRevision_profileId_fkey'
  ) THEN
    ALTER TABLE "public"."BusinessModelRevision"
      ADD CONSTRAINT "BusinessModelRevision_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "public"."BusinessModelProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BusinessModelRevision_changedById_fkey'
  ) THEN
    ALTER TABLE "public"."BusinessModelRevision"
      ADD CONSTRAINT "BusinessModelRevision_changedById_fkey"
      FOREIGN KEY ("changedById") REFERENCES "public"."User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
