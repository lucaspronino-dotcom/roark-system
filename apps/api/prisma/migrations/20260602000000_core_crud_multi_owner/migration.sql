CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "owners"
ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN "transferAliasOrCbu" TEXT;

ALTER TABLE "properties"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Vivienda',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'En alquiler 24M',
ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Olavarria';

CREATE TABLE "property_owners" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "participation" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "administration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_owners_pkey" PRIMARY KEY ("id")
);

INSERT INTO "property_owners" (
    "id",
    "propertyId",
    "ownerId",
    "isPrimary",
    "participation",
    "administration",
    "commission",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "ownerId",
    true,
    100,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "properties";

CREATE UNIQUE INDEX "property_owners_propertyId_ownerId_key" ON "property_owners"("propertyId", "ownerId");

ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "properties" DROP CONSTRAINT "properties_ownerId_fkey";

ALTER TABLE "properties" DROP COLUMN "ownerId";

ALTER TABLE "contracts" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
