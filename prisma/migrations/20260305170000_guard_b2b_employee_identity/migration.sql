-- Remove malformed employee rows before adding strict identity constraints.
DELETE FROM "B2bEmployee"
WHERE char_length(btrim("name")) = 0
   OR "birthDate" !~ '^[0-9]{8}$'
   OR "phoneNormalized" !~ '^[0-9]{10,11}$'
   OR "identityHash" !~ '^[0-9a-f]{64}$'
   OR ("appUserId" IS NOT NULL AND char_length(btrim("appUserId")) = 0);

ALTER TABLE "B2bEmployee"
ADD CONSTRAINT "B2bEmployee_name_not_blank_chk"
CHECK (char_length(btrim("name")) > 0);

ALTER TABLE "B2bEmployee"
ADD CONSTRAINT "B2bEmployee_birthDate_digits_chk"
CHECK ("birthDate" ~ '^[0-9]{8}$');

ALTER TABLE "B2bEmployee"
ADD CONSTRAINT "B2bEmployee_phoneNormalized_digits_chk"
CHECK ("phoneNormalized" ~ '^[0-9]{10,11}$');

ALTER TABLE "B2bEmployee"
ADD CONSTRAINT "B2bEmployee_identityHash_hex64_chk"
CHECK ("identityHash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "B2bEmployee"
ADD CONSTRAINT "B2bEmployee_appUserId_not_blank_chk"
CHECK ("appUserId" IS NULL OR char_length(btrim("appUserId")) > 0);
