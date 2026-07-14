UPDATE "TipsLabSession" SET "consentScopes" = ARRAY[]::TEXT[] WHERE "consentScopes" IS NULL;
ALTER TABLE "TipsLabSession" ALTER COLUMN "consentScopes" SET NOT NULL;
