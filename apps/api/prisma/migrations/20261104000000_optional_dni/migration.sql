ALTER TABLE "people" ALTER COLUMN "dni" DROP NOT NULL;
UPDATE "people" SET "dni" = NULL WHERE btrim("dni") = '';
