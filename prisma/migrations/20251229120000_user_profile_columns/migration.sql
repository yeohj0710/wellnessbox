-- Add structured profile fields and support Kakao account uniqueness
ALTER TABLE "UserProfile"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "kakaoEmail" TEXT,
  ADD COLUMN "kakaoId" TEXT,
  ADD COLUMN "nickname" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "phoneLinkedAt" TIMESTAMP(3),
  ADD COLUMN "profileImageUrl" TEXT;

ALTER TABLE "UserProfile" ALTER COLUMN "data" DROP NOT NULL;

-- Backfill from legacy JSON data where present
UPDATE "UserProfile"
SET
  "nickname" = COALESCE("nickname", NULLIF(data->>'nickname', '')),
  "email" = COALESCE("email", NULLIF(data->>'email', '')),
  "profileImageUrl" = COALESCE("profileImageUrl", NULLIF(data->>'profileImageUrl', '')),
  "kakaoEmail" = COALESCE("kakaoEmail", NULLIF(data->>'kakaoEmail', '')),
  "phone" = COALESCE("phone", NULLIF(data->>'phone', '')),
  "phoneLinkedAt" = COALESCE(
    "phoneLinkedAt",
    CASE
      WHEN NULLIF(data->>'phoneLinkedAt', '') IS NULL THEN NULL
      ELSE NULLIF(data->>'phoneLinkedAt', '')::timestamptz
    END
  )
WHERE data IS NOT NULL;

-- Seed kakaoId using any stored field or the numeric clientId
UPDATE "UserProfile"
SET "kakaoId" = COALESCE("kakaoId", data->>'kakaoId')
WHERE "kakaoId" IS NULL AND data ? 'kakaoId';

UPDATE "UserProfile"
SET "kakaoId" = "clientId"
WHERE "kakaoId" IS NULL AND "clientId" ~ '^[0-9]+$';

-- Strip structured keys from the JSON blob to reduce duplication
UPDATE "UserProfile"
SET data =
  CASE
    WHEN data IS NULL THEN NULL
    ELSE data - 'nickname' - 'email' - 'profileImageUrl' - 'kakaoEmail' - 'phone' - 'phoneLinkedAt' - 'kakaoId'
  END;

-- Add constraints and indexes for reliable lookups
CREATE UNIQUE INDEX "UserProfile_kakaoId_key" ON "UserProfile"("kakaoId");
CREATE INDEX "UserProfile_kakaoId_idx" ON "UserProfile"("kakaoId");
CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email");
CREATE INDEX "UserProfile_phone_idx" ON "UserProfile"("phone");
