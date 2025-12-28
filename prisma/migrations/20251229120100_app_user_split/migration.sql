-- Create table for authenticated Kakao users without touching chat profiles
CREATE TABLE "AppUser" (
  "id" TEXT NOT NULL,
  "kakaoId" TEXT NOT NULL,
  "clientId" TEXT,
  "nickname" TEXT,
  "email" TEXT,
  "profileImageUrl" TEXT,
  "kakaoEmail" TEXT,
  "phone" TEXT,
  "phoneLinkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- Ensure a stable mapping from Kakao account to logged-in user
CREATE UNIQUE INDEX "AppUser_kakaoId_key" ON "AppUser"("kakaoId");
CREATE INDEX "AppUser_clientId_idx" ON "AppUser"("clientId");
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");
CREATE INDEX "AppUser_phone_idx" ON "AppUser"("phone");

ALTER TABLE "AppUser"
  ADD CONSTRAINT "AppUser_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill structured login data that previously lived on UserProfile columns
INSERT INTO "AppUser" (
  "id", "kakaoId", "clientId", "nickname", "email", "profileImageUrl", "kakaoEmail", "phone", "phoneLinkedAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (COALESCE(NULLIF("kakaoId", ''), "clientId"))
  COALESCE(NULLIF("kakaoId", ''), "clientId", concat('app_', "id")) AS id,
  COALESCE(NULLIF("kakaoId", ''), "clientId") AS kakaoId,
  "clientId",
  "nickname",
  "email",
  "profileImageUrl",
  "kakaoEmail",
  "phone",
  "phoneLinkedAt",
  "createdAt",
  "updatedAt"
FROM "UserProfile"
WHERE COALESCE(NULLIF("kakaoId", ''), "clientId") IS NOT NULL
ORDER BY COALESCE(NULLIF("kakaoId", ''), "clientId"), "updatedAt" DESC
ON CONFLICT DO NOTHING;

-- Restore UserProfile to its original chat-focused shape
DROP INDEX IF EXISTS "UserProfile_kakaoId_key";
DROP INDEX IF EXISTS "UserProfile_kakaoId_idx";
DROP INDEX IF EXISTS "UserProfile_email_idx";
DROP INDEX IF EXISTS "UserProfile_phone_idx";

ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "email";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "kakaoEmail";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "kakaoId";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "nickname";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "phoneLinkedAt";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "profileImageUrl";

UPDATE "UserProfile" SET data = '{}' WHERE data IS NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "data" SET NOT NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;
